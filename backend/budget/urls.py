from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BudgetCategoryViewSet, ExpenseViewSet, MonthlyBudgetViewSet

router = DefaultRouter()
router.register(r'categories', BudgetCategoryViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'monthly-budgets', MonthlyBudgetViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
