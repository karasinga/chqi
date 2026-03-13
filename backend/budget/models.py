from django.db import models
from projects.models import Project

class MonthlyBudget(models.Model):
    project = models.ForeignKey(Project, related_name='monthly_budgets', on_delete=models.CASCADE)
    month = models.CharField(max_length=7) # YYYY-MM
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['project', 'month']

    def __str__(self):
        return f"{self.project.name} - {self.month}: {self.amount}"

class BudgetCategory(models.Model):
    project = models.ForeignKey(Project, related_name='budget_categories', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Budget Categories"
        unique_together = ['project', 'name']

    def __str__(self):
        return f"{self.name} ({self.project.name})"

class Expense(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    project = models.ForeignKey(Project, related_name='expenses', on_delete=models.CASCADE)
    category = models.ForeignKey(BudgetCategory, related_name='expenses', on_delete=models.PROTECT) # Prevent deleting category if used
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.description} - ${self.amount}"
