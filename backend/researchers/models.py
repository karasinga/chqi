from django.db import models


class Researcher(models.Model):
    """
    Represents a researcher/team member displayed on the public website.
    Admins can toggle visibility without deleting records.
    """
    name = models.CharField(max_length=200)
    title = models.CharField(max_length=200, help_text="e.g. Principal Investigator")
    specialty = models.CharField(max_length=200, blank=True, help_text="e.g. Health Systems Research")
    bio = models.TextField(blank=True, help_text="Short biography displayed on the public site")
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    photo = models.ImageField(
        upload_to='researchers/',
        blank=True,
        null=True,
        help_text="Profile photo (recommended: square, at least 400x400px)"
    )
    is_visible = models.BooleanField(
        default=True,
        help_text="Toggle to show/hide this researcher on the public website"
    )
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Lower numbers appear first"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = 'Researcher'
        verbose_name_plural = 'Researchers'

    def __str__(self):
        return f"{self.name} — {self.title}"
