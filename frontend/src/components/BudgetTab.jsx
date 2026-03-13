import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import {
    Box, Card, CardContent, Typography, Grid, Button, IconButton,
    Paper, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Divider, Stack, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, MenuItem, Select, FormControl,
    InputLabel, LinearProgress, Tooltip, Avatar,
    InputAdornment, useTheme, alpha, List, ListItem, ListItemText, ListItemSecondaryAction,
    ListItemButton, Autocomplete, createFilterOptions
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    AttachMoney as MoneyIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    AccountBalance as BudgetIcon,
    Receipt as ReceiptIcon,
    FilterList as FilterIcon,
    Search as SearchIcon,
    Download as DownloadIcon,
    PieChart as PieChartIcon,
    ShowChart as LineChartIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Settings as SettingsIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    CalendarMonth as CalendarIcon,
    AutoGraph as AutoGraphIcon
} from '@mui/icons-material';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    ComposedChart, Bar, Line, ReferenceLine
} from 'recharts';
import DeleteConfirmationModal from './DeleteConfirmationModal';

// --- Helper for Date Range ---
const getMonthsInRange = (startDate, endDate) => {
    const start = startDate ? new Date(startDate) : new Date('2025-01-01');
    const end = endDate ? new Date(endDate) : new Date('2025-12-31');

    const dates = [];
    const date = new Date(start);
    // Set to 1st of month to avoid overflow issues
    date.setDate(1);

    while (date <= end) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthName = date.toLocaleString('default', { month: 'short' });
        const shortYear = String(year).slice(-2);

        dates.push({
            key: `${year}-${month}`,
            label: `${monthName} ${shortYear}`
        });

        date.setMonth(date.getMonth() + 1);
    }
    return dates;
};

const filter = createFilterOptions();

const BudgetTab = ({ projectId: rawProjectId, startDate, endDate }) => {
    const queryClient = useQueryClient();
    const theme = useTheme();
    // Ensure projectId is a string to match useParams source
    const projectId = String(rawProjectId);

    // --- Queries ---
    const { data: projectData } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => api.get(`/projects/${projectId}/`)
    });

    const { data: expenses = [] } = useQuery({
        queryKey: ['expenses', projectId],
        queryFn: () => api.get(`/budget/expenses/?project=${projectId}`)
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['budget-categories', projectId],
        queryFn: () => api.get(`/budget/categories/?project=${projectId}`)
    });

    const { data: monthlyBudgets = [] } = useQuery({
        queryKey: ['monthly-budgets', projectId],
        queryFn: () => api.get(`/budget/monthly-budgets/?project=${projectId}`)
    });

    // --- Derived State ---
    const budgetLimit = projectData?.total_budget ? parseFloat(projectData.total_budget) : 0;

    const monthlyPlan = useMemo(() => {
        const plan = {};
        monthlyBudgets.forEach(mb => {
            plan[mb.month] = parseFloat(mb.amount);
        });
        return plan;
    }, [monthlyBudgets]);

    // Dynamic Timeline
    const timeline = useMemo(() => getMonthsInRange(startDate, endDate), [startDate, endDate]);
    const monthKeys = timeline.map(t => t.key);

    // --- Mutations ---
    const updateBudgetMutation = useMutation({
        mutationFn: (newAmount) => api.patch(`/projects/${parseInt(projectId)}/`, { total_budget: parseFloat(newAmount) }),
        onSuccess: async () => {
            // Wait for data to refresh before closing dialog
            await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            await queryClient.refetchQueries({ queryKey: ['project', projectId] });
            setOpenBudgetDialog(false);
            setTempBudget(0);
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.total_budget?.[0]
                || error.response?.data?.detail
                || error.message
                || 'Failed to update budget';
            alert(`Error: ${errorMsg}`);
        }
    });

    const addExpenseMutation = useMutation({
        mutationFn: (data) => api.post('/budget/expenses/', { ...data, project: parseInt(projectId), category: parseInt(data.category) }),
        onSuccess: async () => {
            console.log('Expense added successfully, refreshing data...');
            // Invalidate with the same key used for fetching
            await queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
            await queryClient.refetchQueries({ queryKey: ['expenses', projectId] });

            // Force a slight delay to ensure the backend DB has settled
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            }, 500);

            setOpenExpenseDialog(false);
            setFormData({
                category: categories.length > 0 ? categories[0].id : '',
                description: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                status: 'pending'
            });
            setEditingExpenseId(null);
        },
        onError: (error) => {
            console.error('Add Expense Error:', error.response?.data || error.message);
            const errorData = error.response?.data;
            const errorMsg = (errorData && typeof errorData === 'object')
                ? Object.entries(errorData).map(([k, v]) => `${k}: ${v}`).join(', ')
                : error.message || 'Failed to create expense';
            alert(`Error: ${errorMsg}`);
        }
    });

    const updateExpenseMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/budget/expenses/${id}/`, { ...data, project: parseInt(projectId), category: parseInt(data.category) }),
        onSuccess: async () => {
            // Wait for data to refresh before closing dialog
            await queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
            await queryClient.refetchQueries({ queryKey: ['expenses', projectId] });
            setOpenExpenseDialog(false);
            // Reset form
            setFormData({
                category: categories.length > 0 ? categories[0].id : '',
                description: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                status: 'pending'
            });
            setEditingExpenseId(null);
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.detail
                || error.response?.data?.non_field_errors?.[0]
                || error.message
                || 'Failed to update expense';
            alert(`Error: ${errorMsg}`);
        }
    });

    const deleteExpenseMutation = useMutation({
        mutationFn: (id) => api.delete(`/budget/expenses/${id}/`),
        onSuccess: async () => {
            console.log('Expense deleted successfully, refreshing...');
            // Wait for data to refresh
            await queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
            await queryClient.refetchQueries({ queryKey: ['expenses', projectId] });
            setDeleteModalOpen(false);
            setItemToDelete(null);
            setDeleteType(null);
        },
        onError: (error) => {
            console.error('Delete Expense Error:', error.response?.data || error.message);
            alert(`Failed to delete expense: ${error.message}`);
        }
    });

    const addCategoryMutation = useMutation({
        mutationFn: (name) => {
            const trimmedName = name.trim();
            if (!trimmedName) {
                throw new Error('Category name cannot be empty');
            }
            // Check for duplicates on frontend
            if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
                throw new Error('A category with this name already exists');
            }
            return api.post('/budget/categories/', { name: trimmedName, project: parseInt(projectId) });
        },
        onSuccess: async () => {
            console.log('Category added successfully, refreshing...');
            await queryClient.invalidateQueries({ queryKey: ['budget-categories', projectId] });
            await queryClient.refetchQueries({ queryKey: ['budget-categories', projectId] });
            setNewCategoryName('');

            // Also refresh overall project to update consumption percentages
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        },
        onError: (error) => {
            console.error('Add Category Error:', error.response?.data || error.message);
            const errorData = error.response?.data;
            const errorMsg = (errorData && typeof errorData === 'object')
                ? Object.entries(errorData).map(([k, v]) => `${k}: ${v}`).join(', ')
                : error.message || 'Failed to create category';
            alert(`Error: ${errorMsg}`);
        }
    });

    const updateCategoryMutation = useMutation({
        mutationFn: ({ id, name }) => {
            const trimmedName = name.trim();
            if (!trimmedName) {
                throw new Error('Category name cannot be empty');
            }
            // Check for duplicates (excluding current category)
            if (categories.some(c => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase())) {
                throw new Error('A category with this name already exists');
            }
            return api.patch(`/budget/categories/${id}/`, { name: trimmedName });
        },
        onSuccess: async () => {
            // Wait for data to refresh before resetting state
            await queryClient.invalidateQueries({ queryKey: ['budget-categories', projectId] });
            await queryClient.refetchQueries({ queryKey: ['budget-categories', projectId] });
            // Also invalidate expenses as category names might be denormalized
            await queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
            await queryClient.refetchQueries({ queryKey: ['expenses', projectId] });
            setEditingCategoryName(null);
            setEditingCategoryId(null);
            setTempCategoryName('');
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.name?.[0]
                || error.response?.data?.detail
                || error.message
                || 'Failed to update category';
            alert(`Error: ${errorMsg}`);
            // Reset editing state on error
            setEditingCategoryName(null);
            setEditingCategoryId(null);
            setTempCategoryName('');
        }
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: (id) => api.delete(`/budget/categories/${id}/`),
        onSuccess: async () => {
            console.log('Category deleted successfully, refreshing...');
            // Wait for data to refresh
            await queryClient.invalidateQueries({ queryKey: ['budget-categories', projectId] });
            await queryClient.refetchQueries({ queryKey: ['budget-categories', projectId] });
            setDeleteModalOpen(false);
            setItemToDelete(null);
            setDeleteType(null);
        },
        onError: (err) => {
            console.error('Delete Category Error:', err.response?.data || err.message);
            alert("Could not delete category. It may have associated expenses or other constraints.");
        }
    });

    const saveMonthlyPlanMutation = useMutation({
        mutationFn: async (plan) => {
            console.log('Sending monthly plan:', plan);
            const promises = Object.entries(plan).map(async ([month, amount]) => {
                const numericAmount = parseFloat(amount) || 0;
                const existing = monthlyBudgets.find(mb => mb.month === month);

                try {
                    if (existing) {
                        if (parseFloat(existing.amount) !== numericAmount) {
                            return await api.patch(`/budget/monthly-budgets/${existing.id}/`, {
                                amount: numericAmount
                            });
                        }
                    } else if (numericAmount > 0) {
                        return await api.post('/budget/monthly-budgets/', {
                            project: parseInt(projectId),
                            month,
                            amount: numericAmount
                        });
                    }
                    return Promise.resolve();
                } catch (err) {
                    console.error(`Error saving month ${month}:`, err);
                    throw err;
                }
            });

            const results = await Promise.allSettled(promises);

            // Check for any failures
            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0) {
                console.error('Monthly budget save failures:', failures);
                throw failures[0].reason;
            }
        },
        onSuccess: async () => {
            // Wait for data to refresh before closing dialog
            await queryClient.invalidateQueries({ queryKey: ['monthly-budgets', projectId] });
            await queryClient.refetchQueries({ queryKey: ['monthly-budgets', projectId] });
            setOpenPlanDialog(false);
            setTempMonthlyPlan({});
        },
        onError: (error) => {
            console.error('Save Plan Error:', error.response?.data || error.message);
            const errorData = error.response?.data;
            const errorMsg = (errorData && typeof errorData === 'object')
                ? Object.entries(errorData).map(([k, v]) => `${k}: ${v}`).join(', ')
                : error.message || 'Failed to save budget plan';
            alert(`Error saving plan: ${errorMsg}`);
        }
    });

    // --- UI State ---
    const [filterCategory, setFilterCategory] = useState({ id: 'All', name: 'All Categories' });
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterMonth, setFilterMonth] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
    const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
    const [openBudgetDialog, setOpenBudgetDialog] = useState(false);
    const [openPlanDialog, setOpenPlanDialog] = useState(false);

    // Delete Confirmation State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteType, setDeleteType] = useState(null); // 'expense' or 'category'

    // Editing State
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [tempBudget, setTempBudget] = useState(0);
    const [editingCategoryName, setEditingCategoryName] = useState(null); // This holds the NAME of the category being edited
    const [editingCategoryId, setEditingCategoryId] = useState(null); // This holds the ID
    const [tempCategoryName, setTempCategoryName] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [tempMonthlyPlan, setTempMonthlyPlan] = useState({});

    // Form Data
    const [formData, setFormData] = useState({
        category: '', // This will be the ID
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
    });

    // --- Calculations ---
    const totalSpent = expenses ? expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0) : 0;
    const balance = budgetLimit - totalSpent;
    const utilizationRate = budgetLimit > 0 ? Math.round((totalSpent / budgetLimit) * 100) : 0;

    const filteredExpenses = expenses.filter(e => {
        const matchesCategory = filterCategory.id === 'All' || e.category === filterCategory.id;
        const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
        const matchesMonth = filterMonth === 'All' || e.date.startsWith(filterMonth);
        const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesStatus && matchesMonth && matchesSearch;
    });

    const categoryData = categories.map(cat => {
        const value = expenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + parseFloat(e.amount), 0);
        return { name: cat.name, value };
    }).filter(d => d.value > 0);

    // Dialog Calculations
    const totalPlanned = useMemo(() => {
        return Object.values(tempMonthlyPlan).reduce((a, b) => a + (b || 0), 0);
    }, [tempMonthlyPlan]);

    const remainingToAllocate = budgetLimit - totalPlanned;

    // --- Dynamic Chart Calculation ---
    const spendingTrend = useMemo(() => {
        let runningActual = 0;
        let runningPlanned = 0;
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        let lastActualValue = 0;
        let lastActualIndex = -1;

        const data = timeline.map(({ key, label }, index) => {
            // Monthly Actuals
            const monthlyExpenses = expenses.filter(e => e.date.startsWith(key))
                .reduce((sum, e) => sum + parseFloat(e.amount), 0);

            // Monthly Planned
            const monthlyPlannedBudget = monthlyPlan[key] || 0;
            runningPlanned += monthlyPlannedBudget;

            const isFuture = key > currentMonthKey;

            if (!isFuture) {
                runningActual += monthlyExpenses;
                lastActualValue = runningActual;
                lastActualIndex = index;
            }

            return {
                month: label,
                key,
                monthlyActual: monthlyExpenses,
                planned: runningPlanned,
                actual: isFuture ? null : runningActual,
                forecast: null // Fill in next pass
            };
        });

        // Add Forecast (Simple linear projection or just connecting last actual to target)
        // For now, let's just make it a projection from the last actual
        if (lastActualIndex !== -1) {
            data[lastActualIndex].forecast = lastActualValue;
            for (let i = lastActualIndex + 1; i < data.length; i++) {
                // Example: Forecast = last actual + remaining planned budget distributed (simplified)
                // Just to show a "spread", let's trend it towards the final planned budget
                const remainingSteps = data.length - 1 - lastActualIndex;
                const distance = data[data.length - 1].planned - lastActualValue;
                data[i].forecast = lastActualValue + (distance * (i - lastActualIndex) / remainingSteps);
            }
        }

        return data;
    }, [expenses, budgetLimit, monthlyPlan, timeline]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

    // --- Handlers ---
    const handleOpenAddExpense = () => {
        setEditingExpenseId(null);
        setFormData({
            category: categories.length > 0 ? categories[0].id : '',
            description: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            status: 'pending'
        });
        setOpenExpenseDialog(true);
    };

    const handleOpenEditExpense = (expense) => {
        setEditingExpenseId(expense.id);
        setFormData({
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            date: expense.date,
            status: expense.status
        });
        setOpenExpenseDialog(true);
    };

    const handleSaveExpense = async () => {
        let categoryId = formData.category;

        // Handle new category creation
        if (typeof categoryId === 'string' && categoryId.startsWith('new-')) {
            const newName = categoryId.replace('new-', '');
            try {
                // We use mutateAsync to wait for the category to be created
                const newCat = await addCategoryMutation.mutateAsync(newName);
                categoryId = newCat.id;
            } catch (err) {
                // Error already handled in mutation
                return;
            }
        }

        const data = {
            ...formData,
            category: categoryId,
            amount: parseFloat(formData.amount)
        };

        if (editingExpenseId) {
            updateExpenseMutation.mutate({ id: editingExpenseId, data });
        } else {
            addExpenseMutation.mutate(data);
        }
    };

    // Standard Delete Handler
    const initiateDelete = (type, item) => {
        setDeleteType(type);
        setItemToDelete(item);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!itemToDelete) return;

        if (deleteType === 'expense') {
            deleteExpenseMutation.mutate(itemToDelete.id);
        } else if (deleteType === 'category') {
            deleteCategoryMutation.mutate(itemToDelete.id);
        }
        // State cleanup is now handled in mutation onSuccess callbacks
    };

    const handleSaveBudget = () => {
        updateBudgetMutation.mutate(parseFloat(tempBudget));
    };

    // Category Handlers
    const handleAddCategory = () => {
        if (!newCategoryName.trim()) {
            alert('Please enter a category name');
            return;
        }
        if (categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
            alert('A category with this name already exists');
            return;
        }
        addCategoryMutation.mutate(newCategoryName);
    };
    const handleStartRenameCategory = (cat) => {
        setEditingCategoryName(cat.name);
        setEditingCategoryId(cat.id);
        setTempCategoryName(cat.name);
    };
    const handleCancelRename = () => { setEditingCategoryName(null); setEditingCategoryId(null); setTempCategoryName(''); };
    const handleSaveRenameCategory = () => {
        if (tempCategoryName && editingCategoryId) {
            updateCategoryMutation.mutate({ id: editingCategoryId, name: tempCategoryName });
        }
    };
    const handleDeleteCategoryCheck = (cat) => {
        // Can also check expenses on frontend, but backend handles PROTECT
        if (expenses.some(e => e.category === cat.id)) {
            alert('Cannot delete category in use. Please reassign associated expenses first.');
            return;
        }
        initiateDelete('category', cat);
    };

    // Plan Handlers
    const handleOpenPlanDialog = () => {
        setTempMonthlyPlan({ ...monthlyPlan });
        setOpenPlanDialog(true);
    };
    const handleSavePlan = () => {
        saveMonthlyPlanMutation.mutate(tempMonthlyPlan);
    };
    const handlePlanChange = (key, val) => {
        setTempMonthlyPlan({ ...tempMonthlyPlan, [key]: parseFloat(val) || 0 });
    };

    const handleAutoDistribute = () => {
        const count = timeline.length;
        if (count === 0) return;

        const monthlyAmount = Math.floor(budgetLimit / count);
        const remainder = budgetLimit % count;

        const newPlan = {};
        timeline.forEach((t, i) => {
            newPlan[t.key] = i === count - 1 ? monthlyAmount + remainder : monthlyAmount;
        });

        setTempMonthlyPlan(newPlan);
    };

    // --- Components ---
    const StatCard = ({ title, value, subtext, icon, gradient, onEdit }) => (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                height: '100%',
                borderRadius: 4,
                background: gradient,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }
            }}
        >
            <Box sx={{ position: 'relative', zIndex: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.9 }}>
                        {icon}
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {title}
                        </Typography>
                    </Box>
                    {onEdit && (
                        <IconButton size="small" onClick={onEdit} sx={{ color: 'white', opacity: 0.7, '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.2)' } }}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5, letterSpacing: -1 }}>
                    {value}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 500 }}>
                    {subtext}
                </Typography>
            </Box>
            <Box sx={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1, transform: 'rotate(-20deg) scale(2.5)', zIndex: 1 }}>
                {icon}
            </Box>
        </Paper>
    );

    return (
        <Box sx={{ animation: 'fadeIn 0.5s ease-in-out' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a237e', mb: 1 }}>
                        Costed Workplan Tracking
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Monitor project budget, track expenses, and forecast costs.
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'primary.main', fontWeight: 600 }}>
                        Project Timeline: {timeline.length > 0 ? `${timeline[0].label} - ${timeline[timeline.length - 1].label}` : 'Not Set'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<CalendarIcon />}
                        onClick={handleOpenPlanDialog}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        Budget Schedule
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<SettingsIcon />}
                        onClick={() => setOpenCategoryDialog(true)}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        Categories
                    </Button>
                    <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ borderRadius: 2, fontWeight: 700 }}>
                        Export
                    </Button>
                </Box>
            </Box>

            {/* Top Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Budget"
                        value={`$${budgetLimit.toLocaleString()}`}
                        subtext="Approved Funding"
                        icon={<BudgetIcon />}
                        gradient="linear-gradient(135deg, #2196F3 0%, #1976d2 100%)"
                        onEdit={() => { setTempBudget(budgetLimit); setOpenBudgetDialog(true); }}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Actual Cost (AC)"
                        value={`$${totalSpent.toLocaleString()}`}
                        subtext={`${utilizationRate}% utilized`}
                        icon={<ReceiptIcon />}
                        gradient="linear-gradient(135deg, #FF9800 0%, #F57C00 100%)"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Remaining Funds"
                        value={`$${balance.toLocaleString()}`}
                        subtext="Available Balance"
                        icon={<MoneyIcon />}
                        gradient={balance < 0
                            ? "linear-gradient(135deg, #f44336 0%, #c62828 100%)"
                            : "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)"}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Cost Variance"
                        value={`${balance >= 0 ? '+' : ''}${(balance / budgetLimit * 100).toFixed(1)}%`}
                        subtext={balance >= 0 ? "Under Budget" : "Over Budget"}
                        icon={<TrendingUpIcon />}
                        gradient="linear-gradient(135deg, #607D8B 0%, #455A64 100%)"
                    />
                </Grid>
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                    <Card elevation={0} sx={{ height: 400, borderRadius: 4, border: '1px solid #eee' }}>
                        <CardContent sx={{ height: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>Cost Performance (Planned vs Actual)</Typography>
                                <Chip label="Cumulative" size="small" sx={{ fontWeight: 600, bgcolor: '#f5f5f5' }} />
                            </Box>
                            <ResponsiveContainer width="100%" height="90%">
                                <ComposedChart data={spendingTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9e9e9e', fontSize: 10 }}
                                        interval={timeline.length > 12 ? Math.floor(timeline.length / 6) : 0}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9e9e9e', fontSize: 10 }} tickFormatter={(val) => `$${val / 1000}k`} />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                        formatter={(value, name) => [`$${Math.round(value).toLocaleString()}`, name]}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 10 }} />

                                    {/* Monthly Spending Bars */}
                                    <Bar dataKey="monthlyActual" name="Monthly Spend" fill="#4dabf5" radius={[4, 4, 0, 0]} barSize={20} />

                                    {/* Planned Line */}
                                    <Area type="monotone" dataKey="planned" name="Planned Value (PV)" stroke="#8884d8" fillOpacity={1} fill="url(#colorPlanned)" strokeWidth={2} />

                                    {/* Actual cumulative Line */}
                                    <Line type="monotone" dataKey="actual" name="Actual Cost (AC)" stroke="#4caf50" strokeWidth={4} dot={{ r: 4, fill: '#4caf50' }} activeDot={{ r: 6 }} />

                                    {/* Forecast Prediction */}
                                    <Line type="monotone" dataKey="forecast" name="Forecast Prediction" stroke="#ff9800" strokeWidth={2} strokeDasharray="5 5" dot={false} />

                                    {/* Reference Line for "Today" */}
                                    {(() => {
                                        const now = new Date();
                                        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                        const todayData = spendingTrend.find(d => d.key === todayKey);
                                        if (todayData) {
                                            return <ReferenceLine x={todayData.month} stroke="#ef5350" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fill: '#ef5350', fontSize: 10, fontWeight: 700 }} />;
                                        }
                                        return null;
                                    })()}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ height: 400, borderRadius: 4, border: '1px solid #eee' }}>
                        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Spending by Category</Typography>
                            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(val) => `$${val.toLocaleString()}`} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Expenses List */}
            <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #eee', overflow: 'hidden' }}>
                <Box sx={{ p: 3, borderBottom: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>Expense Ledger</Typography>
                        <Chip label={`${expenses.length} Records`} size="small" sx={{ fontWeight: 600, bgcolor: '#e3f2fd', color: '#1976d2' }} />
                    </Box>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            size="small"
                            placeholder="Search expenses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon color="action" fontSize="small" /></InputAdornment>,
                                sx: { borderRadius: 2, bgcolor: '#f8f9fa' }
                            }}
                        />
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                                value={filterCategory.id}
                                onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const selectedCat = selectedId === 'All'
                                        ? { id: 'All', name: 'All Categories' }
                                        : categories.find(c => c.id === selectedId);
                                    setFilterCategory(selectedCat);
                                }}
                                displayEmpty
                                sx={{ borderRadius: 2, bgcolor: '#f8f9fa' }}
                            >
                                <MenuItem value="All">All Categories</MenuItem>
                                {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                displayEmpty
                                sx={{ borderRadius: 2, bgcolor: '#f8f9fa' }}
                            >
                                <MenuItem value="All">All Status</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                displayEmpty
                                sx={{ borderRadius: 2, bgcolor: '#f8f9fa' }}
                            >
                                <MenuItem value="All">All Time</MenuItem>
                                {timeline.map(t => (
                                    <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenAddExpense}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
                        >
                            Add Expense
                        </Button>
                    </Stack>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#fcfcfc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Description</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Amount</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredExpenses.map((expense) => (
                                <TableRow key={expense.id} hover sx={{ '&:hover': { bgcolor: '#f8f9fa' } }}>
                                    <TableCell sx={{ fontWeight: 500 }}>{new Date(expense.date).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={expense.category_name}
                                            size="small"
                                            sx={{
                                                fontWeight: 600,
                                                bgcolor: alpha(COLORS[expense.category % COLORS.length] || '#e0e0e0', 0.1),
                                                color: COLORS[expense.category % COLORS.length] || 'text.primary'
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ color: 'text.secondary' }}>{expense.description}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>${parseFloat(expense.amount).toLocaleString()}</TableCell>
                                    <TableCell align="center">
                                        {expense.status === 'approved' ? (
                                            <Chip icon={<CheckCircleIcon />} label="Approved" size="small" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                                        ) : (
                                            <Chip icon={<WarningIcon />} label="Pending" size="small" color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <IconButton size="small" onClick={() => handleOpenEditExpense(expense)} sx={{ color: 'primary.main' }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => initiateDelete('expense', expense)} sx={{ color: '#ef5350' }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredExpenses.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        No expenses found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Expense Dialog */}
            <Dialog
                open={openExpenseDialog}
                onClose={() => setOpenExpenseDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 4 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>{editingExpenseId ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={3}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Autocomplete
                                    value={categories.find(c => c.id === formData.category) || (typeof formData.category === 'string' && formData.category.startsWith('new-') ? { name: formData.category.replace('new-', ''), id: formData.category } : null)}
                                    onChange={(event, newValue) => {
                                        if (typeof newValue === 'string') {
                                            setFormData({ ...formData, category: `new-${newValue}` });
                                        } else if (newValue && newValue.inputValue) {
                                            // Create a new value from the user input
                                            setFormData({ ...formData, category: `new-${newValue.inputValue}` });
                                        } else {
                                            setFormData({ ...formData, category: newValue?.id || '' });
                                        }
                                    }}
                                    filterOptions={(options, params) => {
                                        const filtered = filter(options, params);
                                        const { inputValue } = params;
                                        // Suggest the creation of a new value
                                        const isExisting = options.some((option) => inputValue === option.name);
                                        if (inputValue !== '' && !isExisting) {
                                            filtered.push({
                                                inputValue,
                                                name: `Add "${inputValue}"`,
                                            });
                                        }
                                        return filtered;
                                    }}
                                    selectOnFocus
                                    clearOnBlur
                                    handleHomeEndKeys
                                    options={categories}
                                    getOptionLabel={(option) => {
                                        // Value selected with enter, right from the input
                                        if (typeof option === 'string') {
                                            return option;
                                        }
                                        // Add "xxx" option created dynamically
                                        if (option.inputValue) {
                                            return option.inputValue;
                                        }
                                        // Regular option
                                        return option.name || '';
                                    }}
                                    renderOption={(props, option) => <li {...props}>{option.name}</li>}
                                    freeSolo
                                    renderInput={(params) => (
                                        <TextField {...params} label="Category" />
                                    )}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Date"
                                    type="date"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            label="Description"
                            fullWidth
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                        <TextField
                            label="Amount"
                            type="number"
                            fullWidth
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formData.status}
                                label="Status"
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button
                        onClick={() => setOpenExpenseDialog(false)}
                        disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveExpense}
                        variant="contained"
                        disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending || !formData.category || !formData.amount}
                    >
                        {addExpenseMutation.isPending || updateExpenseMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Manage Categories Dialog */}
            <Dialog
                open={openCategoryDialog}
                onClose={() => setOpenCategoryDialog(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 4 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Manage Categories</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 3, mt: 1 }}>
                        <TextField
                            label="New Category"
                            fullWidth
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !addCategoryMutation.isPending && handleAddCategory()}
                            disabled={addCategoryMutation.isPending}
                            InputProps={{
                                endAdornment: (
                                    <IconButton
                                        onClick={handleAddCategory}
                                        edge="end"
                                        disabled={addCategoryMutation.isPending || !newCategoryName.trim()}
                                    >
                                        <AddIcon />
                                    </IconButton>
                                )
                            }}
                            size="small"
                        />
                    </Box>
                    <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {categories.map((cat) => (
                            <ListItem key={cat.id}
                                secondaryAction={
                                    editingCategoryName === cat.name ? (
                                        <Box>
                                            <IconButton size="small" onClick={handleSaveRenameCategory} color="success"><CheckCircleIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" onClick={handleCancelRename} color="default"><CancelIcon fontSize="small" /></IconButton>
                                        </Box>
                                    ) : (
                                        <Box>
                                            <IconButton size="small" onClick={() => handleStartRenameCategory(cat)} sx={{ mr: 1 }}><EditIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" onClick={() => handleDeleteCategoryCheck(cat)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                                        </Box>
                                    )
                                }
                            >
                                {editingCategoryName === cat.name ? (
                                    <TextField
                                        size="small"
                                        value={tempCategoryName}
                                        onChange={(e) => setTempCategoryName(e.target.value)}
                                        autoFocus
                                        variant="standard"
                                    />
                                ) : (
                                    <ListItemText primary={cat.name} />
                                )}
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenCategoryDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Budget Dialog */}
            <Dialog
                open={openBudgetDialog}
                onClose={() => setOpenBudgetDialog(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 4 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Update Total Budget</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Total Approved Budget"
                        type="number"
                        fullWidth
                        value={tempBudget}
                        onChange={(e) => setTempBudget(e.target.value)}
                        disabled={updateBudgetMutation.isPending}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => setOpenBudgetDialog(false)}
                        disabled={updateBudgetMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveBudget}
                        variant="contained"
                        disabled={updateBudgetMutation.isPending || !tempBudget}
                    >
                        {updateBudgetMutation.isPending ? 'Updating...' : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Spending Plan Dialog (Dynamic + Auto Distribute) */}
            <Dialog
                open={openPlanDialog}
                onClose={() => setOpenPlanDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 4, height: '80vh' } }}
            >
                <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        Budget Schedule
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
                            Plan your spending over the project lifecycle.
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AutoGraphIcon />}
                        onClick={handleAutoDistribute}
                        disabled={saveMonthlyPlanMutation.isPending}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                        Auto-Distribute
                    </Button>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Grid container spacing={4} sx={{ height: '100%' }}>
                        {/* Left: Stats & Summary */}
                        <Grid item xs={12} md={4}>
                            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: '#f8f9fa' }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700, color: 'text.secondary' }}>PLANNING SUMMARY</Typography>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="body2" color="text.secondary">Total Approved Budget</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 800 }}>${budgetLimit.toLocaleString()}</Typography>
                                </Box>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="body2" color="text.secondary">Total Planned</Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: totalPlanned > budgetLimit ? 'error.main' : 'primary.main' }}>
                                        ${totalPlanned.toLocaleString()}
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min((totalPlanned / budgetLimit) * 100, 100)}
                                        color={totalPlanned > budgetLimit ? 'error' : 'primary'}
                                        sx={{ height: 8, borderRadius: 4, mt: 1 }}
                                    />
                                </Box>

                                <Box>
                                    <Typography variant="body2" color="text.secondary">Remaining to Allocate</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: remainingToAllocate < 0 ? 'error.main' : 'success.main' }}>
                                        ${remainingToAllocate.toLocaleString()}
                                    </Typography>
                                </Box>

                                {remainingToAllocate < 0 && (
                                    <Chip
                                        icon={<WarningIcon />}
                                        label="Over Budget"
                                        color="error"
                                        size="small"
                                        sx={{ mt: 2, width: '100%', fontWeight: 700 }}
                                    />
                                )}
                            </Paper>
                        </Grid>

                        {/* Right: Input Fields */}
                        <Grid item xs={12} md={8} sx={{ height: '100%', overflow: 'auto' }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700, color: 'text.secondary', mb: 2 }}>MONTHLY ALLOCATION</Typography>
                            <Stack spacing={2} sx={{ pr: 1 }}>
                                {timeline.map(({ key, label }) => (
                                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography sx={{ width: 120, fontWeight: 500 }}>{label}</Typography>
                                        <TextField
                                            size="small"
                                            type="number"
                                            fullWidth
                                            value={tempMonthlyPlan[key] !== undefined ? tempMonthlyPlan[key] : (monthlyPlan[key] || 0)}
                                            onChange={(e) => handlePlanChange(key, e.target.value)}
                                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        />
                                    </Box>
                                ))}
                                {timeline.length === 0 && <Typography color="text.secondary">No dates set for this project.</Typography>}
                            </Stack>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid #f0f0f0' }}>
                    <Button
                        onClick={() => setOpenPlanDialog(false)}
                        sx={{ fontWeight: 700, color: 'text.secondary' }}
                        disabled={saveMonthlyPlanMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSavePlan}
                        variant="contained"
                        sx={{ borderRadius: 2, fontWeight: 700, px: 4 }}
                        disabled={saveMonthlyPlanMutation.isPending}
                    >
                        {saveMonthlyPlanMutation.isPending ? 'Saving...' : 'Save Plan'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Global Delete Confirmation Modal */}
            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                itemName={itemToDelete ? (deleteType === 'expense' ? itemToDelete.description : itemToDelete.name) : ''}
                itemType={deleteType === 'expense' ? 'Expense Record' : 'Category'}
                requireNameConfirmation={deleteType === 'category'}
            />

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </Box>
    );
};

export default BudgetTab;
