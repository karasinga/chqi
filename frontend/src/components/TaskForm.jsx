import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, MenuItem, FormControl, InputLabel, Select,
    Chip, Box, Typography, InputAdornment, Avatar, Divider, Stack,
    Grid, Tooltip, ToggleButton, ToggleButtonGroup, Accordion,
    AccordionSummary, AccordionDetails, Paper, IconButton, Alert,
} from '@mui/material';
import {
    Assignment as TaskIcon,
    Timer as TimerIcon,
    AccountTree as DependencyIcon,
    Flag as PriorityIcon,
    Person as AssigneeIcon,
    Info as StatusIcon,
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Diamond as MilestoneIcon,
    Schedule as ScheduleIcon,
    Warning as WarningIcon,
    CheckCircle as CriticalIcon,
} from '@mui/icons-material';
import api from '../utils/api';

// ─── Brand tokens ───────────────────────────────────────────────
const tok = {
    primary: '#182F5B',
    accent: '#1BACA7',
    critical: '#c62828',
    criticalBg: '#fef2f2',
    warning: '#f59e0b',
    surface: '#ffffff',
    bg: '#fafbfc',
};

// ─── CPM Results Card ────────────────────────────────────────────
const CpmResultsCard = ({ task }) => {
    if (!task?.early_start && !task?.es) return null;

    const es = task.early_start || task.es;
    const ef = task.early_finish || task.ef;
    const ls = task.late_start || task.ls;
    const lf = task.late_finish || task.lf;
    const tf = task.total_float ?? task.slack;
    const ff = task.free_float;
    const isCritical = task.is_critical;

    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

    return (
        <Paper variant="outlined" sx={{
            p: 2, borderRadius: 3,
            bgcolor: isCritical ? tok.criticalBg : '#f0faf9',
            border: `1.5px solid ${isCritical ? '#fecaca' : '#b2dfdb'}`,
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: tok.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                    CPM Calculated Results
                </Typography>
                <Chip
                    size="small"
                    icon={isCritical ? <CriticalIcon sx={{ fontSize: 14 }} /> : null}
                    label={isCritical ? 'Critical Path 🔴' : 'Non-Critical'}
                    sx={{
                        fontWeight: 700, fontSize: '0.65rem',
                        bgcolor: isCritical ? tok.critical : tok.accent,
                        color: 'white',
                    }}
                />
            </Box>
            <Grid container spacing={1.5}>
                {[
                    { label: 'Early Start', value: fmt(es), color: tok.accent },
                    { label: 'Early Finish', value: fmt(ef), color: tok.accent },
                    { label: 'Late Start', value: fmt(ls), color: '#e65100' },
                    { label: 'Late Finish', value: fmt(lf), color: '#e65100' },
                    { label: 'Total Float', value: tf != null ? `${tf} day${tf !== 1 ? 's' : ''}` : '—', color: tok.primary },
                    { label: 'Free Float', value: ff != null ? `${ff} day${ff !== 1 ? 's' : ''}` : '—', color: tok.primary },
                ].map(({ label, value, color }) => (
                    <Grid item xs={6} key={label}>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                {label}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color }}>
                                {value}
                            </Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
};

// ─── Dependency Row ──────────────────────────────────────────────
const DEP_TYPES = [
    { value: 'FS', label: 'FS — Finish to Start' },
    { value: 'SS', label: 'SS — Start to Start' },
    { value: 'FF', label: 'FF — Finish to Finish' },
    { value: 'SF', label: 'SF — Start to Finish' },
];

const DependencyRow = ({ dep, index, allTasks, currentTaskId, onChange, onRemove }) => (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
        <FormControl size="small" sx={{ flex: 2, minWidth: 0 }}>
            <InputLabel>Predecessor</InputLabel>
            <Select
                value={dep.predecessor_id || ''}
                label="Predecessor"
                onChange={(e) => onChange(index, 'predecessor_id', Number(e.target.value))}
            >
                {allTasks
                    .filter(t => t.id !== currentTaskId)
                    .map(t => {
                        const indent = '\u00A0\u00A0'.repeat(t._depth || 0);
                        return (
                            <MenuItem key={t.id} value={t.id}>
                                {indent}{t.wbs_code ? `${t.wbs_code} — ` : ''}{t.name}
                            </MenuItem>
                        );
                    })}
            </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: 1, minWidth: 90 }}>
            <InputLabel>Type</InputLabel>
            <Select
                value={dep.type || 'FS'}
                label="Type"
                onChange={(e) => onChange(index, 'type', e.target.value)}
            >
                {DEP_TYPES.map(d => (
                    <MenuItem key={d.value} value={d.value}>{d.value}</MenuItem>
                ))}
            </Select>
        </FormControl>
        <TextField
            size="small"
            label="Lag (d)"
            type="number"
            value={dep.lag ?? 0}
            onChange={(e) => onChange(index, 'lag', Number(e.target.value))}
            sx={{ width: 72 }}
            inputProps={{ step: 1 }}
        />
        <IconButton size="small" onClick={() => onRemove(index)} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
        </IconButton>
    </Box>
);

// ─── Build flatten tree for dropdowns ──────────────────────────────
function buildTreeFlat(tasks) {
    const map = {};
    const roots = [];
    tasks.forEach(t => { map[t.id] = { ...t, _children: [] }; });
    tasks.forEach(t => {
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

    const flat = [];
    const flatten = (node, depth) => {
        flat.push({ ...node, _depth: depth });
        node._children.forEach(c => flatten(c, depth + 1));
    };
    rootNodes.forEach(n => flatten(n, 0));
    return flat;
}

// ─── Main Component ───────────────────────────────────────────────
const TaskForm = ({ open, onClose, onSave, task, allTasks = [], projects = [], defaultProjectId = null, viewMode = false }) => {
    const queryClient = useQueryClient();

    const blankForm = {
        name: '',
        description: '',
        project: defaultProjectId || '',
        task_type: 'work_package',
        wbs_code: '',
        parent_task: '',
        sort_order: 0,
        duration: 1,
        task_dependencies: [],   // [{predecessor_id, type, lag}]
        // legacy field kept for backward compat but not shown as editable
        dependencies: [],
        status: 'todo',
        priority: 'medium',
        constraint_type: 'as_soon_as_possible',
        constraint_date: '',
        assignee: '',
        notes: '',
    };

    const [formData, setFormData] = useState(blankForm);
    const [newComment, setNewComment] = useState('');
    const [validation, setValidation] = useState(null); // {errors, warnings}

    // ── Data queries ────────────────────────────────────────────
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/users/users/'),
    });
    const { data: comments = [] } = useQuery({
        queryKey: ['comments', task?.id],
        queryFn: () => api.get(`/pm/comments/?task=${task.id}`),
        enabled: !!task?.id && open,
    });

    // ── Comment mutation ────────────────────────────────────────
    const addCommentMutation = useMutation({
        mutationFn: (content) => api.post('/pm/comments/', { task: task.id, content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', task?.id] });
            setNewComment('');
        },
    });

    // ── Populate form when task prop changes ────────────────────
    useEffect(() => {
        if (task) {
            // Build task_dependencies from predecessor_deps (new model) OR legacy deps
            let initialDeps = [];
            if (task.predecessor_deps && task.predecessor_deps.length > 0) {
                initialDeps = task.predecessor_deps.map(d => ({
                    predecessor_id: d.predecessor_task,
                    type: d.type || 'FS',
                    lag: d.lag || 0,
                }));
            } else if (task.dependencies && task.dependencies.length > 0) {
                initialDeps = task.dependencies.map(id => ({
                    predecessor_id: Number(id),
                    type: 'FS',
                    lag: 0,
                }));
            }
            setFormData({
                ...blankForm,
                ...task,
                project: task.project || '',
                task_type: task.task_type || 'work_package',
                wbs_code: task.wbs_code || '',
                parent_task: task.parent_task || '',
                task_dependencies: initialDeps,
                dependencies: task.dependencies || [],
                status: task.status || 'todo',
                priority: task.priority || 'medium',
                constraint_type: task.constraint_type || 'as_soon_as_possible',
                constraint_date: task.constraint_date || '',
                assignee: task.assignee || '',
                notes: task.notes || '',
            });
            // Show any validation warnings from task data
            if (task._validation) setValidation(task._validation);
        } else {
            setFormData({ ...blankForm, project: defaultProjectId || '' });
            setValidation(null);
        }
    }, [task, open, defaultProjectId]);

    // ── Handlers ────────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates = { [name]: value };
            // Milestones always have duration 0
            if (name === 'task_type' && value === 'milestone') updates.duration = 0;
            // Summary tasks don't need a user-set duration
            if (name === 'project') updates.task_dependencies = [];
            return { ...prev, ...updates };
        });
    };

    const handleDepChange = (idx, field, val) => {
        setFormData(prev => {
            const deps = [...prev.task_dependencies];
            deps[idx] = { ...deps[idx], [field]: val };
            return { ...prev, task_dependencies: deps };
        });
    };

    const addDep = () => setFormData(prev => ({
        ...prev,
        task_dependencies: [...prev.task_dependencies, { predecessor_id: '', type: 'FS', lag: 0 }],
    }));

    const removeDep = (idx) => setFormData(prev => ({
        ...prev,
        task_dependencies: prev.task_dependencies.filter((_, i) => i !== idx),
    }));

    const handleSubmit = () => {
        // Build clean payload
        const cleanDeps = formData.task_dependencies
            .filter(d => d.predecessor_id)
            .map(d => ({ predecessor_id: Number(d.predecessor_id), type: d.type || 'FS', lag: Number(d.lag || 0) }));

        const cleanData = {
            name: formData.name,
            project: Number(formData.project),
            task_type: formData.task_type,
            wbs_code: formData.wbs_code || '',
            parent_task: formData.parent_task ? Number(formData.parent_task) : null,
            sort_order: Number(formData.sort_order || 0),
            duration: formData.task_type === 'milestone' ? 0 : Number(formData.duration || 1),
            task_dependencies: cleanDeps,
            // Keep legacy dependencies field populated too (backward compat)
            dependencies: cleanDeps.map(d => d.predecessor_id),
            status: formData.status,
            priority: formData.priority,
            constraint_type: formData.constraint_type || 'as_soon_as_possible',
            constraint_date: formData.constraint_date || null,
            assignee: formData.assignee ? Number(formData.assignee) : null,
            description: formData.description || '',
            notes: formData.notes || '',
        };
        onSave(cleanData);
    };

    // ── Derived state ───────────────────────────────────────────
    const isMilestone = formData.task_type === 'milestone';
    const isSummary = formData.task_type === 'summary_task';
    const isWorkPackage = formData.task_type === 'work_package';

    // Get raw project tasks, then sort hierarchically
    const rawProjectTasks = allTasks.filter(t =>
        t.project === Number(formData.project) || t.project === formData.project
    );
    const projectTasks = buildTreeFlat(rawProjectTasks);
    const summaryTasks = projectTasks.filter(t => t.task_type === 'summary_task');
    const constraintNeedsDate = formData.constraint_type && formData.constraint_type !== 'as_soon_as_possible';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
        >
            {/* ── Header ─────────────────────────────────────── */}
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: isMilestone ? tok.warning : tok.accent, width: 40, height: 40 }}>
                        {isMilestone ? <MilestoneIcon /> : <TaskIcon />}
                    </Avatar>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>
                            {viewMode ? 'Task Details' : (task ? 'Edit Task' : 'Create New Task')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {viewMode
                                ? 'View-only. Add comments below.'
                                : 'Duration and dependencies drive the schedule — dates are calculated automatically.'}
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>
            <Divider />

            <DialogContent sx={{ mt: 1.5 }}>
                <Stack spacing={2.5}>

                    {/* ── Validation feedback ─────────────────── */}
                    {validation?.errors?.length > 0 && (
                        <Stack spacing={1}>
                            {validation.errors.map((e, i) => (
                                <Alert key={i} severity="error" icon={<WarningIcon fontSize="small" />} sx={{ py: 0.5, borderRadius: 2 }}>
                                    {e}
                                </Alert>
                            ))}
                        </Stack>
                    )}
                    {validation?.warnings?.length > 0 && (
                        <Stack spacing={1}>
                            {validation.warnings.map((w, i) => (
                                <Alert key={i} severity="warning" icon={<WarningIcon fontSize="small" />} sx={{ py: 0.5, borderRadius: 2 }}>
                                    {w}
                                </Alert>
                            ))}
                        </Stack>
                    )}

                    {/* ── Task Type ───────────────────────────── */}
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Task Type
                        </Typography>
                        <ToggleButtonGroup
                            value={formData.task_type}
                            exclusive
                            onChange={(_, v) => {
                                if (!v) return;
                                setFormData(prev => {
                                    let newDuration = prev.duration;
                                    if (v === 'milestone') newDuration = 0;
                                    if (v === 'work_package' && (prev.task_type === 'milestone' || prev.task_type === 'summary_task')) {
                                        newDuration = 1;
                                    }
                                    return {
                                        ...prev,
                                        task_type: v,
                                        duration: newDuration
                                    };
                                });
                            }}
                            disabled={viewMode}
                            size="small"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    px: 2,
                                    borderRadius: 2,
                                    border: '1px solid #e0e0e0',
                                    mx: 0.5
                                },
                                '& .Mui-selected': {
                                    bgcolor: `${tok.accent}15 !important`,
                                    color: `${tok.accent} !important`,
                                    borderColor: `${tok.accent} !important`
                                }
                            }}
                        >
                            <ToggleButton value="work_package">📦 Work Package</ToggleButton>
                            <ToggleButton value="milestone">◆ Milestone</ToggleButton>
                            <ToggleButton value="summary_task">📁 Summary Task</ToggleButton>
                        </ToggleButtonGroup>

                        {/* ── Type Info Box ──────────────────────── */}
                        <Paper
                            elevation={0}
                            sx={{
                                mt: 1.5, p: 1.2, borderRadius: 3,
                                bgcolor: isSummary ? `${tok.primary}08` : `${tok.accent}08`,
                                border: `1px dashed ${isSummary ? `${tok.primary}30` : `${tok.accent}30`}`,
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Stack direction="row" spacing={1.2} alignItems="center">
                                <Typography sx={{ fontSize: '1.2rem' }}>
                                    {isMilestone ? '◆' : isSummary ? '📁' : '📦'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.3 }}>
                                    {isMilestone && "Milestones mark key dates/checkpoints. They always have 0 duration."}
                                    {isSummary && "Summary tasks group other tasks together. Duration is auto-calculated."}
                                    {isWorkPackage && "Work packages are standard activities with a defined duration."}
                                </Typography>
                            </Stack>
                        </Paper>
                    </Box>

                    {/* ── Name + WBS ──────────────────────────── */}
                    <Grid container spacing={2}>
                        <Grid item xs={8}>
                            <TextField
                                autoFocus={!viewMode}
                                name="name"
                                label="Task Name *"
                                fullWidth
                                value={formData.name}
                                onChange={handleChange}
                                disabled={viewMode}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                name="wbs_code"
                                label="WBS Code"
                                fullWidth
                                placeholder="e.g. 1.2.3"
                                value={formData.wbs_code}
                                onChange={handleChange}
                                disabled={viewMode}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                        </Grid>
                    </Grid>

                    {/* ── Description ─────────────────────────── */}
                    <TextField
                        name="description"
                        label="Description"
                        fullWidth
                        multiline
                        rows={2}
                        value={formData.description}
                        onChange={handleChange}
                        disabled={viewMode}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />

                    {/* ── Project + Parent ────────────────────── */}
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                <InputLabel>Project</InputLabel>
                                <Select
                                    name="project"
                                    value={formData.project}
                                    onChange={handleChange}
                                    label="Project"
                                    disabled={viewMode || !!defaultProjectId}
                                >
                                    <MenuItem value=""><em>Select Project</em></MenuItem>
                                    {projects.map(p => (
                                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                <InputLabel>Parent Task (Summary)</InputLabel>
                                <Select
                                    name="parent_task"
                                    value={formData.parent_task || ''}
                                    onChange={handleChange}
                                    label="Parent Task (Summary)"
                                    disabled={viewMode}
                                >
                                    <MenuItem value="">None (Top Level)</MenuItem>
                                    {summaryTasks
                                        .filter(t => t.id !== task?.id)
                                        .map(t => {
                                            const indent = '\u00A0\u00A0'.repeat(t._depth || 0);
                                            return (
                                                <MenuItem key={t.id} value={t.id}>
                                                    {indent}{t.wbs_code ? `${t.wbs_code} — ` : ''}{t.name}
                                                </MenuItem>
                                            );
                                        })}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    {/* ── Duration + Status + Priority ─────────── */}
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Tooltip title={isMilestone ? "Milestones have 0 duration" : isSummary ? "Duration auto-calculated from children" : ""}>
                                <TextField
                                    name="duration"
                                    label="Duration (working days)"
                                    type="number"
                                    fullWidth
                                    value={isMilestone ? 0 : formData.duration}
                                    onChange={handleChange}
                                    disabled={viewMode || isMilestone || isSummary}
                                    inputProps={{ min: isMilestone ? 0 : 1 }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                    helperText={isSummary ? 'Auto' : isMilestone ? '0 (milestone)' : undefined}
                                />
                            </Tooltip>
                        </Grid>
                        <Grid item xs={4}>
                            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                <InputLabel>Status</InputLabel>
                                <Select name="status" value={formData.status} onChange={handleChange} label="Status" disabled={viewMode}>
                                    <MenuItem value="todo">To Do</MenuItem>
                                    <MenuItem value="in_progress">In Progress</MenuItem>
                                    <MenuItem value="review">Review</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={4}>
                            <Tooltip title={formData.is_critical ? "Auto-assigned: task is on the Critical Path" : ""}>
                                <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleChange}
                                        label="Priority"
                                        disabled={viewMode}
                                    >
                                        <MenuItem value="low">Low</MenuItem>
                                        <MenuItem value="medium">Medium</MenuItem>
                                        <MenuItem value="high">High</MenuItem>
                                        <MenuItem value="critical">Critical</MenuItem>
                                    </Select>
                                </FormControl>
                            </Tooltip>
                        </Grid>
                    </Grid>

                    {/* ── Assignee ─────────────────────────────── */}
                    <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                        <InputLabel>Assignee</InputLabel>
                        <Select
                            name="assignee"
                            value={formData.assignee}
                            onChange={handleChange}
                            label="Assignee"
                            disabled={viewMode}
                            startAdornment={<AssigneeIcon sx={{ mr: 1, color: 'action.active', fontSize: 20 }} />}
                        >
                            <MenuItem value=""><em>Unassigned</em></MenuItem>
                            {users.map(u => (
                                <MenuItem key={u.id} value={u.id}>
                                    {u.first_name} {u.last_name} ({u.username})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* ── Predecessors (typed dependency rows) ─── */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tok.primary, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <DependencyIcon fontSize="small" sx={{ color: tok.accent }} />
                                Predecessors
                            </Typography>
                            {!viewMode && (
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={addDep}
                                    disabled={!formData.project}
                                    sx={{ fontWeight: 700, textTransform: 'none', color: tok.accent }}
                                >
                                    Add Predecessor
                                </Button>
                            )}
                        </Box>
                        {formData.task_dependencies.length === 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No predecessors — task starts on project start date.
                            </Typography>
                        ) : (
                            formData.task_dependencies.map((dep, idx) => (
                                <DependencyRow
                                    key={idx}
                                    dep={dep}
                                    index={idx}
                                    allTasks={projectTasks}
                                    currentTaskId={task?.id}
                                    onChange={viewMode ? () => { } : handleDepChange}
                                    onRemove={viewMode ? () => { } : removeDep}
                                />
                            ))
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Dates are computed automatically by the engine after save.
                        </Typography>
                    </Box>

                    {/* ── CPM Results (read-only) ──────────────── */}
                    {task && <CpmResultsCard task={task} />}

                    {/* ── Advanced Settings (Accordion) ───────── */}
                    <Accordion elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: '12px !important', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                ⚙️ Advanced Settings (Constraints, Notes)
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}>
                                            <InputLabel>Constraint Type</InputLabel>
                                            <Select
                                                name="constraint_type"
                                                value={formData.constraint_type}
                                                onChange={handleChange}
                                                label="Constraint Type"
                                                disabled={viewMode}
                                            >
                                                <MenuItem value="as_soon_as_possible">As Soon As Possible (Default)</MenuItem>
                                                <MenuItem value="must_start_on">Must Start On</MenuItem>
                                                <MenuItem value="start_no_earlier_than">Start No Earlier Than</MenuItem>
                                                <MenuItem value="start_no_later_than">Start No Later Than</MenuItem>
                                                <MenuItem value="must_finish_on">Must Finish On</MenuItem>
                                                <MenuItem value="finish_no_earlier_than">Finish No Earlier Than</MenuItem>
                                                <MenuItem value="finish_no_later_than">Finish No Later Than</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            size="small"
                                            name="constraint_date"
                                            label="Constraint Date"
                                            type="date"
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                            value={formData.constraint_date || ''}
                                            onChange={handleChange}
                                            disabled={viewMode || !constraintNeedsDate}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                            helperText={!constraintNeedsDate ? "Select a constraint type first" : undefined}
                                        />
                                    </Grid>
                                </Grid>
                                <TextField
                                    name="notes"
                                    label="Notes"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={formData.notes}
                                    onChange={handleChange}
                                    disabled={viewMode}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                />
                            </Stack>
                        </AccordionDetails>
                    </Accordion>

                    {/* ── Comments (existing tasks only) ──────── */}
                    {task && (
                        <Box>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DependencyIcon fontSize="small" color="primary" />
                                Team Collaboration
                            </Typography>
                            <Stack spacing={2} sx={{ mb: 2, maxHeight: 200, overflowY: 'auto', pr: 1 }}>
                                {comments.map((c, i) => (
                                    <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
                                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.light' }}>
                                            {c.username?.[0]?.toUpperCase() || 'U'}
                                        </Avatar>
                                        <Box sx={{ bgcolor: '#f8f9fa', p: 1.5, borderRadius: 3, flexGrow: 1, border: '1px solid #eee' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>{c.username}</Typography>
                                                <Typography variant="caption" color="text.secondary">{new Date(c.created_at).toLocaleDateString()}</Typography>
                                            </Box>
                                            <Typography variant="body2">{c.content}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                                {comments.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                        No comments yet. Start the conversation!
                                    </Typography>
                                )}
                            </Stack>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    fullWidth size="small"
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={() => addCommentMutation.mutate(newComment)}
                                    disabled={!newComment.trim()}
                                    sx={{ borderRadius: 3, fontWeight: 700 }}
                                >
                                    Post
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={onClose} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Close
                </Button>
                {!viewMode && (
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={!formData.name || !formData.project}
                        sx={{ borderRadius: 3, px: 4, fontWeight: 800, bgcolor: tok.accent, '&:hover': { bgcolor: '#148a86' } }}
                    >
                        {task ? 'Save Changes' : 'Create Task'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default TaskForm;
