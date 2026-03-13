import React, { useCallback, useMemo, useState, useEffect, useRef, forwardRef } from 'react';
import ReactFlow, {
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType,
    Handle,
    Position,
    Controls,
    Background,
    MiniMap,
    Panel,
    useReactFlow,
    ReactFlowProvider,
    useNodesInitialized
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import {
    Box, Typography, Paper, Button, Select, MenuItem,
    FormControl, InputLabel, Stack, IconButton, Collapse, Tooltip, Divider, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FlagIcon from '@mui/icons-material/Flag';
import TimerIcon from '@mui/icons-material/Timer';
import SpeedIcon from '@mui/icons-material/Speed';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SearchIcon from '@mui/icons-material/Search';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { toPng } from 'html-to-image';

// --- Custom Styles for Animations ---
const diagramStyles = `
@keyframes dashdraw {
  from {
    stroke-dashoffset: 20;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.critical-edge path {
  stroke-dasharray: 10, 5;
  animation: dashdraw 0.5s linear infinite;
}

.node-hover-highlight {
  transition: all 0.3s ease;
  filter: drop-shadow(0 0 8px rgba(25, 118, 210, 0.5));
  transform: scale(1.02);
}

.node-dimmed {
  opacity: 0.4;
  filter: grayscale(0.5);
  transition: all 0.3s ease;
}

.edge-highlighted path {
  stroke: #1976d2 !important;
  stroke-width: 3px !important;
  opacity: 1 !important;
}

.edge-dimmed {
  opacity: 0.1 !important;
}
`;

// --- Custom Node Components ---
const CPMNode = ({ data, selected }) => {
    const isCritical = data.is_critical;
    const isHovered = data.isHovered;
    const isDimmed = data.isDimmed;
    const isSearchMatch = data.isSearchMatch;
    const isSearchDimmed = data.isSearchDimmed;

    return (
        <Paper
            elevation={selected || isSearchMatch ? 12 : 3}
            className={`${isHovered ? 'node-hover-highlight' : ''} ${(isDimmed || isSearchDimmed) ? 'node-dimmed' : ''}`}
            sx={{
                width: 220,
                minWidth: 220,
                border: isSearchMatch ? '3px solid #1976d2' : (isCritical ? '2px solid #d32f2f' : '1px solid #e0e0e0'),
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                transform: isSearchMatch ? 'scale(1.1)' : 'none',
                zIndex: isSearchMatch ? 1000 : 1,
                '&:hover': {
                    boxShadow: 6,
                }
            }}
        >
            <Handle type="target" position={Position.Left} style={{ background: '#999', width: 8, height: 8 }} />
            <Handle type="target" position={Position.Top} style={{ background: '#999', width: 8, height: 8 }} />

            {/* Header */}
            <Box sx={{
                background: isCritical
                    ? 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)'
                    : 'linear-gradient(45deg, #455a64 30%, #78909c 90%)',
                p: 1.5,
                color: 'white'
            }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 0.5 }}>
                    {data.label}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TimerIcon sx={{ fontSize: 14, opacity: 0.8 }} />
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 500 }}>
                        {data.duration} Days
                    </Typography>
                    <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)', mx: 0.5 }} />
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 500 }}>
                        ID: {data.id}
                    </Typography>
                </Stack>
            </Box>

            {/* Metrics Grid */}
            <Box sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Early Start</Typography>
                        <Typography variant="body2" fontWeight="700" color="primary.main">{data.es}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Early Finish</Typography>
                        <Typography variant="body2" fontWeight="700" color="primary.main">{data.ef}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Late Start</Typography>
                        <Typography variant="body2" fontWeight="700" color="secondary.main">{data.ls}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Late Finish</Typography>
                        <Typography variant="body2" fontWeight="700" color="secondary.main">{data.lf}</Typography>
                    </Box>
                </Box>
            </Box>

            {/* Slack Footer */}
            <Box sx={{
                px: 1.5, py: 0.75,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                bgcolor: isCritical ? '#ffebee' : '#f5f5f5',
                borderTop: '1px solid #eee'
            }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <SpeedIcon sx={{ fontSize: 14, color: isCritical ? '#d32f2f' : '#666' }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: isCritical ? '#d32f2f' : '#666' }}>
                        SLACK: {data.slack}
                    </Typography>
                </Stack>
                {isCritical && (
                    <Chip label="CRITICAL" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900, bgcolor: '#d32f2f', color: 'white' }} />
                )}
            </Box>

            <Handle type="source" position={Position.Right} style={{ background: '#999', width: 8, height: 8 }} />
            <Handle type="source" position={Position.Bottom} style={{ background: '#999', width: 8, height: 8 }} />
        </Paper>
    );
};

const StartNode = ({ data, selected }) => (
    <Box sx={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: 'white', border: '4px solid white',
        boxShadow: selected ? 8 : 4, transition: 'all 0.3s ease-out',
        position: 'relative'
    }}>
        <PlayArrowIcon />
        <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.7rem' }}>START</Typography>
        <Handle type="source" position={Position.Right} style={{ background: '#4caf50' }} />
        <Handle type="source" position={Position.Bottom} style={{ background: '#4caf50' }} />
    </Box>
);

const EndNode = ({ data, selected }) => (
    <Box sx={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, #f44336 0%, #c62828 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: 'white', border: '4px solid white',
        boxShadow: selected ? 8 : 4, transition: 'all 0.3s ease-out',
        position: 'relative'
    }}>
        <FlagIcon />
        <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.7rem' }}>END</Typography>
        <Handle type="target" position={Position.Left} style={{ background: '#f44336' }} />
        <Handle type="target" position={Position.Top} style={{ background: '#f44336' }} />
    </Box>
);

const nodeTypes = { cpmNode: CPMNode, startNode: StartNode, endNode: EndNode };

// --- Layout Helper ---
const getLayoutedElements = (nodes, edges, direction = 'LR', density = 'normal') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const spacing = {
        compact: { ranksep: 70, nodesep: 50 },
        normal: { ranksep: 120, nodesep: 100 },
        relaxed: { ranksep: 180, nodesep: 150 }
    };

    const { ranksep, nodesep } = spacing[density] || spacing.normal;

    dagreGraph.setGraph({ rankdir: direction, ranksep, nodesep, ranker: 'longest-path' });

    nodes.forEach((node) => {
        const width = (node.type === 'startNode' || node.type === 'endNode') ? 100 : 240;
        const height = (node.type === 'startNode' || node.type === 'endNode') ? 100 : 180;
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const width = (node.type === 'startNode' || node.type === 'endNode') ? 100 : 240;
        const height = (node.type === 'startNode' || node.type === 'endNode') ? 100 : 180;
        node.position = {
            x: nodeWithPosition.x - width / 2,
            y: nodeWithPosition.y - height / 2,
        };
        return node;
    });

    return { nodes: layoutedNodes, edges };
};

const NetworkDiagramContent = ({ tasks, isFullScreen, onToggleFullScreen }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();

    const [direction, setDirection] = useState('LR');
    const [density, setDensity] = useState('compact');
    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [showGuide, setShowGuide] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isInitialLayoutDone, setIsInitialLayoutDone] = useState(false);
    const reactFlowRef = useRef(null);

    const onDownload = useCallback(() => {
        if (reactFlowRef.current === null) return;

        // Hide panels before capturing
        const panels = reactFlowRef.current.querySelectorAll('.react-flow__panel');
        panels.forEach(p => p.style.display = 'none');

        toPng(reactFlowRef.current, {
            cacheBust: true,
            backgroundColor: '#fcfcfc',
        })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `network-diagram-${new Date().getTime()}.png`;
                link.href = dataUrl;
                link.click();
                panels.forEach(p => p.style.display = 'flex');
            })
            .catch((err) => {
                console.error('Download failed', err);
                panels.forEach(p => p.style.display = 'flex');
            });
    }, [reactFlowRef]);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const runLayout = useCallback((dir = direction, den = density) => {
        const layouted = getLayoutedElements(nodes, edges, dir, den);
        setNodes([...layouted.nodes]);
        setEdges([...layouted.edges]);
        window.requestAnimationFrame(() => fitView({ duration: 800 }));
    }, [nodes, edges, setNodes, setEdges, fitView, direction, density]);

    const handleDirectionChange = (e) => {
        const newDir = e.target.value;
        setDirection(newDir);
        runLayout(newDir, density);
    };

    const handleDensityChange = (e) => {
        const newDen = e.target.value;
        setDensity(newDen);
        runLayout(direction, newDen);
    };

    // --- Flow Highlighting Logic ---
    const onNodeMouseEnter = useCallback((event, node) => {
        setHoveredNode(node.id);
    }, []);

    const onNodeMouseLeave = useCallback(() => {
        setHoveredNode(null);
    }, []);

    useEffect(() => {
        if (!hoveredNode) {
            setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isHovered: false, isDimmed: false } })));
            setEdges((eds) => eds.map((e) => ({ ...e, className: e.data?.isCritical ? 'critical-edge' : '', opacity: 1 })));
            return;
        }

        const connectedNodeIds = new Set([hoveredNode]);
        const connectedEdgeIds = new Set();

        edges.forEach(edge => {
            if (edge.source === hoveredNode || edge.target === hoveredNode) {
                connectedNodeIds.add(edge.source);
                connectedNodeIds.add(edge.target);
                connectedEdgeIds.add(edge.id);
            }
        });

        setNodes((nds) => nds.map((n) => ({
            ...n,
            data: {
                ...n.data,
                isHovered: n.id === hoveredNode,
                isDimmed: !connectedNodeIds.has(n.id)
            }
        })));

        setEdges((eds) => eds.map((e) => ({
            ...e,
            className: `${e.data?.isCritical ? 'critical-edge' : ''} ${connectedEdgeIds.has(e.id) ? 'edge-highlighted' : 'edge-dimmed'}`
        })));
    }, [hoveredNode, setNodes, setEdges]);

    // --- Search Logic ---
    useEffect(() => {
        if (!searchQuery) {
            setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isSearchMatch: false, isSearchDimmed: false } })));
            return;
        }

        const query = searchQuery.toLowerCase();
        setNodes((nds) => nds.map((n) => {
            const isMatch = n.data?.label?.toLowerCase().includes(query) || String(n.data?.id).includes(query);
            return {
                ...n,
                data: {
                    ...n.data,
                    isSearchMatch: isMatch,
                    isSearchDimmed: !isMatch
                }
            };
        }));
    }, [searchQuery, setNodes]);

    const handleSearchClear = () => {
        setSearchQuery('');
    };

    useEffect(() => {
        if (tasks.length === 0) return;

        let initialNodes = tasks.map(t => ({
            id: String(t.id),
            type: 'cpmNode',
            data: {
                id: t.id, label: t.name, duration: t.duration,
                es: t.es, ef: t.ef, ls: t.ls, lf: t.lf,
                slack: t.slack, is_critical: t.is_critical
            },
            position: { x: 0, y: 0 }
        }));

        const initialEdges = [];
        const taskIds = new Set(tasks.map(t => t.id));
        const hasPredecessors = new Set();
        const hasSuccessors = new Set();

        tasks.forEach(t => {
            if (t.dependencies && t.dependencies.length > 0) {
                hasPredecessors.add(t.id);
                t.dependencies.forEach(depId => {
                    if (taskIds.has(depId)) {
                        hasSuccessors.add(depId);
                        const depTask = tasks.find(x => x.id === depId);
                        const isCriticalEdge = t.is_critical && depTask?.is_critical;
                        initialEdges.push({
                            id: `e${depId}-${t.id}`,
                            source: String(depId),
                            target: String(t.id),
                            type: 'smoothstep',
                            animated: isCriticalEdge,
                            data: { isCritical: isCriticalEdge },
                            className: isCriticalEdge ? 'critical-edge' : '',
                            style: {
                                stroke: isCriticalEdge ? '#d32f2f' : '#b1b1b7',
                                strokeWidth: isCriticalEdge ? 3 : 1.5
                            },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: isCriticalEdge ? '#d32f2f' : '#b1b1b7',
                                width: 20, height: 20
                            },
                        });
                    }
                });
            }
        });

        initialNodes.push({ id: 'start', type: 'startNode', data: { label: 'Start' }, position: { x: 0, y: 0 } });
        initialNodes.push({ id: 'end', type: 'endNode', data: { label: 'End' }, position: { x: 0, y: 0 } });

        tasks.forEach(t => {
            if (!hasPredecessors.has(t.id)) {
                initialEdges.push({
                    id: `estart-${t.id}`, source: 'start', target: String(t.id), type: 'smoothstep',
                    style: { stroke: '#4caf50', strokeWidth: 2, strokeDasharray: '5,5' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#4caf50' },
                });
            }
            if (!hasSuccessors.has(t.id)) {
                initialEdges.push({
                    id: `e${t.id}-end`, source: String(t.id), target: 'end', type: 'smoothstep',
                    style: { stroke: '#f44336', strokeWidth: 2, strokeDasharray: '5,5' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#f44336' },
                });
            }
        });

        const layouted = getLayoutedElements(initialNodes, initialEdges, direction, density);
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
        setIsInitialLayoutDone(true);
    }, [tasks, direction, density, setNodes, setEdges]);

    const nodesInitialized = useNodesInitialized();

    // Separate effect for fitting the view once nodes are fully rendered and initialized
    useEffect(() => {
        if (isInitialLayoutDone && nodesInitialized && nodes.length > 0) {
            const timer = setTimeout(() => {
                fitView({ duration: 1000, padding: 0.2 });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isInitialLayoutDone, nodesInitialized, nodes.length, fitView]);

    // Re-fit view when full screen is toggled
    useEffect(() => {
        setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
    }, [isFullScreen, fitView]);

    return (
        <Box ref={reactFlowRef} sx={{ width: '100%', height: '100%', position: 'relative' }}>
            <style>{diagramStyles}</style>
            <ReactFlow
                nodes={nodes} edges={edges}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onConnect={onConnect} nodeTypes={nodeTypes}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                attributionPosition="bottom-right"
            >
                <Controls />
                <MiniMap nodeStrokeWidth={3} zoomable pannable />
                <Background variant="dots" gap={20} size={1} color="#e0e0e0" />

                {/* Legend Panel */}
                <Panel position="bottom-left">
                    <Paper elevation={4} sx={{ p: 1.5, borderRadius: 2, border: '1px solid #eee', bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', display: 'block', mb: 1 }}>LEGEND</Typography>
                        <Stack spacing={0.5}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: 'primary.main' }} />
                                <Typography variant="caption">ES / EF (Early Start/Finish)</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: 'secondary.main' }} />
                                <Typography variant="caption">LS / LF (Late Start/Finish)</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 12, height: 12, borderRadius: '2px', border: '2px dashed #d32f2f' }} />
                                <Typography variant="caption">Critical Path</Typography>
                            </Stack>
                        </Stack>
                    </Paper>
                </Panel>

                <Panel position="top-right">
                    <Paper elevation={6} sx={{ border: '1px solid #ddd', borderRadius: 3, overflow: 'hidden', minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                        <Box
                            sx={{
                                background: 'linear-gradient(45deg, #1a237e 30%, #283593 90%)',
                                color: 'white', px: 2, py: 1.5,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer'
                            }}
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <SettingsIcon fontSize="small" />
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>VIEW OPTIONS</Typography>
                            </Stack>
                            <IconButton size="small" sx={{ color: 'white' }}>
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                        </Box>
                        <Collapse in={isExpanded}>
                            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5, bgcolor: 'background.paper' }}>
                                <Box sx={{ position: 'relative' }}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="Search task..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        InputProps={{
                                            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
                                            endAdornment: searchQuery && (
                                                <IconButton size="small" onClick={handleSearchClear}>
                                                    <CloseIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            ),
                                            sx: { borderRadius: 2, bgcolor: '#f8f9fa' }
                                        }}
                                    />
                                </Box>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Layout Direction</InputLabel>
                                    <Select value={direction} label="Layout Direction" onChange={handleDirectionChange}>
                                        <MenuItem value="LR">Horizontal Flow</MenuItem>
                                        <MenuItem value="TB">Vertical Flow</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Node Density</InputLabel>
                                    <Select value={density} label="Node Density" onChange={handleDensityChange}>
                                        <MenuItem value="compact">Compact View</MenuItem>
                                        <MenuItem value="normal">Standard View</MenuItem>
                                        <MenuItem value="relaxed">Spacious View</MenuItem>
                                    </Select>
                                </FormControl>
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="contained" size="medium" fullWidth
                                        startIcon={<RefreshIcon />} onClick={() => runLayout(direction, density)}
                                        sx={{
                                            borderRadius: 2,
                                            fontWeight: 700,
                                            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                                        }}
                                    >
                                        Arrange
                                    </Button>
                                    <Tooltip title="Reset View">
                                        <Button
                                            variant="outlined"
                                            onClick={() => fitView({ duration: 800, padding: 0.2 })}
                                            sx={{ borderRadius: 2, minWidth: 48, p: 0 }}
                                        >
                                            <CenterFocusStrongIcon />
                                        </Button>
                                    </Tooltip>
                                </Stack>
                                <Button
                                    variant="outlined" size="small" fullWidth
                                    startIcon={<HelpOutlineIcon />} onClick={() => setShowGuide(true)}
                                    sx={{ borderRadius: 2, fontWeight: 600 }}
                                >
                                    CPM Guide
                                </Button>
                                <Button
                                    variant="outlined" size="small" fullWidth
                                    startIcon={isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                                    onClick={onToggleFullScreen}
                                    sx={{ borderRadius: 2, fontWeight: 600 }}
                                >
                                    {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                                </Button>
                                <Button
                                    variant="contained" size="small" fullWidth
                                    startIcon={<DownloadIcon />}
                                    onClick={onDownload}
                                    sx={{ borderRadius: 2, fontWeight: 700, mt: 1 }}
                                >
                                    Download Image
                                </Button>
                            </Box>
                        </Collapse>
                    </Paper>
                </Panel>
            </ReactFlow>

            {/* CPM Guide Dialog */}
            <Dialog open={showGuide} onClose={() => setShowGuide(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 800 }}>
                    Critical Path Method (CPM) Guide
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ py: 1 }}>
                        <Box>
                            <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 700 }}>1. What is CPM?</Typography>
                            <Typography variant="body2">
                                The <strong>Critical Path Method (CPM)</strong> identifies the most important tasks in a project. It determines the <strong>shortest possible time</strong> to complete a project and which tasks are "critical"—meaning if they slip, the entire project is delayed.
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 700 }}>2. Key Metrics</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 700 }}>Early Start (ES) / Finish (EF)</Typography>
                                    <Typography variant="caption">The "Best Case" schedule. Earliest a task can start and end.</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="secondary.main" sx={{ fontWeight: 700 }}>Late Start (LS) / Finish (LF)</Typography>
                                    <Typography variant="caption">The "Last Minute" schedule. Latest a task can end without delaying the project.</Typography>
                                </Grid>
                            </Grid>
                        </Box>

                        <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffe0b2' }}>
                            <Typography variant="h6" color="#e65100" gutterBottom sx={{ fontWeight: 700 }}>3. Slack (Float)</Typography>
                            <Typography variant="body2">
                                <strong>Slack</strong> is your "breathing room." It's the amount of time a task can be delayed without affecting the project's end date.
                                <br />
                                <strong>Formula:</strong> LS - ES = Slack.
                            </Typography>
                        </Box>

                        <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, border: '1px solid #ffcdd2' }}>
                            <Typography variant="h6" color="#d32f2f" gutterBottom sx={{ fontWeight: 700 }}>4. The Critical Path</Typography>
                            <Typography variant="body2">
                                The sequence of tasks with <strong>Zero Slack</strong>. These are the bottlenecks. In this diagram, they are highlighted in <strong>Red</strong> with <strong>Animated Lines</strong>.
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 700 }}>5. Pro Tips</Typography>
                            <Typography variant="body2" component="div">
                                <ul>
                                    <li><strong>Focus on Red:</strong> Manage critical tasks first.</li>
                                    <li><strong>Watch Near-Critical:</strong> Tasks with 1-2 days of slack can easily become critical.</li>
                                    <li><strong>Hover to Trace:</strong> Hover over any node to see its direct dependencies highlighted.</li>
                                </ul>
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowGuide(false)} variant="contained">Got it!</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

const NetworkDiagram = forwardRef(({ tasks }, ref) => {
    const [isFullScreen, setIsFullScreen] = useState(false);

    return (
        <Box ref={ref} sx={isFullScreen ? {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1300, // Above MUI AppBars but below Dialogs
            bgcolor: '#fcfcfc'
        } : {
            height: 700,
            width: '100%',
            border: '1px solid #e0e0e0',
            borderRadius: 4,
            bgcolor: '#fcfcfc',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.02)',
            position: 'relative'
        }}>
            <ReactFlowProvider>
                <NetworkDiagramContent
                    tasks={tasks}
                    isFullScreen={isFullScreen}
                    onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
                />
            </ReactFlowProvider>
        </Box>
    );
});

export default NetworkDiagram;
