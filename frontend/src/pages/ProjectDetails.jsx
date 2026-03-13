import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
    Typography, Box, Tabs, Tab, Button, IconButton, Paper, Grid, Card, CardContent, CardHeader, Divider, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    ToggleButton, ToggleButtonGroup, Tooltip, Avatar, Stack,
    Menu, MenuItem
} from '@mui/material';
import {
    Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Upload as UploadIcon,
    CalendarMonth as CalendarIcon, ViewWeek as WeekIcon, ViewDay as DayIcon,
    CalendarToday as YearIcon, Timer as TimerIcon, Warning as WarningIcon,
    TrendingUp as TrendingUpIcon, AccountTree as AccountTreeIcon,
    ArrowForward as ArrowForwardIcon, InfoOutlined as InfoIcon,
    Download as DownloadIcon
} from '@mui/icons-material';
import { toPng } from 'html-to-image';
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

const ganttStyles = `
  /* Main Container Wrapper */
  .gantt-chart-wrapper {
    background-color: #ffffff !important;
  }

  /* Fix for the black background in the SVG area */
  .gantt-chart-wrapper svg {
    background-color: #ffffff !important;
    fill: #ffffff !important; /* Force base fill to white */
  }

  /* Target background rects specifically */
  .gantt-chart-wrapper rect:not([height="30"]):not([class*="bar"]) {
    fill: #ffffff !important;
  }

  /* Header Styling */
  .gantt-chart-wrapper [class*="calendar"],
  .gantt-chart-wrapper .calendar {
    fill: #f8f9fa !important;
  }

  .gantt-chart-wrapper [class*="calendar"] rect,
  .gantt-chart-wrapper .calendar rect {
    fill: #f8f9fa !important;
    stroke: #e0e0e0 !important;
  }

  .gantt-chart-wrapper [class*="calendar"] text,
  .gantt-chart-wrapper .calendar text {
    fill: #3c4043 !important;
    font-weight: 800 !important;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 11px;
    dominant-baseline: middle;
  }

  /* Grid Lines */
  .gantt-chart-wrapper line {
    stroke: #f1f3f4 !important;
  }

  /* Task List (Left Side) */
  .gantt-chart-wrapper div:first-child:not(svg) {
    background-color: #ffffff !important;
    border-right: 1px solid #e0e0e0 !important;
  }

  .gantt-chart-wrapper div:first-child:not(svg) div {
    border-bottom: 1px solid #f1f3f4 !important;
    color: #3c4043 !important;
    font-weight: 500 !important;
  }

  /* Bar Hover Effects */
  .bar-wrapper:hover .bar-main {
    filter: brightness(0.95);
    cursor: pointer;
  }

  /* Ensure the today line is visible but subtle */
  .gantt-chart-wrapper .today {
    fill: rgba(25, 118, 210, 0.05) !important;
  }

  /* Ensure task names in bars are visible */
  .gantt-chart-wrapper text[class*="bar"] {
    fill: #ffffff !important;
    font-weight: 600 !important;
  }
`;

const ProjectDetails = () => {
    const { id } = useParams();
    const queryClient = useQueryClient();

    // UI state
    const [tab, setTab] = useState(0);
    const [openTaskForm, setOpenTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode] = useState(ViewMode.Month);
    const [fullView, setFullView] = useState(false);
    const [downloadAnchor, setDownloadAnchor] = useState(null);
    const [analyticsKey, setAnalyticsKey] = useState(0);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Queries
    const { data: project } = useQuery({
        queryKey: ['project', id],
        queryFn: () => api.get(`/projects/${id}/`),
        enabled: !!id
    });

    const { data: rawTasks = [], isLoading: tasksLoading } = useQuery({
        queryKey: ['projectTasks', id],
        queryFn: () => api.get(`/pm/tasks/critical_path/?project_id=${id}`),
        enabled: !!id
    });

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/users/users/')
    });

    const cpmData = rawTasks;

    // Memoized gantt tasks
    const tasks = useMemo(() => {
        if (!rawTasks.length) return [];
        return rawTasks.map(t => {
            const start = new Date(t.start_date);
            const end = new Date(start);
            end.setDate(start.getDate() + (t.duration || 1));

            return {
                start: start,
                end: end,
                name: t.name,
                id: String(t.id),
                type: 'task',
                progress: 0,
                isDisabled: false,
                dependencies: [],
                styles: {
                    progressColor: t.is_critical ? '#b71c1c' : '#0d47a1',
                    progressSelectedColor: t.is_critical ? '#8e0000' : '#002171',
                    backgroundColor: t.is_critical ? '#ff8a80' : '#82b1ff',
                    backgroundSelectedColor: t.is_critical ? '#ff5252' : '#448aff'
                },
            };
        });
    }, [rawTasks]);

    // Mutations
    const saveTaskMutation = useMutation({
        mutationFn: (payload) => editingTask
            ? api.put(`/pm/tasks/${editingTask.id}/`, payload)
            : api.post('/pm/tasks/', payload),
        onSuccess: (data) => {
            console.log('Task saved successfully in project details:', data);
            queryClient.invalidateQueries({ queryKey: ['projectTasks', id] });
            setOpenTaskForm(false);
            setEditingTask(null);
            setRefreshTrigger(prev => prev + 1);
        },
        onError: (err) => {
            console.error('Error saving task in project details:', err);
            alert(`Failed to save task: ${err.message}`);
        }
    });

    const deleteTaskMutation = useMutation({
        mutationFn: (taskId) => api.delete(`/pm/tasks/${taskId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projectTasks', id] });
            setDeleteModalOpen(false);
            setTaskToDelete(null);
            setRefreshTrigger(prev => prev + 1);
        },
        onError: (err) => console.error('Error deleting task:', err)
    });

    const updateTaskStatusMutation = useMutation({
        mutationFn: ({ taskId, status }) => {
            console.log('ProjectDetails: Updating task', taskId, 'to status', status);
            return api.patch(`/pm/tasks/${taskId}/`, { status });
        },
        onSuccess: (data) => {
            console.log('Task status updated successfully in project details:', data);
            queryClient.invalidateQueries({ queryKey: ['projectTasks', id] });
            setRefreshTrigger(prev => prev + 1);
        },
        onError: (err) => {
            console.error('Error updating task status in project details:', err);
            alert(`Failed to move task: ${err.message}`);
        }
    });

    const ganttRef = useRef(null);
    const cpmRef = useRef(null);
    const taskGridRef = useRef(null);
    const networkRef = useRef(null);

    const handleDownload = (ref, filename) => {
        if (!ref.current) return;
        setDownloadAnchor(null);

        // For Gantt, we want to capture the entire scrollable area
        const isGantt = filename.includes('gantt');
        const target = isGantt ? ref.current.querySelector('.gantt-chart-wrapper') || ref.current : ref.current;

        const originalStyle = target.style.cssText;
        if (isGantt) {
            target.style.height = 'auto';
            target.style.overflow = 'visible';
            target.style.width = 'max-content';
        }

        toPng(target, { backgroundColor: '#ffffff', cacheBust: true })
            .then((dataUrl) => {
                if (isGantt) target.style.cssText = originalStyle;
                const link = document.createElement('a');
                link.download = `${filename}-${new Date().getTime()}.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch(err => {
                if (isGantt) target.style.cssText = originalStyle;
                console.error('Download failed', err);
            });
    };

    const handleCSVExport = (data, filename) => {
        if (!data || data.length === 0) return;
        setDownloadAnchor(null);

        const columns = ['name', 'duration', 'es', 'ef', 'ls', 'lf', 'slack', 'is_critical'];
        const headers = columns.map(c => c.toUpperCase().replace('_', ' ')).join(',');

        const rows = data.map(row =>
            columns.map(col => `"${row[col] ?? ''}"`).join(',')
        ).join('\n');

        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${filename}-${new Date().getTime()}.csv`);
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
        setRefreshTrigger(prev => prev + 1);
    };

    const handleTaskSave = (taskData) => {
        saveTaskMutation.mutate({ ...taskData, project: Number(id) });
    };

    const handleTaskDelete = (task) => {
        setTaskToDelete(task);
        setDeleteModalOpen(true);
    };

    const handleConfirmDeleteTask = () => {
        if (taskToDelete) {
            deleteTaskMutation.mutate(taskToDelete.id);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('project', id);

        // Get CSRF token
        const getCookie = (name) => {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        };

        const csrftoken = getCookie('csrftoken');
        const headers = {};
        if (csrftoken) {
            headers['X-CSRFToken'] = csrftoken;
        }

        fetch('http://localhost:8000/api/files/', {
            method: 'POST',
            headers: headers,
            body: formData,
            credentials: 'include'
        }).then(() => fetchProjectData());
    };

    const handleFileDelete = (fileId) => {
        if (window.confirm("Delete file?")) {
            api.delete(`/files/${fileId}/`)
                .then(() => fetchProjectData());
        }
    }

    if (!project) return <div>Loading...</div>;

    return (
        <Box sx={{ p: 4, maxWidth: 1600, margin: '0 auto', bgcolor: '#fcfcfc', minHeight: '100vh' }}>
            <style>{ganttStyles}</style>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: '#1a237e', letterSpacing: -1 }}>
                        {project.name}
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary" sx={{ fontWeight: 500 }}>
                        Project Intelligence & Timeline
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => { setEditingTask(null); setOpenTaskForm(true); }}
                        sx={{ borderRadius: 3, px: 3, py: 1, fontWeight: 700, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
                    >
                        Add Task
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={(e) => setDownloadAnchor(e.currentTarget)}
                        sx={{ borderRadius: 3, px: 3, fontWeight: 700, boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)' }}
                    >
                        Export Report
                    </Button>
                    <Menu
                        anchorEl={downloadAnchor}
                        open={Boolean(downloadAnchor)}
                        onClose={() => setDownloadAnchor(null)}
                        PaperProps={{ sx: { borderRadius: 2, mt: 1, minWidth: 180 } }}
                    >
                        <MenuItem onClick={() => handleDownload(ganttRef, 'gantt-chart')}>
                            <DownloadIcon sx={{ mr: 1, fontSize: 18 }} /> Gantt Chart
                        </MenuItem>
                        <MenuItem onClick={() => handleDownload(networkRef, 'network-diagram')}>
                            <DownloadIcon sx={{ mr: 1, fontSize: 18 }} /> Network Diagram
                        </MenuItem>
                        <MenuItem onClick={() => handleDownload(cpmRef, 'cpm-analysis')}>
                            <DownloadIcon sx={{ mr: 1, fontSize: 18 }} /> CPM Analysis
                        </MenuItem>
                        <MenuItem onClick={() => handleDownload(taskGridRef, 'task-repository')}>
                            <DownloadIcon sx={{ mr: 1, fontSize: 18 }} /> Task Repository
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={() => handleCSVExport(cpmData, 'cpm-analysis-data')}>
                            <DownloadIcon sx={{ mr: 1, fontSize: 18 }} /> CPM Data (CSV)
                        </MenuItem>
                    </Menu>
                    <Button
                        variant="outlined"
                        onClick={fetchProjectData}
                        sx={{ borderRadius: 3, px: 3, fontWeight: 600 }}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Overview" />
                    <Tab label="Tasks" />
                    <Tab label="Timeline & Analysis" />
                    <Tab label="Network Diagram" />
                    <Tab label="Team" />
                    <Tab label="Milestones" />
                    <Tab label="Budget" />
                    <Tab label="Analytics" />
                    <Tab label="Files" />
                </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
                <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
                    <Card elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: '#1a237e' }}>Project Description</Typography>
                        <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                            {project.description || "No description provided for this project."}
                        </Typography>
                    </Card>
                </Box>

                <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
                    <ProjectTasksTab
                        tasks={rawTasks}
                        onAddTask={() => { setEditingTask(null); setOpenTaskForm(true); }}
                        onEditTask={(task) => { setEditingTask(task); setOpenTaskForm(true); }}
                        onDeleteTask={handleTaskDelete}
                        onStatusChange={(taskId, status) => updateTaskStatusMutation.mutate({ taskId, status })}
                        users={users}
                    />
                </Box>

                <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
                                <CardHeader
                                    title="Project Timeline (Gantt)"
                                    titleTypographyProps={{ variant: 'h6', fontWeight: 800 }}
                                    action={
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Button
                                                size="small"
                                                variant={fullView ? "contained" : "outlined"}
                                                onClick={() => setFullView(!fullView)}
                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                                            >
                                                {fullView ? "Exit Full View" : "Full View"}
                                            </Button>
                                            <ToggleButtonGroup
                                                value={viewMode}
                                                exclusive
                                                onChange={(e, nextView) => nextView && setViewMode(nextView)}
                                                size="small"
                                                sx={{ bgcolor: 'background.paper' }}
                                            >
                                                <ToggleButton value={ViewMode.Day}>
                                                    <Tooltip title="Day View"><DayIcon fontSize="small" /></Tooltip>
                                                </ToggleButton>
                                                <ToggleButton value={ViewMode.Week}>
                                                    <Tooltip title="Week View"><WeekIcon fontSize="small" /></Tooltip>
                                                </ToggleButton>
                                                <ToggleButton value={ViewMode.Month}>
                                                    <Tooltip title="Month View"><CalendarIcon fontSize="small" /></Tooltip>
                                                </ToggleButton>
                                                <ToggleButton value={ViewMode.Year}>
                                                    <Tooltip title="Year View"><YearIcon fontSize="small" /></Tooltip>
                                                </ToggleButton>
                                            </ToggleButtonGroup>
                                        </Stack>
                                    }
                                />
                                <Divider />
                                <CardContent sx={{ p: 0 }} ref={ganttRef}>
                                    {tasks.length > 0 ? (
                                        <Box className="gantt-chart-wrapper" sx={{
                                            height: fullView ? 'auto' : 600,
                                            overflow: fullView ? 'visible' : 'auto',
                                            bgcolor: '#ffffff',
                                            '& .gantt-container': {
                                                fontFamily: 'inherit'
                                            }
                                        }}>
                                            <Gantt
                                                tasks={tasks}
                                                viewMode={viewMode}
                                                listCellWidth="200px"
                                                columnWidth={viewMode === ViewMode.Year ? 150 : viewMode === ViewMode.Month ? 100 : 60}
                                                barCornerRadius={6}
                                                handleWidth={8}
                                                fontFamily="inherit"
                                                fontSize="12px"
                                                headerHeight={50}
                                                rowHeight={50}
                                                todayColor="rgba(25, 118, 210, 0.1)"
                                            />
                                        </Box>
                                    ) : (
                                        <Box sx={{ p: 6, textAlign: 'center' }}>
                                            <Typography color="textSecondary" variant="h6">No tasks scheduled yet.</Typography>
                                            <Typography color="textSecondary">Add tasks to see the project timeline.</Typography>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {cpmData.length > 0 && (
                            <Grid item xs={12} ref={cpmRef} sx={{ bgcolor: '#ffffff', p: 2, borderRadius: 4 }}>
                                <Card elevation={3} sx={{ borderRadius: 4, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                                    <CardHeader
                                        avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><TrendingUpIcon /></Avatar>}
                                        title="Critical Path Analysis"
                                        titleTypographyProps={{ variant: 'h6', fontWeight: 800 }}
                                        action={
                                            <Tooltip title="CPM identifies the longest sequence of dependent tasks and the shortest possible project duration.">
                                                <IconButton><InfoIcon /></IconButton>
                                            </Tooltip>
                                        }
                                    />
                                    <Divider />
                                    <CardContent sx={{ p: 3 }}>
                                        <Box>
                                            <Grid container spacing={2} sx={{ mb: 4 }}>
                                                <Grid item xs={12} md={4}>
                                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff5f5', border: '1px solid #ffcdd2' }}>
                                                        <Avatar sx={{ bgcolor: '#ff5252' }}><TimerIcon /></Avatar>
                                                        <Box>
                                                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Project Duration</Typography>
                                                            <Typography variant="h5" sx={{ fontWeight: 900 }}>{Math.max(...cpmData.map(t => t.ef || 0))} Days</Typography>
                                                        </Box>
                                                    </Paper>
                                                </Grid>
                                                <Grid item xs={12} md={4}>
                                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#f0f4ff', border: '1px solid #d1d9ff' }}>
                                                        <Avatar sx={{ bgcolor: '#448aff' }}><AccountTreeIcon /></Avatar>
                                                        <Box>
                                                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Critical Tasks</Typography>
                                                            <Typography variant="h5" sx={{ fontWeight: 900 }}>{cpmData.filter(t => t.is_critical).length}</Typography>
                                                        </Box>
                                                    </Paper>
                                                </Grid>
                                                <Grid item xs={12} md={4}>
                                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff9f0', border: '1px solid #ffe0b2' }}>
                                                        <Avatar sx={{ bgcolor: '#ff9800' }}><WarningIcon /></Avatar>
                                                        <Box>
                                                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Total Slack</Typography>
                                                            <Typography variant="h5" sx={{ fontWeight: 900 }}>{cpmData.reduce((acc, t) => acc + (t.slack || 0), 0)} Days</Typography>
                                                        </Box>
                                                    </Paper>
                                                </Grid>
                                            </Grid>

                                            <Box sx={{ mb: 4 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <TrendingUpIcon fontSize="small" color="error" /> CRITICAL PATH SEQUENCE
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', rowGap: 2, pb: 1 }}>
                                                    {rawTasks
                                                        .filter(t => t.is_critical)
                                                        .sort((a, b) => a.es - b.es)
                                                        .map((t, index, array) => (
                                                            <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Chip label={t.name} color="error" variant="filled" sx={{ fontWeight: 700, borderRadius: 2, px: 1 }} />
                                                                {index < array.length - 1 && <ArrowForwardIcon sx={{ color: '#bdbdbd', fontSize: 16 }} />}
                                                            </Box>
                                                        ))
                                                    }
                                                </Box>
                                            </Box>

                                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                                <Table size="small">
                                                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                                                        <TableRow>
                                                            <TableCell sx={{ fontWeight: 800 }}>TASK NAME</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 800 }}>DUR</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 800, color: 'primary.main' }}>ES</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 800, color: 'primary.main' }}>EF</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 800, color: 'secondary.main' }}>LS</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 800, color: 'secondary.main' }}>LF</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 800 }}>SLACK</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 800 }}>STATUS</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {cpmData.map((row) => (
                                                            <TableRow key={row.id} sx={{ bgcolor: row.is_critical ? 'rgba(211, 47, 47, 0.02)' : 'inherit', '&:hover': { bgcolor: '#f5f5f5' } }}>
                                                                <TableCell sx={{ fontWeight: row.is_critical ? 700 : 500 }}>{row.name}</TableCell>
                                                                <TableCell align="center">{row.duration}d</TableCell>
                                                                <TableCell align="center" sx={{ color: 'primary.dark', fontWeight: 600 }}>{row.es}</TableCell>
                                                                <TableCell align="center" sx={{ color: 'primary.dark', fontWeight: 600 }}>{row.ef}</TableCell>
                                                                <TableCell align="center" sx={{ color: 'secondary.dark', fontWeight: 600 }}>{row.ls}</TableCell>
                                                                <TableCell align="center" sx={{ color: 'secondary.dark', fontWeight: 600 }}>{row.lf}</TableCell>
                                                                <TableCell align="center">
                                                                    <Chip label={`${row.slack}d`} size="small" variant="outlined" color={row.slack === 0 ? "error" : "default"} sx={{ fontWeight: 700, minWidth: 45 }} />
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    {row.is_critical ? (
                                                                        <Chip label="CRITICAL" color="error" size="small" sx={{ fontWeight: 900, fontSize: '0.65rem' }} />
                                                                    ) : (
                                                                        <Chip label="NON-CRITICAL" variant="outlined" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', color: 'text.secondary' }} />
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                </Box>

                {tab === 3 && (
                    <Box sx={{ height: '80vh', p: 2 }}>
                        <NetworkDiagram tasks={cpmData} ref={networkRef} />
                    </Box>
                )}

                {tab === 4 && (
                    <Box>
                        <TeamTab tasks={rawTasks} users={users} />
                    </Box>
                )}

                {tab === 5 && (
                    <Box>
                        <MilestonesTab projectId={id} />
                    </Box>
                )}

                {tab === 6 && (
                    <Box>
                        <BudgetTab projectId={id} startDate={project.start_date} endDate={project.end_date} />
                    </Box>
                )}

                {tab === 7 && (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800 }}>Analytics Dashboard</Typography>
                            <Button
                                variant="outlined"
                                onClick={() => setAnalyticsKey(prev => prev + 1)}
                                sx={{ borderRadius: 2, fontWeight: 600 }}
                            >
                                Refresh
                            </Button>
                        </Box>
                        {project.powerbi_embed_url ? (
                            <iframe
                                key={analyticsKey}
                                title="Analytics Dashboard"
                                width="100%"
                                height="600"
                                src={project.powerbi_embed_url}
                                frameBorder="0"
                                allowFullScreen={true}
                            ></iframe>
                        ) : (
                            <Typography>No Analytics Dashboard URL configured for this project.</Typography>
                        )}
                    </Box>
                )}

                {tab === 8 && (
                    <Box>
                        <FileTree projectId={id} refreshTrigger={refreshTrigger} />
                    </Box>
                )}
            </Box>

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
