from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Administrator'),
        ('pi', 'Principal Investigator'),
        ('coordinator', 'Study Coordinator'),
        ('stakeholder', 'Stakeholder'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='stakeholder')
    last_active = models.DateTimeField(null=True, blank=True)
