from rest_framework import serializers
from .models import Task, TaskComment, ActivityLog, Dependency


class TaskCommentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'user', 'username', 'content', 'created_at']
        read_only_fields = ['user']


class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'username', 'action', 'target_type',
                  'target_id', 'target_name', 'timestamp']


class DependencySerializer(serializers.ModelSerializer):
    predecessor_name = serializers.ReadOnlyField(source='predecessor_task.name')
    successor_name = serializers.ReadOnlyField(source='successor_task.name')

    class Meta:
        model = Dependency
        fields = [
            'id', 'project',
            'predecessor_task', 'predecessor_name',
            'successor_task', 'successor_name',
            'type', 'lag',
        ]


# ──────────────────────────────────────────────────────────────────────────────
# Inline dependency serializer for writing via the Task endpoint.
# Format: [{"predecessor_id": 5, "type": "FS", "lag": 0}, ...]
# ──────────────────────────────────────────────────────────────────────────────
class InlineDependencyInputSerializer(serializers.Serializer):
    predecessor_id = serializers.IntegerField()
    type = serializers.ChoiceField(choices=['FS', 'SS', 'FF', 'SF'], default='FS')
    lag = serializers.IntegerField(default=0)


class TaskSerializer(serializers.ModelSerializer):
    # ── Read-only computed / relation fields ──────────────────────
    assignee_name = serializers.ReadOnlyField(source='assignee.username')
    project_name = serializers.ReadOnlyField(source='project.name')
    comments = TaskCommentSerializer(many=True, read_only=True)
    comment_count = serializers.IntegerField(read_only=True, default=0)

    # ── Predecessor deps (typed, with lag) ────────────────────────
    # Read: structured list returned in API responses
    predecessor_deps = DependencySerializer(many=True, read_only=True)

    # Write: accept a list of {predecessor_id, type, lag} to set dependencies
    task_dependencies = InlineDependencyInputSerializer(
        many=True, required=False, write_only=True)

    # ── CPM calculated fields (read-only) ─────────────────────────
    # Also expose old-style 'es', 'ef', 'ls', 'lf', 'slack' aliases
    # so the existing ProjectDetails.jsx frontend keeps working unchanged.
    es = serializers.DateField(source='early_start', read_only=True)
    ef = serializers.DateField(source='early_finish', read_only=True)
    ls = serializers.DateField(source='late_start', read_only=True)
    lf = serializers.DateField(source='late_finish', read_only=True)
    slack = serializers.IntegerField(source='total_float', read_only=True)

    class Meta:
        model = Task
        fields = [
            # Identifiers
            'id', 'project', 'project_name', 'wbs_code',
            # Hierarchy
            'parent_task', 'sort_order',
            # Core
            'name', 'description', 'task_type', 'duration',
            'start_date',  # kept for backward compat (auto-set by engine)
            # Constraints
            'constraint_type', 'constraint_date',
            # Status / meta
            'status', 'priority', 'notes',
            'assignee', 'assignee_name',
            # Legacy many-to-many (kept for backward compat)
            'dependencies',
            # New typed deps (read)
            'predecessor_deps',
            # New typed deps (write)
            'task_dependencies',
            # CPM calculated
            'early_start', 'early_finish', 'late_start', 'late_finish',
            'total_float', 'free_float', 'is_critical',
            # Aliases for backward compat
            'es', 'ef', 'ls', 'lf', 'slack',
            # Comments
            'comments', 'comment_count',
        ]
        read_only_fields = [
            'early_start', 'early_finish', 'late_start', 'late_finish',
            'total_float', 'free_float', 'is_critical',
            'es', 'ef', 'ls', 'lf', 'slack',
            'start_date',  # engine-managed; remove from writeable surface
        ]

    def create(self, validated_data):
        task_deps_data = validated_data.pop('task_dependencies', [])
        # Legacy many-to-many dependencies may come in as list of IDs
        legacy_deps = validated_data.pop('dependencies', [])
        task = super().create(validated_data)
        if legacy_deps:
            task.dependencies.set(legacy_deps)
        self._save_typed_deps(task, task_deps_data)

        # Auto-generate WBS code if the user didn't supply one
        if not task.wbs_code:
            task.wbs_code = self._auto_wbs_code(task)
            task.save(update_fields=['wbs_code'])

        return task

    def update(self, instance, validated_data):
        task_deps_data = validated_data.pop('task_dependencies', None)
        legacy_deps = validated_data.pop('dependencies', None)
        task = super().update(instance, validated_data)
        if legacy_deps is not None:
            task.dependencies.set(legacy_deps)
        # Always sync typed deps when the key was present in the request,
        # even if the list is empty (i.e. the user deleted all dependencies).
        if task_deps_data is not None:
            self._save_typed_deps(task, task_deps_data)
        return task

    def _save_typed_deps(self, task, deps_data):
        """
        Atomically replace all Dependency rows where this task is the successor.
        Always deletes existing rows first so that removals and updates both work.
        deps_data may be an empty list (all deps deleted) or a list of new deps.
        """
        # Always wipe existing predecessor deps for this task first
        Dependency.objects.filter(successor_task=task).delete()

        if not deps_data:
            # Nothing to recreate — all dependencies were removed
            return

        create_list = []
        for d in deps_data:
            pred_id = d['predecessor_id']
            if pred_id == task.id:
                continue  # skip self-reference
            create_list.append(Dependency(
                project_id=task.project_id,
                predecessor_task_id=pred_id,
                successor_task=task,
                type=d.get('type', 'FS'),
                lag=d.get('lag', 0),
            ))
        if create_list:
            Dependency.objects.bulk_create(create_list, ignore_conflicts=True)

    def _auto_wbs_code(self, task):
        """
        Server-side WBS code generation — mirrors the frontend suggestWbsCode() logic.

        Rules:
          - Top-level task (no parent): WBS = max existing top-level integer + 1
          - Child task: WBS = parentWbs + '.' + (max sibling sub-index + 1)

        Excludes the task itself from the sibling scan (already saved but code is empty).
        """
        from pm.models import Task as TaskModel  # local import to avoid circular

        project_tasks = TaskModel.objects.filter(
            project_id=task.project_id
        ).exclude(pk=task.pk)

        if not task.parent_task_id:
            # ── Top-level ──
            max_num = 0
            for t in project_tasks.filter(parent_task__isnull=True):
                code = (t.wbs_code or '').split('.')[0]
                try:
                    max_num = max(max_num, int(code))
                except ValueError:
                    pass
            return str(max_num + 1)

        # ── Child task ──
        parent = project_tasks.filter(pk=task.parent_task_id).first()
        parent_wbs = (parent.wbs_code or '') if parent else ''
        prefix = parent_wbs + '.' if parent_wbs else ''

        max_idx = 0
        for t in project_tasks.filter(parent_task_id=task.parent_task_id):
            code = t.wbs_code or ''
            if prefix and not code.startswith(prefix):
                continue
            rest = code[len(prefix):] if prefix else code
            try:
                max_idx = max(max_idx, int(rest.split('.')[0]))
            except ValueError:
                pass

        return f'{parent_wbs}.{max_idx + 1}' if parent_wbs else str(max_idx + 1)
