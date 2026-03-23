import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
    Typography, Box, Tabs, Tab, Button, IconButton, Paper, Grid, Card,
    CardContent, CardHeader, Divider, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup,
    Tooltip, Avatar, Stack, Menu, MenuItem, CircularProgress, alpha,
    useMediaQuery, useTheme
} from '@mui/material';
import {
    Add as AddIcon,
    CalendarMonth as CalendarIcon,
    ViewWeek as WeekIcon, ViewDay as DayIcon,
    CalendarToday as YearIcon, Timer as TimerIcon,
    Warning as WarningIcon, TrendingUp as TrendingUpIcon,
    AccountTree as AccountTreeIcon, ArrowForward as ArrowForwardIcon,
    InfoOutlined as InfoIcon, Download as DownloadIcon,
    Refresh as RefreshIcon, Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import { toBlob } from 'html-to-image';
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import TaskForm from '../components/TaskForm';
import NetworkDiagram from '../components/NetworkDiagram';
import api from '../utils/api';
import FileTree from '../components/FileTree';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import ProjectTasksTab from '../components/ProjectTasksTab';
import TeamTab from '../components/TeamTab';
import MilestonesTab from '../components/MilestonesTab';
import BudgetTab from '../components/BudgetTab';

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS — Single source of truth for the entire component
// Brand palette: #1BACA7 (Teal) / #182F5B (Navy) / #B1AFB2 (Gray)
// ─────────────────────────────────────────────────────────────────
const tokens = {
    color: {
        // Brand primaries
        primary: '#182F5B',
        primaryLight: '#2a4a80',
        primaryDark: '#0f1f3d',
        accent: '#1BACA7',
        accentLight: '#23d4cd',
        accentDark: '#148a86',
        neutral: '#B1AFB2',
        neutralLight: '#d4d3d5',
        neutralLighter: '#f0eff0',
        neutralDark: '#8a888b',

        // Semantic
        critical: '#c62828',
        criticalLight: '#fca5a5',
        criticalBg: '#fef2f2',
        criticalBorder: '#fecaca',
        warning: '#e65100',
        warningBg: '#fff8f0',
        warningBorder: '#ffcc80',
        lateSchedule: '#f59e0b',
        successBg: '#f0faf9',
        successBorder: '#b2dfdb',

        // Surfaces
        background: '#fafbfc',
        surface: '#ffffff',
        surfaceHover: '#f8f9fa',
        text: '#1a1a2e',
        textSecondary: '#64648c',
        textMuted: '#9e9eb8',
    },
    radius: {
        sm: 2,
        md: 4,
        lg: 6,
    },
    weight: {
        normal: 500,
        semibold: 600,
        bold: 700,
    },
    shadow: {
        sm: '0 1px 3px rgba(24,47,91,0.06), 0 1px 2px rgba(24,47,91,0.04)',
        md: '0 4px 12px rgba(24,47,91,0.08), 0 2px 4px rgba(24,47,91,0.04)',
        lg: '0 8px 24px rgba(24,47,91,0.10), 0 4px 8px rgba(24,47,91,0.06)',
    },
    transition: {
        fast: 'all 0.15s ease',
        normal: 'all 0.25s ease',
    },
};

// ─────────────────────────────────────────────────────────────────
// STATIC CONSTANTS — Defined outside component to prevent re-allocation
// ─────────────────────────────────────────────────────────────────
const TAB_LABELS = [
    'Overview',
    'Tasks',
    'Timeline & Analysis',
    'Network Diagram',
    'Team',
    'Milestones',
    'Budget',
    'Analytics',
    'Files',
];

const CPM_COLUMNS = [
    { label: 'Task Name', align: 'left', color: null },
    { label: 'Duration', align: 'center', color: null },
    { label: 'ES', align: 'center', color: tokens.color.accent },
    { label: 'EF', align: 'center', color: tokens.color.accent },
    { label: 'LS', align: 'center', color: tokens.color.lateSchedule },
    { label: 'LF', align: 'center', color: tokens.color.lateSchedule },
    { label: 'Float', align: 'center', color: null },
    { label: 'Status', align: 'center', color: null },
];

const EXPORT_ITEMS = [
    { label: 'Gantt Chart', file: 'gantt-chart', tab: 2, refKey: 'gantt' },
    { label: 'Network Diagram', file: 'network-diagram', tab: 3, refKey: 'network' },
    { label: 'CPM Analysis', file: 'cpm-analysis', tab: 2, refKey: 'cpm' },
    { label: 'Task Repository', file: 'task-repository', tab: 1, refKey: 'taskGrid' },
];

// ─────────────────────────────────────────────────────────────────
// GANTT CSS OVERRIDES — Uses design tokens
// ─────────────────────────────────────────────────────────────────
const ganttStyles = `
  .gantt-chart-wrapper {
    background-color: ${tokens.color.surface} !important;
  }
  .gantt-chart-wrapper svg {
    background-color: ${tokens.color.surface} !important;
  }
  .gantt-chart-wrapper rect:not([height="30"]):not([class*="bar"]) {
    fill: ${tokens.color.surface} !important;
  }
  .gantt-chart-wrapper [class*="calendar"] rect,
  .gantt-chart-wrapper .calendar rect {
    fill: ${tokens.color.neutralLighter} !important;
    stroke: ${tokens.color.neutralLight} !important;
  }
  .gantt-chart-wrapper [class*="calendar"] text,
  .gantt-chart-wrapper .calendar text {
    fill: ${tokens.color.primary} !important;
    font-weight: ${tokens.weight.bold} !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 11px;
  }
  .gantt-chart-wrapper line {
    stroke: ${tokens.color.neutralLighter} !important;
  }
  .gantt-chart-wrapper div:first-child:not(svg) {
    background-color: ${tokens.color.surface} !important;
    border-right: 1px solid ${tokens.color.neutralLight} !important;
  }
  .gantt-chart-wrapper div:first-child:not(svg) div {
    border-bottom: 1px solid ${tokens.color.neutralLighter} !important;
    color: ${tokens.color.text} !important;
    font-weight: ${tokens.weight.normal} !important;
  }
  .bar-wrapper:hover .bar-main {
    filter: brightness(0.92);
    cursor: pointer;
  }
  .gantt-chart-wrapper .today {
    fill: ${alpha(tokens.color.accent, 0.08)} !important;
  }
  .gantt-chart-wrapper text[class*="bar"] {
    fill: ${tokens.color.surface} !important;
    font-weight: ${tokens.weight.semibold} !important;
  }
`;

// ─────────────────────────────────────────────────────────────────
// FULLSCREEN STYLES — For Analytics iframe
// ─────────────────────────────────────────────────────────────────
const fullscreenStyles = `
  .analytics-fullscreen {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 9999 !important;
    background: ${tokens.color.surface} !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 0 !important;
  }
  
  .analytics-fullscreen iframe {
    width: 100% !important;
    height: calc(100vh - 48px) !important;
  }
  
  .analytics-fullscreen .fullscreen-header {
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: ${tokens.color.neutralLighter};
    border-bottom: 1px solid ${tokens.color.neutralLight};
  }
`;

// ─────────────────────────────────────────────────────────────────
// REUSABLE SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, iconBg, label, value, bgColor, borderColor }) => (
    <Paper
        variant="outlined"
        sx={{
            p: 2.5,
            borderRadius: tokens.radius.md,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: bgColor,
            border: `1px solid ${borderColor}`,
            transition: tokens.transition.fast,
            '&:hover': {
                boxShadow: tokens.shadow.sm,
                transform: 'translateY(-1px)',
            },
        }}
    >
        <Avatar sx={{ bgcolor: iconBg, width: 44, height: 44 }}>
            {icon}
        </Avatar>
        <Box>
            <Typography
                variant="caption"
                sx={{
                    fontWeight: tokens.weight.bold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: tokens.color.textSecondary,
                    fontSize: '0.675rem',
                }}
            >
                {label}
            </Typography>
            <Typography
                variant="h5"
                sx={{
                    fontWeight: tokens.weight.bold,
                    color: tokens.color.text,
                    lineHeight: 1.2,
                }}
            >
                {value}
            </Typography>
        </Box>
    </Paper>
);

const SectionCard = ({ children, sx, ...props }) => (
    <Card
        elevation={0}
        sx={{
            borderRadius: tokens.radius.lg,
            border: `1px solid ${tokens.color.neutralLight}`,
            boxShadow: tokens.shadow.sm,
            overflow: 'hidden',
            transition: tokens.transition.normal,
            '&:hover': { boxShadow: tokens.shadow.md },
            ...sx,
        }}
        {...props}
    >
        {children}
    </Card>
);

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const ProjectDetails = () => {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

    // ─── UI State ────────────────────────────────────────────────
    const [tab, setTab] = useState(0);
    const [openTaskForm, setOpenTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode] = useState(ViewMode.Month);
    const [fullView, setFullView] = useState(false);
    const [downloadAnchor, setDownloadAnchor] = useState(null);
    const [analyticsKey, setAnalyticsKey] = useState(0);
    const [analyticsFullscreen, setAnalyticsFullscreen] = useState(false);
    const [networkLegendVisible, setNetworkLegendVisible] = useState(true);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // ─── Refs ────────────────────────────────────────────────────
    const refs = {
        gantt: useRef(null),
        cpm: useRef(null),
        taskGrid: useRef(null),
        network: useRef(null),
    };

    // ─── Queries ─────────────────────────────────────────────────
    const {
        data: project,
        isLoading: projectLoading,
        error: projectError,
    } = useQuery({
        queryKey: ['project', id],
        queryFn: () => api.get(`/projects/${id}/`),
        enabled: !!id,
    });

    const { data: rawTasks = [] } = useQuery({
        queryKey: ['projectTasks', id],
        queryFn: () => api.get(`/pm/tasks/critical_path/?project_id=${id}`),
        enabled: !!id,
    });

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/users/users/'),
    });

    const cpmData = rawTasks;

    // ─── Gantt Task Mapping (CPM-aware, Brand Colors) ────────────────
    const tasks = useMemo(() => {
        if (!rawTasks.length) return [];

        const idToTask = {};
        rawTasks.forEach(t => { idToTask[t.id] = t; });

        // 1) Build hierarchy to ensure parent-child rows render together in order
        const map = {};
        const roots = [];
        rawTasks.forEach(t => { map[t.id] = { ...t, _children: [] }; });
        rawTasks.forEach(t => {
            if (t.parent_task && map[t.parent_task]) {
                map[t.parent_task]._children.push(map[t.id]);
            } else {
                roots.push(map[t.id]);
            }
        });

        const sortChildren = (node) => {
            node._children.sort((a, b) =>
                (a.sort_order - b.sort_order) ||
                (a.wbs_code || '').localeCompare(b.wbs_code || '', undefined, { numeric: true, sensitivity: 'base' }) ||
                a.name.localeCompare(b.name)
            );
            node._children.forEach(sortChildren);
        };

        const rootNodes = roots.sort((a, b) =>
            (a.sort_order - b.sort_order) ||
            (a.wbs_code || '').localeCompare(b.wbs_code || '', undefined, { numeric: true, sensitivity: 'base' }) ||
            a.name.localeCompare(b.name)
        );
        rootNodes.forEach(sortChildren);

        const flatTasks = [];
        const flatten = (node) => {
            flatTasks.push(node);
            node._children.forEach(c => flatten(c));
        };
        rootNodes.forEach(n => flatten(n));

        return flatTasks
            .map((t) => {
                // Use CPM-calculated dates if available; fallback to start_date
                const startRaw = t.early_start || t.start_date;
                const endRaw = t.early_finish;

                if (!startRaw) return null;

                const start = new Date(startRaw);
                let end;
                if (endRaw) {
                    end = new Date(endRaw);
                    // gantt-task-react expects end > start even for milestones
                    if (end <= start) {
                        end = new Date(start);
                        end.setDate(start.getDate() + 1);
                    }
                } else {
                    end = new Date(start);
                    end.setDate(start.getDate() + Math.max(t.duration || 1, 1));
                }

                // Determine gantt type: milestone (duration 0), project (summary), or task
                const isMilestone = t.task_type === 'milestone' || (t.duration || 0) === 0;
                const isSummary = t.task_type === 'summary_task';
                const ganttType = isMilestone ? 'milestone' : isSummary ? 'project' : 'task';

                // Build dependency arrows: use typed Dependency ids if available
                const depsFromTyped = (t.predecessor_deps || [])
                    .filter(d => idToTask[d.predecessor_task])
                    .map(d => String(d.predecessor_task));

                const depsFromLegacy = (t.dependencies || [])
                    .filter(depId => idToTask[depId])
                    .map(depId => String(depId));

                const dependenciesArr = depsFromTyped.length > 0
                    ? depsFromTyped
                    : depsFromLegacy;

                const isCritical = !!t.is_critical;
                const float = t.total_float ?? t.slack;
                const floatZero = float === 0 || isCritical;

                return {
                    start,
                    end,
                    name: `${t.wbs_code ? t.wbs_code + ' — ' : ''}${t.name}`,
                    id: String(t.id),
                    type: ganttType,
                    // Link to parent task ID to create the Gantt hierarchy
                    project: t.parent_task && idToTask[t.parent_task] ? String(t.parent_task) : undefined,
                    progress: t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0,
                    isDisabled: false,
                    dependencies: [], // Intentionally empty to disable Gantt dependency arrows
                    hideChildren: false,
                    styles: {
                        progressColor: isCritical ? tokens.color.critical : (isSummary ? tokens.color.primary : tokens.color.accent),
                        progressSelectedColor: isCritical ? tokens.color.critical : (isSummary ? tokens.color.primaryDark : tokens.color.accentDark),
                        backgroundColor: alpha(isCritical ? tokens.color.critical : (isSummary ? tokens.color.primary : tokens.color.accent), 0.1),
                        backgroundSelectedColor: alpha(isCritical ? tokens.color.critical : (isSummary ? tokens.color.primary : tokens.color.accent), 0.2),
                    },
                };
            })
            .filter(Boolean); // remove nulls from tasks with no start date
    }, [rawTasks]);


    // ─── Mutations ───────────────────────────────────────────────
    const saveTaskMutation = useMutation({
        mutationFn: (payload) =>
            editingTask
                ? api.put(`/pm/tasks/${editingTask.id}/`, payload)
                : api.post('/pm/tasks/', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projectTasks', id] });
            setOpenTaskForm(false);
            setEditingTask(null);
            setRefreshTrigger((p) => p + 1);
        },
        onError: (err) => alert(`Failed to save task: ${err.message}`),
    });

    const deleteTaskMutation = useMutation({
        mutationFn: (taskId) => api.delete(`/pm/tasks/${taskId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projectTasks', id] });
            setDeleteModalOpen(false);
            setTaskToDelete(null);
            setRefreshTrigger((p) => p + 1);
            // Auto-renumber WBS after deletion to close any gaps
            renumberWbsMutation.mutate();
        },
        onError: (err) => console.error('Error deleting task:', err),
    });

    const renumberWbsMutation = useMutation({
        mutationFn: () => api.post(`/pm/tasks/renumber_wbs/?project_id=${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projectTasks', id] });
            setRefreshTrigger((p) => p + 1);
        },
        onError: (err) => console.error('WBS renumber failed:', err),
    });

    const updateTaskStatusMutation = useMutation({
        mutationFn: ({ taskId, status }) =>
            api.patch(`/pm/tasks/${taskId}/`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projectTasks', id] });
            setRefreshTrigger((p) => p + 1);
        },
        onError: (err) => alert(`Failed to move task: ${err.message}`),
    });

    // ─── Handlers ────────────────────────────────────────────────
    const handleDownload = (refKey, filename, targetTab) => {
        setDownloadAnchor(null);
        const ref = refs[refKey];

        const executeDownload = () => {
            if (!ref.current) {
                alert('Content not available. Ensure the relevant tab is active.');
                return;
            }
            if (filename === 'network-diagram' && ref.current.exportNetwork) {
                ref.current.exportNetwork();
                return;
            }

            const isGantt = filename.includes('gantt');
            const target = isGantt
                ? ref.current.querySelector('.gantt-chart-wrapper') || ref.current
                : ref.current;

            const originalStyle = target.style.cssText;
            if (isGantt) {
                target.style.height = 'auto';
                target.style.overflow = 'visible';
                target.style.width = 'max-content';
            }

            toBlob(target, {
                backgroundColor: tokens.color.surface,
                cacheBust: true,
                skipFonts: true,
                filter: (node) => node.id !== 'view-options-panel',
            })
                .then((blob) => {
                    if (isGantt) target.style.cssText = originalStyle;
                    if (!blob) {
                        alert('Export failed — could not capture the element.');
                        return;
                    }
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `${filename}-${Date.now()}.png`;
                    link.href = url;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                })
                .catch((err) => {
                    if (isGantt) target.style.cssText = originalStyle;
                    alert(`Export failed: ${err.message}`);
                });
        };

        if (targetTab !== undefined && tab !== targetTab) {
            setTab(targetTab);
            // TODO: Replace setTimeout with an off-screen render approach
            // to eliminate this race condition risk on slow machines.
            setTimeout(executeDownload, 800);
        } else {
            setTimeout(executeDownload, 100);
        }
    };

    const handleCSVExport = (data, filename) => {
        if (!data?.length) return;
        setDownloadAnchor(null);

        const columns = ['name', 'duration', 'es', 'ef', 'ls', 'lf', 'slack', 'is_critical'];
        const headers = columns.map((c) => c.toUpperCase().replace('_', ' ')).join(',');
        const rows = data
            .map((row) => columns.map((col) => `"${row[col] ?? ''}"`).join(','))
            .join('\n');

        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(`data:text/csv;charset=utf-8,${headers}\n${rows}`));
        link.setAttribute('download', `${filename}-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchProjectData = () => {
        queryClient.invalidateQueries({ queryKey: ['project', id] });
        queryClient.invalidateQueries({ queryKey: ['projectTasks', id] });
        queryClient.invalidateQueries({ queryKey: ['expenses', id] });
        queryClient.invalidateQueries({ queryKey: ['budget-categories', id] });
        queryClient.invalidateQueries({ queryKey: ['monthly-budgets', id] });
        setRefreshTrigger((p) => p + 1);
    };

    const handleTaskSave = (taskData) => {
        saveTaskMutation.mutate({ ...taskData, project: Number(id) });
    };

    const handleTaskDelete = (task) => {
        setTaskToDelete(task);
        setDeleteModalOpen(true);
    };

    const handleConfirmDeleteTask = () => {
        if (taskToDelete) deleteTaskMutation.mutate(taskToDelete.id);
    };

    const toggleAnalyticsFullscreen = () => {
        setAnalyticsFullscreen((prev) => !prev);
    };

    // NOTE: handleFileUpload and handleFileDelete have been intentionally
    // removed. File management is handled entirely by <FileTree />.
    // The previous version contained a hardcoded localhost URL that would
    // break in production.

    // ─── Loading State ───────────────────────────────────────────
    if (projectLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    gap: 3,
                    bgcolor: tokens.color.background,
                }}
            >
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                        size={56}
                        thickness={3}
                        sx={{ color: tokens.color.accent }}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <AccountTreeIcon
                            sx={{ fontSize: 20, color: tokens.color.primary }}
                        />
                    </Box>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: tokens.weight.bold,
                            color: tokens.color.primary,
                            mb: 0.5,
                        }}
                    >
                        Loading Project
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: tokens.color.textSecondary }}
                    >
                        Preparing your project intelligence…
                    </Typography>
                </Box>
            </Box>
        );
    }

    // ─── Error State ─────────────────────────────────────────────
    if (projectError) {
        return (
            <Box
                sx={{
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    gap: 3,
                    bgcolor: tokens.color.background,
                }}
            >
                <Avatar
                    sx={{
                        width: 72,
                        height: 72,
                        bgcolor: tokens.color.criticalBg,
                    }}
                >
                    <WarningIcon
                        sx={{ fontSize: 36, color: tokens.color.critical }}
                    />
                </Avatar>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: tokens.weight.bold,
                            color: tokens.color.critical,
                            mb: 1,
                        }}
                    >
                        Failed to load project
                    </Typography>
                    <Typography
                        sx={{
                            color: tokens.color.textSecondary,
                            maxWidth: 440,
                            lineHeight: 1.6,
                        }}
                    >
                        {projectError.message ||
                            'An unexpected error occurred while fetching project data.'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    onClick={fetchProjectData}
                    sx={{
                        mt: 1,
                        borderRadius: tokens.radius.sm,
                        bgcolor: tokens.color.primary,
                        px: 4,
                        py: 1.2,
                        fontWeight: tokens.weight.semibold,
                        textTransform: 'none',
                        '&:hover': { bgcolor: tokens.color.primaryLight },
                    }}
                >
                    Try Again
                </Button>
            </Box>
        );
    }

    if (!project) return null;

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                maxWidth: 1600,
                margin: '0 auto',
                bgcolor: tokens.color.background,
                minHeight: '100vh',
            }}
        >
            <style>{ganttStyles}</style>
            <style>{fullscreenStyles}</style>

            {/* ─── Page Header ─────────────────────────────────── */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'stretch', md: 'center' },
                    mb: 4,
                    gap: 2,
                }}
            >
                <Box>
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: tokens.weight.bold,
                            color: tokens.color.primary,
                            letterSpacing: '-0.02em',
                            fontSize: { xs: '1.75rem', md: '2.5rem' },
                            lineHeight: 1.2,
                        }}
                    >
                        {project.name}
                    </Typography>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: tokens.weight.normal,
                            color: tokens.color.textSecondary,
                            mt: 0.5,
                        }}
                    >
                        Project Intelligence & Timeline
                    </Typography>
                </Box>

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{ flexShrink: 0 }}
                >
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setEditingTask(null);
                            setOpenTaskForm(true);
                        }}
                        sx={{
                            borderRadius: tokens.radius.sm,
                            px: 3,
                            py: 1.2,
                            fontWeight: tokens.weight.semibold,
                            textTransform: 'none',
                            bgcolor: tokens.color.accent,
                            boxShadow: `0 4px 14px ${alpha(tokens.color.accent, 0.3)}`,
                            '&:hover': {
                                bgcolor: tokens.color.accentDark,
                                boxShadow: `0 6px 20px ${alpha(tokens.color.accent, 0.4)}`,
                            },
                        }}
                    >
                        Add Task
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={(e) => setDownloadAnchor(e.currentTarget)}
                        sx={{
                            borderRadius: tokens.radius.sm,
                            px: 3,
                            py: 1.2,
                            fontWeight: tokens.weight.semibold,
                            textTransform: 'none',
                            bgcolor: tokens.color.primary,
                            boxShadow: `0 4px 14px ${alpha(tokens.color.primary, 0.25)}`,
                            '&:hover': { bgcolor: tokens.color.primaryLight },
                        }}
                    >
                        Export
                    </Button>

                    <Menu
                        anchorEl={downloadAnchor}
                        open={Boolean(downloadAnchor)}
                        onClose={() => setDownloadAnchor(null)}
                        PaperProps={{
                            sx: {
                                borderRadius: tokens.radius.md,
                                mt: 1,
                                minWidth: 220,
                                boxShadow: tokens.shadow.lg,
                                border: `1px solid ${tokens.color.neutralLight}`,
                            },
                        }}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                px: 2,
                                py: 1,
                                display: 'block',
                                fontWeight: tokens.weight.bold,
                                color: tokens.color.textMuted,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Export as Image
                        </Typography>
                        {EXPORT_ITEMS.map((item) => (
                            <MenuItem
                                key={item.file}
                                onClick={() => handleDownload(item.refKey, item.file, item.tab)}
                                sx={{ fontSize: '0.875rem' }}
                            >
                                <DownloadIcon
                                    sx={{ mr: 1.5, fontSize: 18, color: tokens.color.textMuted }}
                                />
                                {item.label}
                            </MenuItem>
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <Typography
                            variant="caption"
                            sx={{
                                px: 2,
                                py: 1,
                                display: 'block',
                                fontWeight: tokens.weight.bold,
                                color: tokens.color.textMuted,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Export as Data
                        </Typography>
                        <MenuItem
                            onClick={() => handleCSVExport(cpmData, 'cpm-analysis-data')}
                            sx={{ fontSize: '0.875rem' }}
                        >
                            <DownloadIcon
                                sx={{ mr: 1.5, fontSize: 18, color: tokens.color.textMuted }}
                            />
                            CPM Data (CSV)
                        </MenuItem>
                    </Menu>

                    <Tooltip title="Refresh all data" arrow>
                        <IconButton
                            onClick={fetchProjectData}
                            aria-label="Refresh project data"
                            sx={{
                                border: `1px solid ${tokens.color.neutralLight}`,
                                borderRadius: tokens.radius.sm,
                                color: tokens.color.textSecondary,
                                '&:hover': {
                                    bgcolor: tokens.color.neutralLighter,
                                    borderColor: tokens.color.neutral,
                                },
                            }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* ─── Tabs ────────────────────────────────────────── */}
            <Box sx={{ borderBottom: `2px solid ${tokens.color.neutralLighter}`, mb: 3 }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    variant={isMobile ? 'scrollable' : 'standard'}
                    scrollButtons={isMobile ? 'auto' : false}
                    allowScrollButtonsMobile
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: tokens.weight.semibold,
                            fontSize: '0.875rem',
                            color: tokens.color.textSecondary,
                            minHeight: 48,
                            px: 2.5,
                            transition: tokens.transition.fast,
                            '&:hover': {
                                color: tokens.color.primary,
                                bgcolor: alpha(tokens.color.primary, 0.04),
                            },
                        },
                        '& .Mui-selected': {
                            color: `${tokens.color.primary} !important`,
                            fontWeight: tokens.weight.bold,
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: tokens.color.accent,
                            height: 3,
                            borderRadius: '3px 3px 0 0',
                        },
                    }}
                >
                    {TAB_LABELS.map((label) => (
                        <Tab key={label} label={label} />
                    ))}
                </Tabs>
            </Box>

            {/* ─── Tab Panels ──────────────────────────────────── */}
            <Box sx={{ py: 1 }}>

                {/* 0 — Overview */}
                {tab === 0 && (
                    <SectionCard sx={{ p: 4 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: tokens.weight.bold,
                                mb: 2,
                                color: tokens.color.primary,
                            }}
                        >
                            Project Description
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{
                                lineHeight: 1.8,
                                color: tokens.color.textSecondary,
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {project.description || 'No description provided for this project.'}
                        </Typography>
                    </SectionCard>
                )}

                {/* 1 — Tasks */}
                {tab === 1 && (
                    <Box ref={refs.taskGrid}>
                        <ProjectTasksTab
                            tasks={rawTasks}
                            onAddTask={() => {
                                setEditingTask(null);
                                setOpenTaskForm(true);
                            }}
                            onEditTask={(task) => {
                                setEditingTask(task);
                                setOpenTaskForm(true);
                            }}
                            onDeleteTask={handleTaskDelete}
                            onRenumberWbs={() => renumberWbsMutation.mutate()}
                            onStatusChange={(taskId, status) =>
                                updateTaskStatusMutation.mutate({ taskId, status })
                            }
                            users={users}
                        />
                    </Box>
                )}

                {/* 2 — Timeline & Analysis */}
                {tab === 2 && (
                    <Grid container spacing={3}>
                        {/* Gantt Chart */}
                        <Grid item xs={12}>
                            <SectionCard>
                                <CardHeader
                                    title="Project Timeline"
                                    subheader="Interactive Gantt chart — drag to adjust timelines"
                                    titleTypographyProps={{
                                        variant: 'h6',
                                        fontWeight: tokens.weight.bold,
                                        color: tokens.color.primary,
                                    }}
                                    subheaderTypographyProps={{
                                        variant: 'body2',
                                        color: tokens.color.textMuted,
                                    }}
                                    action={
                                        <Stack
                                            direction="row"
                                            spacing={1.5}
                                            alignItems="center"
                                            id="view-options-panel"
                                        >
                                            <Button
                                                size="small"
                                                variant={fullView ? 'contained' : 'outlined'}
                                                onClick={() => setFullView(!fullView)}
                                                sx={{
                                                    borderRadius: tokens.radius.sm,
                                                    textTransform: 'none',
                                                    fontWeight: tokens.weight.semibold,
                                                    fontSize: '0.8125rem',
                                                    ...(fullView
                                                        ? {
                                                            bgcolor: tokens.color.primary,
                                                            '&:hover': {
                                                                bgcolor: tokens.color.primaryLight,
                                                            },
                                                        }
                                                        : {
                                                            borderColor: tokens.color.neutralLight,
                                                            color: tokens.color.textSecondary,
                                                            '&:hover': {
                                                                borderColor: tokens.color.accent,
                                                                color: tokens.color.accent,
                                                            },
                                                        }),
                                                }}
                                            >
                                                {fullView ? 'Exit Full' : 'Full View'}
                                            </Button>
                                            <ToggleButtonGroup
                                                value={viewMode}
                                                exclusive
                                                onChange={(_, next) => next && setViewMode(next)}
                                                size="small"
                                                sx={{
                                                    '& .MuiToggleButton-root': {
                                                        border: `1px solid ${tokens.color.neutralLight}`,
                                                        color: tokens.color.textMuted,
                                                        px: 1.5,
                                                        '&.Mui-selected': {
                                                            bgcolor: alpha(tokens.color.accent, 0.1),
                                                            color: tokens.color.accent,
                                                            borderColor: alpha(tokens.color.accent, 0.3),
                                                            '&:hover': {
                                                                bgcolor: alpha(tokens.color.accent, 0.15),
                                                            },
                                                        },
                                                    },
                                                }}
                                            >
                                                <ToggleButton value={ViewMode.Day} aria-label="Day view">
                                                    <Tooltip title="Day">
                                                        <DayIcon fontSize="small" />
                                                    </Tooltip>
                                                </ToggleButton>
                                                <ToggleButton value={ViewMode.Week} aria-label="Week view">
                                                    <Tooltip title="Week">
                                                        <WeekIcon fontSize="small" />
                                                    </Tooltip>
                                                </ToggleButton>
                                                <ToggleButton value={ViewMode.Month} aria-label="Month view">
                                                    <Tooltip title="Month">
                                                        <CalendarIcon fontSize="small" />
                                                    </Tooltip>
                                                </ToggleButton>
                                                <ToggleButton value={ViewMode.Year} aria-label="Year view">
                                                    <Tooltip title="Year">
                                                        <YearIcon fontSize="small" />
                                                    </Tooltip>
                                                </ToggleButton>
                                            </ToggleButtonGroup>
                                        </Stack>
                                    }
                                    sx={{
                                        borderBottom: `1px solid ${tokens.color.neutralLighter}`,
                                        px: 3,
                                        py: 2,
                                    }}
                                />
                                <CardContent sx={{ p: 0 }} ref={refs.gantt}>
                                    {tasks.length > 0 ? (
                                        <Box
                                            className="gantt-chart-wrapper"
                                            sx={{
                                                height: fullView ? 'auto' : 600,
                                                overflow: fullView ? 'visible' : 'auto',
                                                bgcolor: tokens.color.surface,
                                                '& .gantt-container': { fontFamily: 'inherit' },
                                            }}
                                        >
                                            <Gantt
                                                tasks={tasks}
                                                viewMode={viewMode}
                                                listCellWidth="200px"
                                                columnWidth={
                                                    viewMode === ViewMode.Year
                                                        ? 150
                                                        : viewMode === ViewMode.Month
                                                            ? 100
                                                            : 60
                                                }
                                                barCornerRadius={2}
                                                handleWidth={8}
                                                fontFamily="inherit"
                                                fontSize="12px"
                                                headerHeight={50}
                                                rowHeight={50}
                                                todayColor={alpha(tokens.color.accent, 0.08)}
                                            />
                                        </Box>
                                    ) : (
                                        <Box
                                            sx={{
                                                p: 8,
                                                textAlign: 'center',
                                                bgcolor: tokens.color.neutralLighter,
                                            }}
                                        >
                                            <CalendarIcon
                                                sx={{
                                                    fontSize: 48,
                                                    color: tokens.color.neutral,
                                                    mb: 2,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    color: tokens.color.textSecondary,
                                                    fontWeight: tokens.weight.semibold,
                                                    mb: 0.5,
                                                }}
                                            >
                                                No tasks scheduled yet
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: tokens.color.textMuted }}
                                            >
                                                Add tasks to visualize the project timeline.
                                            </Typography>
                                        </Box>
                                    )}
                                </CardContent>
                            </SectionCard>
                        </Grid>

                        {/* CPM Analysis */}
                        {cpmData.length > 0 && (
                            <Grid
                                item
                                xs={12}
                                ref={refs.cpm}
                                sx={{
                                    bgcolor: tokens.color.surface,
                                    p: 2,
                                    borderRadius: tokens.radius.lg,
                                }}
                            >
                                <SectionCard>
                                    <CardHeader
                                        avatar={
                                            <Avatar
                                                sx={{
                                                    bgcolor: tokens.color.primary,
                                                    width: 40,
                                                    height: 40,
                                                }}
                                            >
                                                <TrendingUpIcon fontSize="small" />
                                            </Avatar>
                                        }
                                        title="Critical Path Analysis"
                                        subheader="Longest dependent task sequence & minimum project duration"
                                        titleTypographyProps={{
                                            variant: 'h6',
                                            fontWeight: tokens.weight.bold,
                                            color: tokens.color.primary,
                                        }}
                                        subheaderTypographyProps={{
                                            variant: 'body2',
                                            color: tokens.color.textMuted,
                                        }}
                                        action={
                                            <Tooltip title="CPM identifies the longest sequence of dependent tasks and the shortest possible project duration.">
                                                <IconButton aria-label="About Critical Path Method">
                                                    <InfoIcon sx={{ color: tokens.color.neutral }} />
                                                </IconButton>
                                            </Tooltip>
                                        }
                                        sx={{
                                            borderBottom: `1px solid ${tokens.color.neutralLighter}`,
                                            px: 3,
                                            py: 2,
                                        }}
                                    />
                                    <CardContent sx={{ p: 3 }}>
                                        {/* Stat Cards */}
                                        <Grid container spacing={2} sx={{ mb: 4 }}>
                                            <Grid item xs={12} md={4}>
                                                <StatCard
                                                    icon={<TimerIcon fontSize="small" />}
                                                    iconBg={tokens.color.critical}
                                                    label="Project Duration"
                                                    value={`${Math.max(...cpmData.map((t) => t.ef || 0))} Days`}
                                                    bgColor={tokens.color.criticalBg}
                                                    borderColor={tokens.color.criticalBorder}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <StatCard
                                                    icon={<AccountTreeIcon fontSize="small" />}
                                                    iconBg={tokens.color.accent}
                                                    label="Critical Tasks"
                                                    value={cpmData.filter((t) => t.is_critical).length}
                                                    bgColor={tokens.color.successBg}
                                                    borderColor={tokens.color.successBorder}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <StatCard
                                                    icon={<WarningIcon fontSize="small" />}
                                                    iconBg={tokens.color.warning}
                                                    label="Total Float"
                                                    value={`${cpmData.reduce((a, t) => a + (t.slack || 0), 0)} Days`}
                                                    bgColor={tokens.color.warningBg}
                                                    borderColor={tokens.color.warningBorder}
                                                />
                                            </Grid>
                                        </Grid>

                                        {/* Critical Path Sequence */}
                                        <Box sx={{ mb: 4 }}>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: tokens.weight.bold,
                                                    mb: 2,
                                                    color: tokens.color.textSecondary,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    fontSize: '0.75rem',
                                                }}
                                            >
                                                <TrendingUpIcon
                                                    fontSize="small"
                                                    sx={{ color: tokens.color.critical }}
                                                />
                                                Critical Path Sequence
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    flexWrap: 'wrap',
                                                    rowGap: 1.5,
                                                    p: 2.5,
                                                    bgcolor: tokens.color.criticalBg,
                                                    borderRadius: tokens.radius.md,
                                                    border: `1px solid ${tokens.color.criticalBorder}`,
                                                }}
                                            >
                                                {rawTasks
                                                    .filter((t) => t.is_critical)
                                                    .sort((a, b) => a.es - b.es)
                                                    .map((t, i, arr) => (
                                                        <Box
                                                            key={t.id}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                            }}
                                                        >
                                                            <Chip
                                                                label={t.name}
                                                                sx={{
                                                                    fontWeight: tokens.weight.semibold,
                                                                    borderRadius: tokens.radius.sm,
                                                                    bgcolor: tokens.color.critical,
                                                                    color: '#fff',
                                                                    px: 1,
                                                                    '&:hover': { bgcolor: '#b71c1c' },
                                                                }}
                                                            />
                                                            {i < arr.length - 1 && (
                                                                <ArrowForwardIcon
                                                                    sx={{
                                                                        color: tokens.color.neutral,
                                                                        fontSize: 16,
                                                                    }}
                                                                />
                                                            )}
                                                        </Box>
                                                    ))}
                                            </Box>
                                        </Box>

                                        {/* CPM Data Table */}
                                        <TableContainer
                                            component={Paper}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: tokens.radius.md,
                                                overflow: 'hidden',
                                                border: `1px solid ${tokens.color.neutralLight}`,
                                            }}
                                        >
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: tokens.color.neutralLighter }}>
                                                        {CPM_COLUMNS.map((col) => (
                                                            <TableCell
                                                                key={col.label}
                                                                align={col.align}
                                                                sx={{
                                                                    fontWeight: tokens.weight.bold,
                                                                    fontSize: '0.7rem',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.5px',
                                                                    color:
                                                                        col.color ||
                                                                        tokens.color.textSecondary,
                                                                    py: 1.5,
                                                                    borderBottom: `2px solid ${tokens.color.neutralLight}`,
                                                                }}
                                                            >
                                                                {col.label}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {cpmData.map((row) => (
                                                        <TableRow
                                                            key={row.id}
                                                            sx={{
                                                                bgcolor: row.is_critical
                                                                    ? alpha(tokens.color.critical, 0.02)
                                                                    : 'inherit',
                                                                '&:hover': {
                                                                    bgcolor: row.is_critical
                                                                        ? alpha(tokens.color.critical, 0.04)
                                                                        : tokens.color.surfaceHover,
                                                                },
                                                                transition: tokens.transition.fast,
                                                                '& td': {
                                                                    borderBottom: `1px solid ${tokens.color.neutralLighter}`,
                                                                },
                                                            }}
                                                        >
                                                            <TableCell
                                                                sx={{
                                                                    fontWeight: row.is_critical
                                                                        ? tokens.weight.bold
                                                                        : tokens.weight.normal,
                                                                    color: tokens.color.text,
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 1,
                                                                    }}
                                                                >
                                                                    {row.is_critical && (
                                                                        <Box
                                                                            sx={{
                                                                                width: 3,
                                                                                height: 20,
                                                                                borderRadius: 2,
                                                                                bgcolor: tokens.color.critical,
                                                                                flexShrink: 0,
                                                                            }}
                                                                        />
                                                                    )}
                                                                    {row.name}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell
                                                                align="center"
                                                                sx={{
                                                                    color: tokens.color.textSecondary,
                                                                    fontWeight: tokens.weight.semibold,
                                                                }}
                                                            >
                                                                {row.duration}d
                                                            </TableCell>
                                                            <TableCell
                                                                align="center"
                                                                sx={{
                                                                    color: tokens.color.accent,
                                                                    fontWeight: tokens.weight.semibold,
                                                                }}
                                                            >
                                                                {row.es}
                                                            </TableCell>
                                                            <TableCell
                                                                align="center"
                                                                sx={{
                                                                    color: tokens.color.accent,
                                                                    fontWeight: tokens.weight.semibold,
                                                                }}
                                                            >
                                                                {row.ef}
                                                            </TableCell>
                                                            <TableCell
                                                                align="center"
                                                                sx={{
                                                                    color: tokens.color.lateSchedule,
                                                                    fontWeight: tokens.weight.semibold,
                                                                }}
                                                            >
                                                                {row.ls}
                                                            </TableCell>
                                                            <TableCell
                                                                align="center"
                                                                sx={{
                                                                    color: tokens.color.lateSchedule,
                                                                    fontWeight: tokens.weight.semibold,
                                                                }}
                                                            >
                                                                {row.lf}
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Chip
                                                                    label={`${row.slack}d`}
                                                                    size="small"
                                                                    sx={{
                                                                        fontWeight: tokens.weight.bold,
                                                                        minWidth: 48,
                                                                        borderRadius: tokens.radius.sm,
                                                                        bgcolor:
                                                                            row.slack === 0
                                                                                ? alpha(
                                                                                    tokens.color.critical,
                                                                                    0.1
                                                                                )
                                                                                : alpha(
                                                                                    tokens.color.neutral,
                                                                                    0.15
                                                                                ),
                                                                        color:
                                                                            row.slack === 0
                                                                                ? tokens.color.critical
                                                                                : tokens.color.textSecondary,
                                                                        border: `1px solid ${row.slack === 0
                                                                            ? tokens.color.criticalBorder
                                                                            : tokens.color.neutralLight
                                                                            }`,
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Chip
                                                                    label={
                                                                        row.is_critical
                                                                            ? 'CRITICAL'
                                                                            : 'NON-CRITICAL'
                                                                    }
                                                                    size="small"
                                                                    sx={{
                                                                        fontWeight: tokens.weight.bold,
                                                                        fontSize: '0.65rem',
                                                                        borderRadius: tokens.radius.sm,
                                                                        ...(row.is_critical
                                                                            ? {
                                                                                bgcolor:
                                                                                    tokens.color.critical,
                                                                                color: '#fff',
                                                                            }
                                                                            : {
                                                                                bgcolor:
                                                                                    tokens.color
                                                                                        .neutralLighter,
                                                                                color: tokens.color.textMuted,
                                                                                border: `1px solid ${tokens.color.neutralLight}`,
                                                                            }),
                                                                    }}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </CardContent>
                                </SectionCard>
                            </Grid>
                        )}
                    </Grid>
                )}

                {/* 3 — Network Diagram */}
                {tab === 3 && (
                    <SectionCard>
                        {/* Network Diagram Header with Legend Toggle */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 3,
                                py: 2,
                                borderBottom: `1px solid ${tokens.color.neutralLighter}`,
                            }}
                        >
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: tokens.weight.bold,
                                        color: tokens.color.primary,
                                    }}
                                >
                                    Network Diagram
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ color: tokens.color.textMuted }}
                                >
                                    Task dependency visualization with critical path highlighting
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setNetworkLegendVisible(!networkLegendVisible)}
                                sx={{
                                    borderRadius: tokens.radius.sm,
                                    textTransform: 'none',
                                    fontWeight: tokens.weight.semibold,
                                    borderColor: tokens.color.neutralLight,
                                    color: tokens.color.textSecondary,
                                    '&:hover': {
                                        borderColor: tokens.color.accent,
                                        color: tokens.color.accent,
                                    },
                                }}
                            >
                                {networkLegendVisible ? 'Hide Legend' : 'Show Legend'}
                            </Button>
                        </Box>
                        {/* Dynamic height calculation to prevent double scrollbars */}
                        <Box sx={{ height: 'calc(100vh - 280px)', minHeight: 500 }}>
                            <NetworkDiagram
                                tasks={cpmData}
                                ref={refs.network}
                                showLegend={networkLegendVisible}
                            />
                        </Box>
                    </SectionCard>
                )}

                {/* 4 — Team */}
                {tab === 4 && <TeamTab tasks={rawTasks} users={users} />}

                {/* 5 — Milestones */}
                {tab === 5 && <MilestonesTab projectId={id} />}

                {/* 6 — Budget */}
                {tab === 6 && (
                    <BudgetTab
                        projectId={id}
                        startDate={project.start_date}
                        endDate={project.end_date}
                    />
                )}

                {/* 7 — Analytics (with Fullscreen support) */}
                {tab === 7 && (
                    <Box
                        className={analyticsFullscreen ? 'analytics-fullscreen' : ''}
                    >
                        {/* Fullscreen Header (only visible in fullscreen mode) */}
                        {analyticsFullscreen && (
                            <Box className="fullscreen-header">
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontWeight: tokens.weight.bold,
                                        color: tokens.color.primary,
                                    }}
                                >
                                    Analytics Dashboard — {project.name}
                                </Typography>
                                <Tooltip title="Exit fullscreen" arrow>
                                    <IconButton
                                        onClick={toggleAnalyticsFullscreen}
                                        sx={{
                                            color: tokens.color.textSecondary,
                                            '&:hover': { color: tokens.color.critical },
                                        }}
                                    >
                                        <FullscreenExitIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}

                        {/* Normal Header (hidden in fullscreen) */}
                        {!analyticsFullscreen && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 3,
                                }}
                            >
                                <Box>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: tokens.weight.bold,
                                            color: tokens.color.primary,
                                        }}
                                    >
                                        Analytics Dashboard
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: tokens.color.textMuted }}
                                    >
                                        Embedded business intelligence view
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    <Tooltip title="Open fullscreen" arrow>
                                        <IconButton
                                            onClick={toggleAnalyticsFullscreen}
                                            aria-label="Fullscreen analytics"
                                            sx={{
                                                border: `1px solid ${tokens.color.neutralLight}`,
                                                borderRadius: tokens.radius.sm,
                                                color: tokens.color.textSecondary,
                                                '&:hover': {
                                                    borderColor: tokens.color.accent,
                                                    color: tokens.color.accent,
                                                },
                                            }}
                                        >
                                            <FullscreenIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Reload dashboard" arrow>
                                        <IconButton
                                            onClick={() => setAnalyticsKey((p) => p + 1)}
                                            aria-label="Refresh analytics"
                                            sx={{
                                                border: `1px solid ${tokens.color.neutralLight}`,
                                                borderRadius: tokens.radius.sm,
                                                color: tokens.color.textSecondary,
                                            }}
                                        >
                                            <RefreshIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Box>
                        )}

                        {/* Content */}
                        {project.powerbi_embed_url ? (
                            <SectionCard
                                sx={
                                    analyticsFullscreen
                                        ? { border: 'none', boxShadow: 'none', borderRadius: 0 }
                                        : {}
                                }
                            >
                                <iframe
                                    key={analyticsKey}
                                    title="Analytics Dashboard"
                                    width="100%"
                                    height={analyticsFullscreen ? '100%' : '600'}
                                    src={project.powerbi_embed_url}
                                    frameBorder="0"
                                    allowFullScreen
                                    style={{ display: 'block' }}
                                />
                            </SectionCard>
                        ) : (
                            <SectionCard
                                sx={{
                                    p: 6,
                                    textAlign: 'center',
                                    bgcolor: tokens.color.neutralLighter,
                                }}
                            >
                                <InfoIcon
                                    sx={{
                                        fontSize: 48,
                                        color: tokens.color.neutral,
                                        mb: 2,
                                    }}
                                />
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: tokens.weight.semibold,
                                        color: tokens.color.textSecondary,
                                        mb: 0.5,
                                    }}
                                >
                                    No Dashboard Configured
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ color: tokens.color.textMuted }}
                                >
                                    Add a Power BI embed URL in project settings to see analytics
                                    here.
                                </Typography>
                            </SectionCard>
                        )}
                    </Box>
                )}

                {/* 8 — Files */}
                {tab === 8 && <FileTree projectId={id} refreshTrigger={refreshTrigger} />}
            </Box>

            {/* ─── Modals ──────────────────────────────────────── */}
            <TaskForm
                open={openTaskForm}
                onClose={() => setOpenTaskForm(false)}
                onSave={handleTaskSave}
                task={editingTask}
                allTasks={rawTasks}
                projects={[{ id: project.id, name: project.name }]}
                defaultProjectId={project.id}
            />
            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDeleteTask}
                itemName={taskToDelete?.name}
                itemType="Task"
                requireNameConfirmation={false}
            />
        </Box>
    );
};

export default ProjectDetails;