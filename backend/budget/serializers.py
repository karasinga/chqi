from rest_framework import serializers
from .models import BudgetCategory, Expense, MonthlyBudget

class MonthlyBudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyBudget
        fields = ['id', 'project', 'month', 'amount']

class BudgetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetCategory
        fields = ['id', 'project', 'name', 'created_at']

class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Expense
        fields = ['id', 'project', 'category', 'category_name', 'description', 'amount', 'date', 'status', 'created_at', 'updated_at']
