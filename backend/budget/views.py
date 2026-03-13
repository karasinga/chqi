from rest_framework import viewsets
from .models import BudgetCategory, Expense, MonthlyBudget
from .serializers import BudgetCategorySerializer, ExpenseSerializer, MonthlyBudgetSerializer

class MonthlyBudgetViewSet(viewsets.ModelViewSet):
    queryset = MonthlyBudget.objects.all()
    serializer_class = MonthlyBudgetSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        if project_id:
            return self.queryset.filter(project_id=project_id)
        return self.queryset

class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all()
    serializer_class = BudgetCategorySerializer

    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        if project_id:
            return self.queryset.filter(project_id=project_id)
        return self.queryset

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        if project_id:
            return self.queryset.filter(project_id=project_id)
        return self.queryset
