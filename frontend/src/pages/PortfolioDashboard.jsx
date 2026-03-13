import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box, Grid, Card, CardContent, Typography, Chip,
    Tooltip, Paper, Stack, Divider, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, IconButton,
    ToggleButton, ToggleButtonGroup, Avatar, CircularProgress,
    alpha, useTheme, Zoom
} from '@mui/material';
import {
    AccountTree as AccountTreeIcon,
    Timer as TimerIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Refresh as RefreshIcon,
    Info as InfoIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    GridView as GridViewIcon,
    ViewTimeline as ViewTimelineIcon,
    MoreVert as MoreVertIcon,
    CalendarViewMonth as MonthIcon,
    CalendarViewWeek as QuarterIcon,
    CalendarToday as YearIcon,
    CenterFocusStrong as FocusIcon
} from '@mui/icons-material';
import { InputBase } from '@mui/material';
import api from '../utils/api';

// --- VISUAL UTILS ---
const getHealthColor = (score) => score > 80 ? '#00c853' : score > 50 ? '#ff9100' : '#ff1744';

// --- COMPONENTS ---

// 1. Stat/Filter Button (Unchanged)
const StatFilterBtn = ({ label, count, icon, color, active, onClick }) => (
    <Paper
        onClick={onClick}
        elevation={0}
        sx={{
            p: 1.5, pr: 3, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer',
            borderRadius: 3, border: '1px solid', borderColor: active ? color : 'transparent',
            bgcolor: active ? alpha(color, 0.1) : 'background.paper', transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
        }}
    >
        <Avatar variant="rounded" sx={{ bgcolor: alpha(color, 0.1), color: color, width: 40, height: 40, borderRadius: 2 }}>
            {icon}
        </Avatar>
        <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1, color: active ? color : 'text.primary' }}>
                {count}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {label}
            </Typography>
        </Box>
    </Paper>
);

// 2. Modern Project Card (Unchanged)
const ModernProjectCard = ({ project, onClick }) => {
    const healthColor = getHealthColor(project.health_score);
    const completion = project.task_count > 0 ? Math.round(((project.status_counts?.completed || 0) / project.task_count) * 100) : 0;
    const daysLeft = project.end_date ? Math.ceil((new Date(project.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    return (
        <Card
            onClick={onClick}
            sx={{
                borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'visible',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }
            }}
        >
            <Box sx={{ position: 'absolute', left: 0, top: 20, bottom: 20, width: 4, bgcolor: healthColor, borderRadius: '0 4px 4px 0' }} />
            <CardContent sx={{ p: 3, pl: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>{project.name}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={project.status} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', bgcolor: 'rgba(0,0,0,0.04)' }} />
                            <Typography variant="caption" sx={{ color: daysLeft < 0 ? 'error.main' : 'text.secondary', fontWeight: 700 }}>
                                {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days remaining`}
                            </Typography>
                        </Stack>
                    </Box>
                    <IconButton size="small" sx={{ mr: -1, mt: -1 }}><MoreVertIcon fontSize="small" /></IconButton>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Progress</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>{completion}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(0,0,0,0.05)' }}>
                        <Box sx={{ width: `${completion}%`, bgcolor: healthColor }} />
                    </Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: alpha(healthColor, 0.04), borderRadius: 3, border: `1px dashed ${alpha(healthColor, 0.2)}` }}>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: healthColor, mb: 1, textTransform: 'uppercase', fontSize: '0.65rem' }}>Next Critical Step</Typography>
                    {project.critical_path.length > 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, noWrap: true, maxWidth: '70%' }}>{project.critical_path[0].name}</Typography>
                            {project.critical_path.length > 1 && <Chip label={`+${project.critical_path.length - 1}`} size="small" sx={{ height: 20, bgcolor: 'white', fontWeight: 800, fontSize: '0.65rem' }} />}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.8rem' }}>Path clear</Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

// 3. FEATURE RICH TIMELINE (Restored Scale & Today Line)
const FeatureRichTimeline = ({ projects, scale, onScaleChange }) => {
    const scrollContainerRef = useRef(null);

    // Filter valid projects
    const validProjects = useMemo(() => projects.filter(p => p.start_date && p.end_date), [projects]);

    // Calculate Grid & Math
    const gridData = useMemo(() => {
        if (validProjects.length === 0) return null;

        const startDates = validProjects.map(p => new Date(p.start_date));
        const endDates = validProjects.map(p => new Date(p.end_date));

        let minDate = new Date(Math.min(...startDates));
        let maxDate = new Date(Math.max(...endDates));
        const today = new Date();

        // Ensure today is included in the range so the line appears
        if (today < minDate) minDate = new Date(today);
        if (today > maxDate) maxDate = new Date(today);

        // Apply Padding based on scale
        if (scale === 'month') {
            minDate.setDate(1); minDate.setMonth(minDate.getMonth() - 1);
            maxDate.setMonth(maxDate.getMonth() + 2, 0);
        } else if (scale === 'quarter') {
            minDate.setMonth(Math.floor(minDate.getMonth() / 3) * 3, 1); minDate.setMonth(minDate.getMonth() - 3);
            maxDate.setMonth((Math.floor(maxDate.getMonth() / 3) + 2) * 3, 0);
        } else { // Year
            minDate.setMonth(0, 1); minDate.setFullYear(minDate.getFullYear() - 1);
            maxDate.setFullYear(maxDate.getFullYear() + 2, 0, 0);
        }

        const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
        return { minDate, maxDate, totalDays };
    }, [validProjects, scale]);

    if (!gridData) return <Paper sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}><Typography color="text.secondary">No timeline data.</Typography></Paper>;

    const { minDate, maxDate, totalDays } = gridData;

    // Helper: Position Logic
    const getPos = (d) => {
        const date = new Date(d);
        const clamped = new Date(Math.max(minDate, Math.min(maxDate, date)));
        return ((clamped - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100;
    };

    const todayPos = getPos(new Date());

    // Helper: Generate Headers
    const labels = [];
    let current = new Date(minDate);
    while (current <= maxDate) {
        labels.push({
            text: current.toLocaleDateString('default', scale === 'year' ? { year: 'numeric' } : scale === 'month' ? { month: 'short', year: '2-digit' } : { month: 'short' }),
            isStart: scale === 'year' ? current.getMonth() === 0 : current.getDate() === 1
        });
        if (scale === 'year') current.setFullYear(current.getFullYear() + 1);
        else if (scale === 'quarter') current.setMonth(current.getMonth() + 3);
        else current.setMonth(current.getMonth() + 1);
    }

    const scrollToToday = () => {
        if (scrollContainerRef.current) {
            const containerWidth = scrollContainerRef.current.scrollWidth;
            const scrollPos = (todayPos / 100) * containerWidth - (scrollContainerRef.current.clientWidth / 2);
            scrollContainerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
        }
    };

    return (
        <Paper sx={{ p: 0, overflow: 'hidden', borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)' }}>

            {/* Timeline Toolbar */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', bgcolor: 'rgba(0,0,0,0.01)' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary' }}>TIMELINE SCALE:</Typography>
                    <ToggleButtonGroup
                        value={scale}
                        exclusive
                        onChange={(e, v) => v && onScaleChange(v)}
                        size="small"
                        sx={{ bgcolor: 'background.paper' }}
                    >
                        <ToggleButton value="month"><MonthIcon fontSize="small" sx={{ mr: 1 }} /> Month</ToggleButton>
                        <ToggleButton value="quarter"><QuarterIcon fontSize="small" sx={{ mr: 1 }} /> Quarter</ToggleButton>
                        <ToggleButton value="year"><YearIcon fontSize="small" sx={{ mr: 1 }} /> Year</ToggleButton>
                    </ToggleButtonGroup>
                </Stack>

                {/* Legend */}
                <Stack direction="row" spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00c853' }} />
                        <Typography variant="caption" fontWeight={700}>Healthy</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff9100' }} />
                        <Typography variant="caption" fontWeight={700}>At Risk</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff1744' }} />
                        <Typography variant="caption" fontWeight={700}>Critical</Typography>
                    </Box>
                </Stack>
            </Box>

            {/* Scrollable Area */}
            <Box ref={scrollContainerRef} sx={{ overflowX: 'auto', p: 3, position: 'relative', minHeight: 300 }}>
                <Box sx={{ minWidth: scale === 'month' ? 1800 : 1200, position: 'relative' }}>

                    {/* Header Row */}
                    <Box sx={{ display: 'flex', mb: 4, borderBottom: '1px solid rgba(0,0,0,0.06)', pb: 1 }}>
                        {labels.map((l, i) => (
                            <Box key={i} sx={{
                                flex: 1,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'text.secondary',
                                borderLeft: '1px solid rgba(0,0,0,0.06)',
                                pl: 1
                            }}>
                                {l.text}
                            </Box>
                        ))}
                    </Box>

                    {/* TODAY LINE */}
                    {todayPos >= 0 && todayPos <= 100 && (
                        <Box sx={{
                            position: 'absolute', left: `${todayPos}%`, top: 0, bottom: 0,
                            borderLeft: '2px dashed #2979ff', zIndex: 20, pointerEvents: 'none'
                        }}>
                            <Box sx={{
                                position: 'absolute', top: -10, left: -32,
                                bgcolor: '#2979ff', color: 'white',
                                px: 1, py: 0.5, borderRadius: 1,
                                fontSize: '0.65rem', fontWeight: 800,
                                boxShadow: '0 4px 10px rgba(41, 121, 255, 0.3)'
                            }}>
                                TODAY
                            </Box>
                        </Box>
                    )}

                    {/* Bars */}
                    <Stack spacing={2}>
                        {validProjects.map(p => {
                            const start = getPos(p.start_date);
                            const end = getPos(p.end_date);
                            const width = Math.max(1, end - start);
                            const color = getHealthColor(p.health_score);

                            return (
                                <Box key={p.id} sx={{ position: 'relative', height: 40 }}>
                                    <Tooltip title={`${p.name}: ${new Date(p.start_date).toLocaleDateString()} - ${new Date(p.end_date).toLocaleDateString()}`} arrow>
                                        <Box sx={{
                                            position: 'absolute', left: `${start}%`, width: `${width}%`,
                                            height: '100%', bgcolor: alpha(color, 0.15),
                                            borderRadius: 2, borderLeft: `4px solid ${color}`,
                                            display: 'flex', alignItems: 'center', px: 1.5,
                                            transition: 'all 0.2s', cursor: 'pointer',
                                            '&:hover': { bgcolor: alpha(color, 0.25), zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                                        }}>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', noWrap: true }}>{p.name}</Typography>
                                        </Box>
                                    </Tooltip>
                                </Box>
                            )
                        })}
                    </Stack>
                </Box>
            </Box>

            {/* Floating Action Button for Today */}
            <Zoom in={todayPos >= 0 && todayPos <= 100}>
                <Box sx={{ position: 'absolute', bottom: 32, right: 32 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<FocusIcon />}
                        onClick={scrollToToday}
                        sx={{ borderRadius: 10, fontWeight: 800, boxShadow: '0 8px 20px rgba(41, 121, 255, 0.3)' }}
                    >
                        Jump to Today
                    </Button>
                </Box>
            </Zoom>
        </Paper>
    );
};

// --- MAIN DASHBOARD ---

const PortfolioDashboard = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('grid');
    const [timelineScale, setTimelineScale] = useState('year'); // Dynamic State Restored
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showMethodology, setShowMethodology] = useState(false);

    const { data = [], isLoading, refetch } = useQuery({
        queryKey: ['portfolioSummary'],
        queryFn: () => api.get('/pm/tasks/portfolio_summary/'),
        refetchInterval: 30000
    });

    const stats = useMemo(() => {
        const s = { total: 0, critical: 0, overdue: 0, completed: 0 };
        if (!data.length) return s;
        const now = new Date();

        data.forEach(p => {
            s.total++;
            if (p.health_score < 70) s.critical++;
            if (p.end_date && new Date(p.end_date) < now && p.status_counts?.completed < p.task_count) s.overdue++;
            if (p.status === 'completed' || p.status_counts?.completed === p.task_count) s.completed++;
        });
        return s;
    }, [data]);

    const filteredProjects = useMemo(() => {
        return data.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            let matchesFilter = true;
            const now = new Date();
            if (activeFilter === 'critical') matchesFilter = p.health_score < 70;
            if (activeFilter === 'overdue') matchesFilter = p.end_date && new Date(p.end_date) < now && (p.status_counts?.completed || 0) < p.task_count;
            if (activeFilter === 'completed') matchesFilter = p.status === 'completed';
            return matchesSearch && matchesFilter;
        });
    }, [data, searchQuery, activeFilter]);

    if (isLoading) return <Box sx={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
            {/* HEADER */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1, mb: 1 }}>Portfolio Intelligence</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>Real-time monitoring of critical paths across {stats.total} initiatives.</Typography>
                    </Box>
                    <Stack direction="row" spacing={2}>
                        <ToggleButtonGroup
                            value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}
                            size="small" sx={{ bgcolor: 'background.paper' }}
                        >
                            <ToggleButton value="grid"><GridViewIcon sx={{ mr: 1 }} /> Grid</ToggleButton>
                            <ToggleButton value="timeline"><ViewTimelineIcon sx={{ mr: 1 }} /> Timeline</ToggleButton>
                        </ToggleButtonGroup>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} sx={{ borderRadius: 2, fontWeight: 700 }}>Sync</Button>
                        <IconButton onClick={() => setShowMethodology(true)}><InfoIcon /></IconButton>
                    </Stack>
                </Box>

                {/* HUD */}
                <Grid container spacing={2} alignItems="stretch">
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
                            <SearchIcon sx={{ color: 'text.secondary', ml: 1, mr: 1 }} />
                            <InputBase placeholder="Search projects..." fullWidth value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ fontWeight: 600 }} />
                            {searchQuery && <IconButton size="small" onClick={() => setSearchQuery('')}><CloseIcon fontSize="small" /></IconButton>}
                        </Paper>
                    </Grid>
                    {/* Filter Tabs */}
                    <Grid item xs={12} md={8}>
                        {/* CHANGED: Changed 'pb: 1' to 'p: 1' to give space for the hover lift */}
                        <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', p: 1 }}>
                            <StatFilterBtn
                                label="Total Active"
                                count={stats.total}
                                icon={<AccountTreeIcon fontSize="small" />}
                                color="#2979ff"
                                active={activeFilter === 'all'}
                                onClick={() => setActiveFilter('all')}
                            />
                            <StatFilterBtn
                                label="Critical Risk"
                                count={stats.critical}
                                icon={<WarningIcon fontSize="small" />}
                                color="#ff1744"
                                active={activeFilter === 'critical'}
                                onClick={() => setActiveFilter('critical')}
                            />
                            <StatFilterBtn
                                label="Overdue"
                                count={stats.overdue}
                                icon={<TimerIcon fontSize="small" />}
                                color="#ff9100"
                                active={activeFilter === 'overdue'}
                                onClick={() => setActiveFilter('overdue')}
                            />
                            <StatFilterBtn
                                label="Completed"
                                count={stats.completed}
                                icon={<CheckCircleIcon fontSize="small" />}
                                color="#00e676"
                                active={activeFilter === 'completed'}
                                onClick={() => setActiveFilter('completed')}
                            />
                        </Stack>
                    </Grid>
                </Grid>
            </Box>

            <Divider sx={{ mb: 4, opacity: 0.6 }} />

            {/* CONTENT */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {viewMode === 'grid' ? <GridViewIcon color="primary" /> : <ViewTimelineIcon color="primary" />}
                        {activeFilter === 'all' ? 'All Projects' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Projects`}
                        <Chip label={filteredProjects.length} size="small" sx={{ ml: 1, fontWeight: 800, bgcolor: 'rgba(0,0,0,0.05)' }} />
                    </Typography>
                </Box>

                {viewMode === 'grid' ? (
                    <Grid container spacing={3}>
                        {filteredProjects.map(project => (
                            <Grid item xs={12} md={6} lg={4} key={project.id}>
                                <ModernProjectCard project={project} onClick={() => navigate(`/projects/${project.id}`)} />
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <FeatureRichTimeline
                        projects={filteredProjects}
                        scale={timelineScale}
                        onScaleChange={setTimelineScale}
                    />
                )}

                {filteredProjects.length === 0 && (
                    <Box sx={{ py: 10, textAlign: 'center', opacity: 0.6 }}>
                        <Typography variant="h6" fontWeight={700}>No projects found</Typography>
                    </Box>
                )}
            </Box>

            {/* Dialog (Methodology) - Unchanged */}
            <Dialog open={showMethodology} onClose={() => setShowMethodology(false)} maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 800 }}>Intelligence Methodology</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" paragraph>
                        <strong>Health Score:</strong> 100 - (Critical Tasks * 5).<br />
                        <strong>Critical Risk:</strong> Health &lt; 70.<br />
                    </Typography>
                </DialogContent>
                <DialogActions><Button onClick={() => setShowMethodology(false)}>Close</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

export default PortfolioDashboard;