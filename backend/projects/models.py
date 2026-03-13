from django.db import models
import os

class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, default='active')
    powerbi_embed_url = models.URLField(blank=True, null=True)
    total_budget = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class FileFolder(models.Model):
    project = models.ForeignKey(Project, related_name='folders', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', null=True, blank=True, related_name='children', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ['project', 'parent', 'name']

    def __str__(self):
        return self.name

    def get_path(self):
        """Get the full path of the folder"""
        if self.parent:
            return f"{self.parent.get_path()}/{self.name}"
        return self.name

    def get_tree(self):
        """Get the folder tree structure"""
        return {
            'id': self.id,
            'name': self.name,
            'children': [child.get_tree() for child in self.children.all()],
            'files': [{'id': f.id, 'name': os.path.basename(f.file.name), 'file_type': f.file_type, 'file_size': f.file_size} for f in self.files.all()]
        }

class ProjectFile(models.Model):
    FILE_TYPE_CHOICES = [
        ('excel', 'Excel'),
        ('csv', 'CSV'),
        ('word', 'Word'),
        ('pdf', 'PDF'),
        ('audio', 'Audio'),
        ('video', 'Video'),
        ('image', 'Image'),
        ('other', 'Other'),
    ]

    project = models.ForeignKey(Project, related_name='files', on_delete=models.CASCADE)
    folder = models.ForeignKey(FileFolder, null=True, blank=True, related_name='files', on_delete=models.CASCADE)
    file = models.FileField(upload_to='project_files/')
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES, default='other')
    file_size = models.BigIntegerField(default=0)  # in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.project.name} - {os.path.basename(self.file.name)}"

    def save(self, *args, **kwargs):
        # Auto-detect file type based on extension
        if self.file:
            ext = os.path.splitext(self.file.name)[1].lower()
            type_mapping = {
                '.xlsx': 'excel', '.xls': 'excel', '.xlsm': 'excel',
                '.csv': 'csv',
                '.doc': 'word', '.docx': 'word',
                '.pdf': 'pdf',
                '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio', '.aac': 'audio',
                '.mp4': 'video', '.avi': 'video', '.mov': 'video', '.mkv': 'video',
                '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.bmp': 'image', '.svg': 'image',
            }
            self.file_type = type_mapping.get(ext, 'other')
            
            # Get file size
            if hasattr(self.file, 'size'):
                self.file_size = self.file.size
        
        super().save(*args, **kwargs)

from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

@receiver(post_delete, sender=ProjectFile)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """
    Deletes file from filesystem
    when corresponding ProjectFile object is deleted.
    """
    if instance.file:
        if os.path.isfile(instance.file.path):
            os.remove(instance.file.path)

@receiver(pre_save, sender=ProjectFile)
def auto_delete_file_on_change(sender, instance, **kwargs):
    """
    Deletes old file from filesystem
    when corresponding ProjectFile object is updated
    with new file.
    """
    if not instance.pk:
        return False

    try:
        old_file = ProjectFile.objects.get(pk=instance.pk).file
    except ProjectFile.DoesNotExist:
        return False

    new_file = instance.file
    if not old_file == new_file:
        if os.path.isfile(old_file.path):
            os.remove(old_file.path)

class Milestone(models.Model):
    STATUS_CHOICES = [
        ('completed', 'Completed'),
        ('review', 'Review'),
        ('in_progress', 'In Progress'),
        ('upcoming', 'Upcoming'),
        ('overdue', 'Overdue'),
    ]

    project = models.ForeignKey(Project, related_name='milestones', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    progress = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return f"{self.project.name} - {self.name}"
