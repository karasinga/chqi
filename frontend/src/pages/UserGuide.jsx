import React, { useState } from 'react';
import {
    Box, Typography, Paper, Grid, Chip, Divider, Stack,
    Accordion, AccordionSummary, AccordionDetails,
    Avatar, Card, CardContent, Button, Tab, Tabs, alpha,
    List, ListItem, ListItemIcon, ListItemText, Tooltip,
    IconButton, Collapse
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Dashboard as DashboardIcon,
    Assignment as AssignmentIcon,
    AccountTree as AccountTreeIcon,
    Timeline as TimelineIcon,
    BarChart as GanttIcon,
    Schema as NetworkIcon,
    Settings as SettingsIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckIcon,
    RadioButtonUnchecked as CircleIcon,
    TrendingUp as CriticalIcon,
    CalendarMonth as CalendarIcon,
    Speed as FloatIcon,
    Flag as MilestoneIcon,
    ViewKanban as KanbanIcon,
    ViewList as ListViewIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    Keyboard as KeyboardIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Download as ExportIcon,
    Lightbulb as TipIcon,
    PlayArrow as StartIcon,
} from '@mui/icons-material';

// ─────────────────────── Brand tokens ────────────────────────
const tk = {
    navy: '#182F5B',
    navyLight: '#2a4a80',
    navyLighter: '#e8ecf4',
    teal: '#1BACA7',
    tealLight: '#23d4cd',
    tealDark: '#148a86',
    tealLighter: '#e6f7f7',
    gray: '#B1AFB2',
    grayLight: '#d4d3d5',
    grayLighter: '#f7f7f8',
    critical: '#c62828',
    criticalBg: '#fef2f2',
    warning: '#e65100',
    warningBg: '#fff8f0',
    text: '#1a1a2e',
    textSecondary: '#64648c',
    textMuted: '#9e9eb8',
    surface: '#ffffff',
};

// ─────────────────────── Helper sub-components ────────────────
const SectionBadge = ({ label, color = tk.teal }) => (
    <Chip
        label={label}
        size="small"
        sx={{
            bgcolor: alpha(color, 0.12),
            color,
            fontWeight: 800,
            fontSize: '0.65rem',
            letterSpacing: '0.5px',
            height: 22,
            border: `1px solid ${alpha(color, 0.25)}`,
        }}
    />
);

const StepRow = ({ num, title, desc }) => (
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: tk.teal, fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, mt: 0.25 }}>
            {num}
        </Avatar>
        <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy, mb: 0.25 }}>{title}</Typography>
            <Typography variant="body2" sx={{ color: tk.textSecondary, lineHeight: 1.6 }}>{desc}</Typography>
        </Box>
    </Box>
);

const InfoCard = ({ icon, title, desc, color = tk.teal }) => (
    <Paper variant="outlined" sx={{
        p: 2.5, borderRadius: 3, display: 'flex', gap: 2, alignItems: 'flex-start',
        border: `1px solid ${alpha(color, 0.3)}`, bgcolor: alpha(color, 0.04),
        transition: 'all 0.2s ease',
        '&:hover': { boxShadow: `0 4px 16px ${alpha(color, 0.15)}`, borderColor: color }
    }}>
        <Avatar sx={{ bgcolor: alpha(color, 0.15), color, width: 44, height: 44 }}>{icon}</Avatar>
        <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tk.navy, mb: 0.5 }}>{title}</Typography>
            <Typography variant="body2" sx={{ color: tk.textSecondary, lineHeight: 1.6 }}>{desc}</Typography>
        </Box>
    </Paper>
);

const FieldRow = ({ field, desc, badge }) => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline', py: 0.75, borderBottom: `1px solid ${tk.navyLighter}` }}>
        <Box sx={{ minWidth: 140 }}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: tk.grayLighter, px: 0.75, py: 0.25, borderRadius: 1, fontWeight: 700, color: tk.navy, fontSize: '0.75rem' }}>
                {field}
            </Typography>
            {badge && <SectionBadge label={badge} color={badge === 'Required' ? tk.critical : tk.teal} />}
        </Box>
        <Typography variant="body2" sx={{ color: tk.textSecondary, lineHeight: 1.6 }}>{desc}</Typography>
    </Box>
);

const Callout = ({ type = 'tip', children }) => {
    const styles = {
        tip: { icon: <TipIcon fontSize="small" />, color: tk.teal, bg: tk.tealLighter },
        warning: { icon: <WarningIcon fontSize="small" />, color: tk.warning, bg: tk.warningBg },
        note: { icon: <InfoIcon fontSize="small" />, color: tk.navy, bg: tk.navyLighter },
        critical: { icon: <WarningIcon fontSize="small" />, color: tk.critical, bg: tk.criticalBg }
    };
    const s = styles[type];
    return (
        <Box sx={{ display: 'flex', gap: 1.5, p: 2, borderRadius: 2, bgcolor: s.bg, border: `1px solid ${alpha(s.color, 0.3)}`, my: 2 }}>
            <Box sx={{ color: s.color, mt: '2px', flexShrink: 0 }}>{s.icon}</Box>
            <Typography variant="body2" sx={{ color: tk.text, lineHeight: 1.6 }}>{children}</Typography>
        </Box>
    );
};

// ─────────────────────── TAB PANELS ──────────────────────────
const sections = [
    { id: 'overview', label: 'Overview', icon: <DashboardIcon fontSize="small" /> },
    { id: 'projects', label: 'Projects', icon: <AssignmentIcon fontSize="small" /> },
    { id: 'tasks', label: 'Tasks & WBS', icon: <AccountTreeIcon fontSize="small" /> },
    { id: 'cpm', label: 'CPM Scheduling', icon: <TimelineIcon fontSize="small" /> },
    { id: 'gantt', label: 'Gantt Chart', icon: <GanttIcon fontSize="small" /> },
    { id: 'network', label: 'Network Diagram', icon: <NetworkIcon fontSize="small" /> },
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon fontSize="small" /> },
    { id: 'tips', label: 'Tips & Tricks', icon: <TipIcon fontSize="small" /> },
];

// ─────────────────────── OVERVIEW ────────────────────────────
const OverviewPanel = () => (
    <Box>
        <Box sx={{ p: 4, borderRadius: 3, background: `linear-gradient(135deg, ${tk.navy} 0%, ${tk.navyLight} 100%)`, color: '#fff', mb: 4, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: alpha('#fff', 0.05) }} />
            <SectionBadge label="USER GUIDE" color="#fff" />
            <Typography variant="h4" sx={{ fontWeight: 900, mt: 2, mb: 1, letterSpacing: '-0.5px' }}>
                CHQI Project Management Platform
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, lineHeight: 1.7, maxWidth: 680 }}>
                A professional-grade project scheduling tool powered by the <strong>Critical Path Method (CPM)</strong>.
                Enter task durations and dependencies — the engine automatically computes all dates, identifies the critical path,
                and keeps your schedule up to date.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
                {['Auto-Scheduling', 'CPM Engine', 'WBS View', 'Gantt Chart', 'Network Diagram', 'Portfolio Dashboard'].map(f => (
                    <Chip key={f} label={f} size="small" sx={{ bgcolor: alpha('#fff', 0.15), color: '#fff', fontWeight: 700, fontSize: '0.7rem', border: `1px solid ${alpha('#fff', 0.3)}` }} />
                ))}
            </Stack>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 800, color: tk.navy, mb: 3 }}>Core Modules</Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
            {[
                { icon: <DashboardIcon />, title: 'Dashboard', desc: 'Portfolio overview — active projects, task stats, CPM schedule health panel, upcoming deadlines.', color: tk.teal },
                { icon: <AssignmentIcon />, title: 'Projects', desc: 'Create and manage research projects. Set budgets, timelines, teams. Click any card to open the project.', color: tk.navy },
                { icon: <AccountTreeIcon />, title: 'Tasks & WBS', desc: 'Add tasks with durations and dependencies. View in Kanban, List, or WBS (Work Breakdown Structure) mode.', color: '#7c3aed' },
                { icon: <TimelineIcon />, title: 'CPM Engine', desc: 'Automatically calculates Early/Late Start & Finish, Total Float, Free Float, and the Critical Path.', color: tk.critical },
                { icon: <GanttIcon />, title: 'Gantt Chart', desc: 'Visual timeline with bars positioned by CPM dates. Critical bars highlighted in red, milestones as diamonds.', color: '#0891b2' },
                { icon: <NetworkIcon />, title: 'Network Diagram', desc: 'Activity-on-Node (AON) diagram showing task relationships, CPM data in each node, critical path highlighted.', color: '#d97706' },
            ].map(c => <Grid item xs={12} sm={6} md={4} key={c.title}><InfoCard {...c} /></Grid>)}
        </Grid>

        <Typography variant="h6" sx={{ fontWeight: 800, color: tk.navy, mb: 2 }}>Navigation</Typography>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tk.navy, mb: 1.5 }}>Sidebar Menu</Typography>
                    {[
                        { icon: <DashboardIcon fontSize="small" />, label: 'Dashboard', path: '/', desc: 'Home — portfolio overview' },
                        { icon: <AssignmentIcon fontSize="small" />, label: 'Tasks', path: '/tasks', desc: 'Cross-project task management' },
                        { icon: <CriticalIcon fontSize="small" />, label: 'Portfolio Hub', path: '/portfolio', desc: 'Analytics and portfolio performance' },
                        { icon: <SettingsIcon fontSize="small" />, label: 'Settings', path: '/settings', desc: 'Account and preferences' },
                        { icon: <InfoIcon fontSize="small" />, label: 'User Guide', path: '/guide', desc: 'This page' },
                    ].map(n => (
                        <Box key={n.label} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, mb: 0.75, '&:hover': { bgcolor: tk.grayLighter } }}>
                            <Box sx={{ color: tk.teal }}>{n.icon}</Box>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy }}>{n.label}</Typography>
                                <Typography variant="caption" sx={{ color: tk.textMuted }}>{n.desc}</Typography>
                            </Box>
                        </Box>
                    ))}
                </Grid>
                <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tk.navy, mb: 1.5 }}>Keyboard Shortcuts</Typography>
                    {[
                        { keys: ['Ctrl', 'K'], desc: 'Open global search' },
                        { keys: ['Esc'], desc: 'Close modals / exit fullscreen' },
                        { keys: ['F'], desc: 'Toggle fullscreen in Network Diagram' },
                    ].map((s, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                            <Stack direction="row" spacing={0.5}>
                                {s.keys.map(k => (
                                    <Box key={k} sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: tk.navy, color: '#fff', fontSize: '0.7rem', fontWeight: 800, fontFamily: 'monospace' }}>
                                        {k}
                                    </Box>
                                ))}
                            </Stack>
                            <Typography variant="body2" sx={{ color: tk.textSecondary }}>{s.desc}</Typography>
                        </Box>
                    ))}
                </Grid>
            </Grid>
        </Paper>
    </Box>
);

// ─────────────────────── PROJECTS ────────────────────────────
const ProjectsPanel = () => (
    <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: tk.navy, mb: 3 }}>Managing Projects</Typography>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🆕 Creating a Project</Typography>
            <StepRow num={1} title='Click "New Project" button' desc="Found in the top-right of the Dashboard header, or via the blue button in the Projects section." />
            <StepRow num={2} title="Fill in the project form" desc="Enter Name, Description, Status (Active / On Hold / Completed), Start & End Dates, and Budget." />
            <StepRow num={3} title="Save" desc='Click "Save Project". The project appears immediately on your Dashboard.' />
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>📂 Opening a Project</Typography>
            <Typography variant="body2" sx={{ color: tk.textSecondary, mb: 2 }}>
                Click any project card on the Dashboard to open its detail view. The project detail page has 9 tabs:
            </Typography>
            <Grid container spacing={1}>
                {['Overview', 'Tasks', 'Timeline & Analysis', 'Network Diagram', 'Team', 'Milestones', 'Budget', 'Analytics', 'Files'].map((t, i) => (
                    <Grid item key={t}>
                        <Chip label={`${i + 1}. ${t}`} size="small" sx={{ bgcolor: tk.navyLighter, color: tk.navy, fontWeight: 600, fontSize: '0.72rem' }} />
                    </Grid>
                ))}
            </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>✏️ Editing & Deleting</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 260, p: 2, borderRadius: 2, bgcolor: tk.tealLighter, border: `1px solid ${alpha(tk.teal, 0.3)}` }}>
                    <Stack direction="row" gap={1} alignItems="center" mb={1}>
                        <EditIcon fontSize="small" sx={{ color: tk.teal }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tk.navy }}>Edit</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: tk.textSecondary }}>Click the pencil icon on any project card. The same form opens pre-filled. Change any fields and save.</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 260, p: 2, borderRadius: 2, bgcolor: tk.criticalBg, border: `1px solid ${alpha(tk.critical, 0.3)}` }}>
                    <Stack direction="row" gap={1} alignItems="center" mb={1}>
                        <DeleteIcon fontSize="small" sx={{ color: tk.critical }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tk.navy }}>Delete</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: tk.textSecondary }}>Click the trash icon. A confirmation dialog appears before deletion. This action cannot be undone.</Typography>
                </Box>
            </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🔍 Filtering & Searching Projects</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy, mb: 1 }}>Status Tabs</Typography>
                    <Typography variant="body2" sx={{ color: tk.textSecondary }}>Use the tab bar (ALL / ACTIVE / ON HOLD / COMPLETED) to filter by project status.</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy, mb: 1 }}>Date Range Filter</Typography>
                    <Typography variant="body2" sx={{ color: tk.textSecondary }}>Use the "From / To" date pickers in the search bar to show only projects within a date window.</Typography>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy, mb: 1 }}>Global Search (Ctrl+K)</Typography>
                    <Typography variant="body2" sx={{ color: tk.textSecondary }}>Press Ctrl+K (or Cmd+K on Mac) to quickly jump between Dashboard, Tasks, Portfolio Hub, and Settings pages.</Typography>
                </Grid>
            </Grid>
        </Paper>
    </Box>
);

// ─────────────────────── TASKS & WBS ─────────────────────────
const TasksPanel = () => (
    <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: tk.navy, mb: 3 }}>Tasks & Work Breakdown Structure</Typography>

        <Callout type="note">
            <strong>Key principle:</strong> You only enter <strong>Duration</strong> and <strong>Dependencies</strong> — the scheduling engine calculates all dates automatically. Manual start/end date entry is intentionally disabled.
        </Callout>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🆕 Adding a Task</Typography>
            <StepRow num={1} title='Open a project → click "Add Task"' desc='Click the "+ Add Task" button in the project header (visible on all tabs).' />
            <StepRow num={2} title="Select Task Type" desc='Choose "Work Package" (regular task), "Summary Task" (a parent task grouping others), or "Milestone" (zero-duration marker).' />
            <StepRow num={3} title="Fill in the basics" desc="Enter Name, Duration (in working days), Priority, Status, and optionally a WBS Code (e.g. 1.1.2) and assign to a team member." />
            <StepRow num={4} title="Add dependencies (optional)" desc='In the Dependencies section click "+ Add Dependency". Select a predecessor task, choose type (FS/SS/FF/SF), and set lag days if needed.' />
            <StepRow num={5} title="Advanced settings (optional)" desc='Expand the accordion to set a Constraint Type (e.g. "Must Start On") and date, or add Notes.' />
            <StepRow num={6} title="Save" desc="Click Save. The CPM engine runs automatically — all dates are recalculated for the entire project within seconds." />
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>📋 Task Fields Reference</Typography>
            <FieldRow field="Name" badge="Required" desc="Task name. Keep it concise and action-oriented (e.g. 'Develop Survey Tool')." />
            <FieldRow field="Duration" badge="Required" desc="Number of working days this task takes. Milestones should be 0. Summary tasks auto-calculate from children." />
            <FieldRow field="Task Type" desc="Work Package = normal task. Summary Task = parent that groups child tasks. Milestone = zero-duration event." />
            <FieldRow field="WBS Code" desc="Hierarchical code like 1.2.3. Used for ordering and display in the WBS table. Optional but recommended." />
            <FieldRow field="Dependencies" desc="Other tasks that must finish (or start, based on type) before this task can begin." />
            <FieldRow field="Priority" desc="Critical / High / Medium / Low. Informational only — does not affect scheduling." />
            <FieldRow field="Status" desc="Todo / In Progress / Review / Completed. Status drives Gantt bar progress (0%, 50%, 100%)." />
            <FieldRow field="Constraint Type" desc="ASAP (default), Must Start On, Must Finish On, Start No Earlier Than, etc. Overrides CPM dates when set." />
            <FieldRow field="Notes" desc="Free text notes visible in the task form. Useful for requirements, comments, or links." />
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🔗 Dependency Types Explained</Typography>
            <Grid container spacing={2}>
                {[
                    { type: 'FS', name: 'Finish-to-Start', desc: 'Task B cannot start until Task A finishes. Most common.', example: 'FS: Write Report → Review Report' },
                    { type: 'SS', name: 'Start-to-Start', desc: 'Task B cannot start until Task A starts.', example: 'SS: Excavate → Lay Foundation' },
                    { type: 'FF', name: 'Finish-to-Finish', desc: 'Task B cannot finish until Task A finishes.', example: 'FF: Training → Assessment' },
                    { type: 'SF', name: 'Start-to-Finish', desc: 'Task B cannot finish until Task A starts. Rare.', example: 'SF: Guard shift handover' },
                ].map(d => (
                    <Grid item xs={12} sm={6} key={d.type}>
                        <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${tk.navyLighter}`, height: '100%' }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                <Chip label={d.type} size="small" sx={{ bgcolor: tk.navy, color: '#fff', fontWeight: 900, fontSize: '0.7rem', fontFamily: 'monospace' }} />
                                <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy }}>{d.name}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: tk.textSecondary, mb: 0.5 }}>{d.desc}</Typography>
                            <Typography variant="caption" sx={{ color: tk.textMuted, fontStyle: 'italic' }}>{d.example}</Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
            <Callout type="tip">
                You can also add a <strong>Lag</strong> (positive = delay, negative = overlap). Example: FS +2d means Task B starts 2 working days after Task A finishes.
            </Callout>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>👁️ View Modes (Tasks Tab)</Typography>
            <Grid container spacing={2}>
                {[
                    { icon: <KanbanIcon />, title: 'Kanban', desc: 'Drag-and-drop cards across status columns (Todo → In Progress → Review → Completed). Filter by assignee, priority, or status.' },
                    { icon: <ListViewIcon />, title: 'List', desc: 'Sortable table with all task fields. Good for bulk review, overdue task scanning.' },
                    { icon: <AccountTreeIcon />, title: 'WBS', desc: 'Hierarchical tree view. Shows WBS Code, Duration, Predecessors, Early Start, Early Finish, Float. Critical tasks highlighted red, milestones as ◆.' },
                ].map(v => (
                    <Grid item xs={12} md={4} key={v.title}>
                        <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${tk.navyLighter}`, height: '100%' }}>
                            <Stack direction="row" gap={1} alignItems="center" mb={1}>
                                <Box sx={{ color: tk.teal }}>{v.icon}</Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tk.navy }}>{v.title} View</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: tk.textSecondary }}>{v.desc}</Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    </Box>
);

// ─────────────────────── CPM SCHEDULING ──────────────────────
const CpmPanel = () => (
    <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: tk.navy, mb: 3 }}>CPM Scheduling Engine</Typography>

        <Callout type="note">
            The Critical Path Method is an industry-standard project management technique (PMI/PMBOK). It identifies the <strong>longest sequence of dependent tasks</strong> — the Critical Path — which determines the minimum possible project duration.
        </Callout>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>⚙️ How It Works</Typography>
            <StepRow num={1} title="Forward Pass" desc="Starting from the project start date, the engine walks forward through all tasks calculating Early Start (ES) and Early Finish (EF) for each task, respecting dependency types and lag." />
            <StepRow num={2} title="Backward Pass" desc="Working backwards from the project end date, it calculates Late Start (LS) and Late Finish (LF) — the latest dates a task can occur without delaying the project." />
            <StepRow num={3} title="Float Calculation" desc="Total Float = LS − ES (or LF − EF). Tasks with Float = 0 are on the Critical Path and cannot slip without delaying the project." />
            <StepRow num={4} title="Critical Path Identification" desc="Tasks with Total Float = 0 are marked as Critical (shown in red across all views)." />
            <StepRow num={5} title="Auto-save" desc="Every time you add, edit, or delete a task or dependency, the engine reruns automatically — no manual trigger needed." />
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>📊 CPM Fields Explained</Typography>
            <FieldRow field="ES (Early Start)" desc="Earliest possible date this task can begin, given all predecessor constraints." />
            <FieldRow field="EF (Early Finish)" desc="ES + Duration. Earliest possible completion date." />
            <FieldRow field="LS (Late Start)" desc="Latest date this task can start without pushing the project end date." />
            <FieldRow field="LF (Late Finish)" desc="Latest date this task can finish without pushing the project end date." />
            <FieldRow field="Total Float" desc="How many working days this task can slip before delaying the project. Float = 0 → Critical." />
            <FieldRow field="Free Float" desc="How many days this task can slip before delaying its immediate successors (may be less than Total Float)." />
            <FieldRow field="Is Critical" desc="True when Total Float = 0. Critical tasks are highlighted red in WBS, Gantt, and Network Diagram." />
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>📅 Working Calendar</Typography>
            <Typography variant="body2" sx={{ color: tk.textSecondary, mb: 2 }}>
                The CPM engine uses a configurable working calendar. Configure it on the project's Settings panel:
            </Typography>
            <Grid container spacing={2}>
                {[
                    { label: 'Working Days', desc: 'Select which days of the week are working days (e.g. Mon–Fri).' },
                    { label: 'Hours Per Day', desc: 'Working hours per day (default 8). Used for hour-precision scheduling.' },
                    { label: 'Holidays', desc: 'List of specific dates to exclude from working day counts.' },
                ].map(f => (
                    <Grid item xs={12} md={4} key={f.label}>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: tk.grayLighter, border: `1px solid ${tk.navyLighter}` }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy, mb: 0.5 }}>{f.label}</Typography>
                            <Typography variant="body2" sx={{ color: tk.textSecondary }}>{f.desc}</Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🛡️ Validation Engine</Typography>
            <Typography variant="body2" sx={{ color: tk.textSecondary, mb: 2 }}>
                Before running CPM, the engine validates your schedule and returns warnings or errors:
            </Typography>
            {[
                { label: 'Circular Dependency', type: 'error', desc: 'Task A → B → A (infinite loop). The engine detects this and blocks scheduling.' },
                { label: 'Orphan Tasks', type: 'warning', desc: 'Tasks with no predecessors or successors. May indicate a missing link.' },
                { label: 'Impossible Constraints', type: 'error', desc: 'e.g. "Must Start On" date before the earliest possible start given dependencies.' },
                { label: 'Milestone Duration > 0', type: 'warning', desc: 'Milestones should have Duration = 0. A nonzero duration is flagged.' },
            ].map(v => (
                <Box key={v.label} sx={{ display: 'flex', gap: 2, p: 1.5, borderRadius: 2, mb: 1, border: `1px solid ${v.type === 'error' ? alpha(tk.critical, 0.3) : alpha(tk.warning, 0.3)}`, bgcolor: v.type === 'error' ? tk.criticalBg : tk.warningBg }}>
                    <Chip label={v.type.toUpperCase()} size="small" sx={{ bgcolor: v.type === 'error' ? tk.critical : tk.warning, color: '#fff', fontWeight: 800, fontSize: '0.6rem', height: 20, flexShrink: 0 }} />
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy }}>{v.label}</Typography>
                        <Typography variant="body2" sx={{ color: tk.textSecondary }}>{v.desc}</Typography>
                    </Box>
                </Box>
            ))}
        </Paper>
    </Box>
);

// ─────────────────────── GANTT CHART ─────────────────────────
const GanttPanel = () => (
    <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: tk.navy, mb: 3 }}>Gantt Chart</Typography>
        <Typography variant="body1" sx={{ color: tk.textSecondary, mb: 3, lineHeight: 1.7 }}>
            The Gantt Chart is on the <strong>Timeline & Analysis</strong> tab inside any project. It renders all tasks as horizontal bars positioned using CPM-computed dates.
        </Typography>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🎨 Visual Language</Typography>
            <Grid container spacing={2}>
                {[
                    { swatch: tk.critical, opacity: 0.7, label: 'Critical Task', desc: 'Red bar. Total Float = 0. Cannot slip without delaying the project.' },
                    { swatch: tk.teal, opacity: 0.5, label: 'Normal Task', desc: 'Teal/accent bar. Has positive float — some scheduling flexibility.' },
                    { swatch: tk.navy, opacity: 0.4, label: 'Summary Task', desc: 'Navy bar (project type). Spans the full range of its child tasks.' },
                    { swatch: '#888', opacity: 1, label: 'Milestone', desc: 'Diamond ◆ shape. Zero-duration event marking a key date.' },
                ].map(v => (
                    <Grid item xs={12} sm={6} key={v.label}>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                            <Box sx={{ width: 48, height: 20, borderRadius: 1, bgcolor: alpha(v.swatch, v.opacity), border: `1px solid ${v.swatch}`, flexShrink: 0, mt: 0.5 }} />
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy }}>{v.label}</Typography>
                                <Typography variant="body2" sx={{ color: tk.textSecondary }}>{v.desc}</Typography>
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🔧 Controls</Typography>
            <Grid container spacing={2}>
                {[
                    { icon: <CalendarIcon fontSize="small" />, label: 'View Mode', desc: 'Switch between Day, Week, Month, Year scale using the toggle buttons in the top-right of the Gantt card.' },
                    { icon: <ExportIcon fontSize="small" />, label: 'Export', desc: 'Click the Download button → "Gantt Chart" to save a PNG image. Also export the CPM Analysis table as PNG or CSV.' },
                ].map(c => (
                    <Grid item xs={12} md={4} key={c.label}>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: tk.grayLighter, border: `1px solid ${tk.navyLighter}` }}>
                            <Stack direction="row" gap={1} alignItems="center" mb={0.5}>
                                <Box sx={{ color: tk.teal }}>{c.icon}</Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy }}>{c.label}</Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ color: tk.textSecondary }}>{c.desc}</Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>📈 CPM Analysis Table</Typography>
            <Typography variant="body2" sx={{ color: tk.textSecondary, mb: 2 }}>
                Below the Gantt chart is the <strong>Critical Path Analysis</strong> section showing a table with all tasks and their CPM values:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['Task Name', 'Duration', 'ES', 'EF', 'LS', 'LF', 'Float', 'Status'].map(col => (
                    <Chip key={col} label={col} size="small" sx={{ bgcolor: tk.navy, color: '#fff', fontWeight: 700, fontSize: '0.7rem', fontFamily: 'monospace' }} />
                ))}
            </Box>
            <Callout type="tip">
                The <strong>ES</strong> and <strong>EF</strong> columns show actual calendar dates (not day numbers) when the CPM engine has run successfully.
            </Callout>
        </Paper>
    </Box>
);

// ─────────────────────── NETWORK DIAGRAM ─────────────────────
const NetworkPanel = () => (
    <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: tk.navy, mb: 3 }}>Network Diagram</Typography>
        <Typography variant="body1" sx={{ color: tk.textSecondary, mb: 3, lineHeight: 1.7 }}>
            Found on the <strong>Network Diagram</strong> tab. It renders an Activity-on-Node (AON) network diagram — each task is a node, arrows show dependencies. The critical path is animated in red.
        </Typography>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🗂️ Node Layout</Typography>
            <Box sx={{ p: 3, borderRadius: 2, bgcolor: tk.grayLighter, border: `1px solid ${alpha(tk.navy, 0.15)}`, maxWidth: 300 }}>
                <Box sx={{ p: 1, borderRadius: '6px 6px 0 0', background: `linear-gradient(45deg, #d32f2f 30%, #f44336 90%)`, color: '#fff', mb: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>Task Name</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>⏱ 5 Days | ID: 12</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, p: 1.5, bgcolor: '#fafafa' }}>
                    {[['Early Start', '2026-04-01', '#1565c0'], ['Early Finish', '2026-04-06', '#1565c0'], ['Late Start', '2026-04-01', '#7b1fa2'], ['Late Finish', '2026-04-06', '#7b1fa2']].map(([label, val, color]) => (
                        <Box key={label}>
                            <Typography variant="caption" sx={{ color: '#aaa', fontSize: '0.6rem', textTransform: 'uppercase', display: 'block' }}>{label}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color }}>{val}</Typography>
                        </Box>
                    ))}
                </Box>
                <Box sx={{ px: 1.5, py: 0.75, bgcolor: '#ffebee', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', borderRadius: '0 0 6px 6px' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#d32f2f' }}>FLOAT: 0</Typography>
                    <Chip label="CRITICAL" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900, bgcolor: '#d32f2f', color: 'white' }} />
                </Box>
            </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🎮 Controls & Interaction</Typography>
            {[
                { action: 'Pan', how: 'Click and drag the background' },
                { action: 'Zoom', how: 'Mouse scroll wheel, or use the zoom controls (bottom-left)' },
                { action: 'Fit to view', how: 'Click the center-focus icon in the floating toolbar, or press the fit button in controls' },
                { action: 'Select node', how: 'Click a task node — connected nodes and edges are highlighted, others dimmed' },
                { action: 'Search task', how: 'Click the search icon in the toolbar, type a task name — matching nodes zoom and highlight' },
                { action: 'Layout direction', how: 'Open View Options → choose Horizontal (Left→Right) or Vertical (Top→Bottom)' },
                { action: 'Node spacing', how: 'Open View Options → choose Compact, Normal, or Spacious, then Apply & Arrange' },
                { action: 'Fullscreen', how: 'Click the fullscreen button (top-right) or press F. Press Esc to exit.' },
                { action: 'Export image', how: 'Click Download icon in the toolbar. A high-resolution PNG is saved.' },
            ].map((r, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, py: 1, borderBottom: `1px solid ${tk.navyLighter}` }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy, minWidth: 140 }}>{r.action}</Typography>
                    <Typography variant="body2" sx={{ color: tk.textSecondary }}>{r.how}</Typography>
                </Box>
            ))}
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🔴 Edge (Arrow) Colours</Typography>
            <Grid container spacing={1.5}>
                {[
                    { color: '#c62828', style: 'Animated dashed', label: 'Critical Path edge — both source and target are critical' },
                    { color: '#b1b1b7', style: 'Solid', label: 'Non-critical dependency edge' },
                    { color: '#4caf50', style: 'Dashed', label: 'Start node → first tasks (no predecessors)' },
                    { color: '#f44336', style: 'Dashed', label: 'Last tasks → End node (no successors)' },
                ].map(e => (
                    <Grid item xs={12} sm={6} key={e.color}>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: e.color, flexShrink: 0 }} />
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: e.color }}>{e.style}</Typography>
                                <Typography variant="body2" sx={{ color: tk.textSecondary }}>{e.label}</Typography>
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>
            <Callout type="tip">
                Edge labels show the dependency type (e.g. <strong>SS</strong>, <strong>FF +2d</strong>) when the dependency is not a standard Finish-to-Start with zero lag.
            </Callout>
        </Paper>
    </Box>
);

// ─────────────────────── DASHBOARD ───────────────────────────
const DashboardPanel = () => (
    <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: tk.navy, mb: 3 }}>Dashboard</Typography>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>📊 Stats Widgets (Top Row)</Typography>
            <Grid container spacing={2}>
                {[
                    { label: 'Active Projects', desc: 'Total projects with status = Active.' },
                    { label: 'Tasks in Progress', desc: 'Tasks currently in "In Progress" status across your filtered projects.' },
                    { label: 'Pending Review', desc: 'Tasks in "Review" status — waiting for sign-off.' },
                    { label: 'Critical Path Tasks', desc: 'Tasks marked is_critical = true. These are schedule-critical and must not slip.' },
                ].map(s => (
                    <Grid item xs={12} sm={6} key={s.label}>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: tk.grayLighter, border: `1px solid ${tk.navyLighter}` }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy }}>{s.label}</Typography>
                            <Typography variant="body2" sx={{ color: tk.textSecondary }}>{s.desc}</Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>🔴 CPM Schedule Health Panel</Typography>
            <Typography variant="body2" sx={{ color: tk.textSecondary, mb: 2 }}>
                A sidebar panel showing CPM health per project — only appears when at least one project has tasks with CPM data calculated.
            </Typography>
            {[
                { field: 'Project Name', desc: 'Clickable — opens the project detail page.' },
                { field: 'X critical chip', desc: 'Number of critical tasks in that project.' },
                { field: '📅 Calc. End', desc: 'The calculated project end date = latest Early Finish across all project tasks.' },
                { field: 'Critical chain', desc: '🔴 First Task → Second Task → Third → +N more, listed in early_start order.' },
            ].map(r => <FieldRow key={r.field} field={r.field} desc={r.desc} />)}
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy, mb: 2 }}>📋 Other Sidebar Panels</Typography>
            <Grid container spacing={2}>
                {[
                    { label: 'Team Workload', desc: 'Bar chart of active tasks per team member. Red = overloaded (>5 tasks), yellow = busy (>3).' },
                    { label: 'Task Distribution', desc: 'Progress bars for Todo / In Progress / Review / Completed counts.' },
                    { label: 'My Tasks', desc: 'Tasks assigned to you (toggle Mine / All). Click a task to navigate to it.' },
                    { label: 'Upcoming Deadlines', desc: 'Tasks due within your selected window (14d / 1m / 3m / 6m / 1y). Overdue shown in red.' },
                    { label: 'Recent Activity', desc: 'Log of recent events (create / update / delete actions). Filter by time period.' },
                ].map(p => (
                    <Grid item xs={12} sm={6} key={p.label}>
                        <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${tk.navyLighter}` }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: tk.navy, mb: 0.5 }}>{p.label}</Typography>
                            <Typography variant="body2" sx={{ color: tk.textSecondary }}>{p.desc}</Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    </Box>
);

// ─────────────────────── TIPS & TRICKS ───────────────────────
const TipsPanel = () => (
    <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: tk.navy, mb: 3 }}>Tips & Tricks</Typography>

        {[
            {
                title: '🚀 Getting Started Fast',
                tips: [
                    'Create a project first, then click into it and go straight to the Tasks tab.',
                    'Add tasks in WBS order — 1.0, 1.1, 1.2, 2.0, etc. — for clarity.',
                    'Start with summary tasks (phases), then add child tasks under each.',
                    'Add dependencies after all tasks are created — easier to see the full picture.',
                ]
            },
            {
                title: '📅 Best Scheduling Practices',
                tips: [
                    'Only set a project Start Date (in project settings) — the CPM engine calculates everything else.',
                    'Use FS (Finish-to-Start) for most dependencies; other types only when truly needed.',
                    'Keep durations in working days, not calendar days.',
                    'Milestone tasks should always have Duration = 0.',
                    'Use constraints (e.g. "Must Start On") sparingly — they override CPM and can create impossible schedules.',
                ]
            },
            {
                title: '🔍 Interpreting CPM Results',
                tips: [
                    'Red tasks = Critical. Any delay on these = project delays. Prioritize them.',
                    'High Total Float = scheduling buffer. These tasks have flexibility.',
                    'If Float is negative, you have an impossible constraint — check the validation warnings.',
                    'The Calculated End Date in the Dashboard CPM panel is the earliest possible project completion.',
                    'If all tasks are critical, your project has no slack at all — consider adding resources or reducing scope.',
                ]
            },
            {
                title: '💾 Exporting & Sharing',
                tips: [
                    'Use the Download button (top-right of project view) to export Gantt Chart, CPM Analysis, or Network Diagram as PNG.',
                    'Export CPM Analysis to CSV for importing into Excel or sending to stakeholders.',
                    'The Network Diagram export includes all nodes and dependency arrows — use the "Spacious" layout for cleaner exports.',
                ]
            },
            {
                title: '⚡ Power User Tips',
                tips: [
                    'Press Ctrl+K (Cmd+K on Mac) to instantly navigate between pages without using the sidebar.',
                    'Press F in the Network Diagram to toggle fullscreen for presentations.',
                    'Click any task node in the Network Diagram to highlight its connections and dim the rest.',
                    'In the WBS table, click the ▶ arrow on a Summary Task to collapse/expand its children.',
                    'Kanban view supports drag-and-drop — drag a task card between columns to update its status instantly.',
                ]
            },
        ].map(section => (
            <Accordion key={section.title} defaultExpanded sx={{ mb: 1.5, borderRadius: '12px !important', border: `1px solid ${tk.navyLighter}`, '&:before': { display: 'none' }, boxShadow: 'none' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: tk.teal }} />} sx={{ px: 3, py: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy }}>{section.title}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, pt: 0, pb: 2.5 }}>
                    <List dense disablePadding>
                        {section.tips.map((tip, i) => (
                            <ListItem key={i} disablePadding sx={{ mb: 0.75 }}>
                                <ListItemIcon sx={{ minWidth: 28 }}>
                                    <CheckIcon sx={{ fontSize: 18, color: tk.teal }} />
                                </ListItemIcon>
                                <ListItemText primary={tip} primaryTypographyProps={{ variant: 'body2', color: tk.textSecondary, lineHeight: 1.6 }} />
                            </ListItem>
                        ))}
                    </List>
                </AccordionDetails>
            </Accordion>
        ))}

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mt: 3, border: `1px solid ${alpha(tk.teal, 0.3)}`, bgcolor: tk.tealLighter }}>
            <Stack direction="row" gap={2} alignItems="center">
                <InfoIcon sx={{ color: tk.teal, fontSize: 28 }} />
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tk.navy }}>Need Help?</Typography>
                    <Typography variant="body2" sx={{ color: tk.textSecondary }}>
                        Contact your system administrator or project manager for additional support. This guide covers all features available in the CHQI Project Management Platform.
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    </Box>
);

// ─────────────────────── MAIN COMPONENT ──────────────────────
const panels = [OverviewPanel, ProjectsPanel, TasksPanel, CpmPanel, GanttPanel, NetworkPanel, DashboardPanel, TipsPanel];

const UserGuide = () => {
    const [activeTab, setActiveTab] = useState(0);
    const Panel = panels[activeTab];

    return (
        <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <InfoIcon sx={{ color: tk.teal, fontSize: 28 }} />
                    <Typography variant="h4" sx={{ fontWeight: 900, color: tk.navy, letterSpacing: '-0.5px' }}>
                        User Guide
                    </Typography>
                    <Chip label="v2.0" size="small" sx={{ bgcolor: alpha(tk.teal, 0.15), color: tk.teel, fontWeight: 800, border: `1px solid ${alpha(tk.teal, 0.3)}` }} />
                </Stack>
                <Typography variant="body1" sx={{ color: tk.textSecondary, ml: 5 }}>
                    Complete reference for the CHQI Project Management & CPM Scheduling Platform
                </Typography>
            </Box>

            {/* Tab Navigation */}
            <Paper variant="outlined" sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        bgcolor: tk.grayLighter,
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            minHeight: 52,
                            color: tk.textSecondary,
                            '&.Mui-selected': { color: tk.teal, fontWeight: 700 },
                        },
                        '& .MuiTabs-indicator': { bgcolor: tk.teal, height: 3, borderRadius: '3px 3px 0 0' },
                    }}
                >
                    {sections.map((s, i) => (
                        <Tab key={s.id} label={s.label} icon={s.icon} iconPosition="start" />
                    ))}
                </Tabs>
            </Paper>

            {/* Panel Content */}
            <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, border: `1px solid ${tk.navyLighter}`, minHeight: 500, bgcolor: tk.surface }}>
                <Panel />
            </Paper>

            {/* Bottom Navigation */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                    variant="outlined"
                    disabled={activeTab === 0}
                    onClick={() => setActiveTab(p => p - 1)}
                    sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', borderColor: tk.navyLighter, color: tk.navy, '&:hover': { borderColor: tk.teal, color: tk.teal } }}
                >
                    ← {activeTab > 0 ? sections[activeTab - 1].label : ''}
                </Button>
                <Typography variant="caption" sx={{ color: tk.textMuted, alignSelf: 'center' }}>
                    {activeTab + 1} / {sections.length}
                </Typography>
                <Button
                    variant="contained"
                    disabled={activeTab === sections.length - 1}
                    onClick={() => setActiveTab(p => p + 1)}
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', bgcolor: tk.teal, '&:hover': { bgcolor: tk.tealDark }, '&:disabled': { bgcolor: tk.grayLight } }}
                >
                    {activeTab < sections.length - 1 ? sections[activeTab + 1].label : ''} →
                </Button>
            </Box>
        </Box>
    );
};

export default UserGuide;
