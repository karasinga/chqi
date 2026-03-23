from django.db import models
from projects.models import Project
from django.conf import settings


class Task(models.Model):
    STATUS_CHOICES = [
        ('todo', 'To Do'),
        ('in_progress', 'In Progress'),
        ('review', 'Review'),
        ('completed', 'Completed'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    TASK_TYPE_CHOICES = [
        ('work_package', 'Work Package'),
        ('milestone', 'Milestone'),
        ('summary_task', 'Summary Task'),
    ]
    CONSTRAINT_TYPE_CHOICES = [
        ('as_soon_as_possible', 'As Soon As Possible'),
        ('must_start_on', 'Must Start On'),
        ('start_no_earlier_than', 'Start No Earlier Than'),
        ('start_no_later_than', 'Start No Later Than'),
        ('must_finish_on', 'Must Finish On'),
        ('finish_no_earlier_than', 'Finish No Earlier Than'),
        ('finish_no_later_than', 'Finish No Later Than'),
    ]

    # ── Core Identity ──────────────────────────────────────────────
    project = models.ForeignKey(Project, related_name='tasks', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    wbs_code = models.CharField(max_length=50, blank=True, default='',
        help_text="WBS code, e.g. '1.2.3'")
    task_type = models.CharField(
        max_length=20, choices=TASK_TYPE_CHOICES, default='work_package')

    # ── Hierarchy ──────────────────────────────────────────────────
    parent_task = models.ForeignKey(
        'self', null=True, blank=True,
        related_name='children', on_delete=models.SET_NULL)
    sort_order = models.IntegerField(default=0,
        help_text="Display ordering within same parent level")

    # ── Scheduling Inputs (User-provided) ──────────────────────────
    # start_date is kept for backward-compat but is SET BY THE ENGINE from early_start.
    # Users should not manually edit it; the form hides it.
    start_date = models.DateField(null=True, blank=True,
        help_text="Auto-set by CPM engine from early_start")
    duration = models.IntegerField(default=1,
        help_text="Duration in working days (0 for milestones, auto for summary tasks)")

    # ── Constraints (Advanced) ─────────────────────────────────────
    constraint_type = models.CharField(
        max_length=30, choices=CONSTRAINT_TYPE_CHOICES,
        default='as_soon_as_possible')
    constraint_date = models.DateField(null=True, blank=True)

    # ── Status / Priority ──────────────────────────────────────────
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    notes = models.TextField(blank=True)

    # ── Assignment ─────────────────────────────────────────────────
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_tasks')

    # ── Legacy ManyToMany (kept for migration; new code uses Dependency model) ──
    dependencies = models.ManyToManyField(
        'self', symmetrical=False, blank=True, related_name='dependents')

    # ── CPM Calculated Fields (written by the engine, read-only in forms) ──────
    is_critical = models.BooleanField(default=False)
    early_start = models.DateField(null=True, blank=True)
    early_finish = models.DateField(null=True, blank=True)
    late_start = models.DateField(null=True, blank=True)
    late_finish = models.DateField(null=True, blank=True)
    total_float = models.IntegerField(null=True, blank=True,
        help_text="Total float in working days")
    free_float = models.IntegerField(null=True, blank=True,
        help_text="Free float in working days")

    def __str__(self):
        return self.name


class Dependency(models.Model):
    """
    Typed dependency link between two tasks.
    Replaces the legacy ManyToMany Task.dependencies for new CPM logic.
    """
    TYPE_CHOICES = [
        ('FS', 'Finish-to-Start'),
        ('SS', 'Start-to-Start'),
        ('FF', 'Finish-to-Finish'),
        ('SF', 'Start-to-Finish'),
    ]

    project = models.ForeignKey(
        Project, related_name='dependencies', on_delete=models.CASCADE)
    predecessor_task = models.ForeignKey(
        Task, related_name='successor_deps', on_delete=models.CASCADE)
    successor_task = models.ForeignKey(
        Task, related_name='predecessor_deps', on_delete=models.CASCADE)
    type = models.CharField(max_length=2, choices=TYPE_CHOICES, default='FS')
    lag = models.IntegerField(default=0,
        help_text="Lag in working days (positive=delay, negative=lead)")

    class Meta:
        unique_together = ['predecessor_task', 'successor_task']
        ordering = ['predecessor_task__sort_order']

    def __str__(self):
        return f"{self.predecessor_task.name} →{self.type}({self.lag:+d}d)→ {self.successor_task.name}"


class Resource(models.Model):
    """Phase 2 stub — structure defined now, no API yet."""
    TYPE_CHOICES = [
        ('human', 'Human'),
        ('equipment', 'Equipment'),
        ('material', 'Material'),
    ]
    project = models.ForeignKey(
        Project, related_name='resources', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='human')
    cost_per_hour = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"


class TaskResource(models.Model):
    """Phase 2 stub — junction table for task-resource allocation."""
    task = models.ForeignKey(Task, related_name='resources', on_delete=models.CASCADE)
    resource = models.ForeignKey(Resource, related_name='tasks', on_delete=models.CASCADE)
    allocation_percentage = models.IntegerField(default=100)

    class Meta:
        unique_together = ['task', 'resource']

    def __str__(self):
        return f"{self.resource.name} on {self.task.name} ({self.allocation_percentage}%)"


class TaskComment(models.Model):
    task = models.ForeignKey(Task, related_name='comments', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user.username} on {self.task.name}"


class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
        ('comment', 'Commented'),
        ('assigned', 'Assigned'),
        ('status_change', 'Changed Status'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=50)  # e.g., 'Project', 'Task'
    target_id = models.IntegerField(null=True, blank=True)
    target_name = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} {self.action} {self.target_type} {self.target_name}"
