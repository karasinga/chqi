// NetworkDiagram.js
import React, { useCallback, useMemo, useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
    useNodesInitialized,
    getNodesBounds,
    getViewportForBounds
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import {
    Box, Typography, Paper, Button, Select, MenuItem,
    FormControl, InputLabel, Stack, IconButton, Collapse, Tooltip, Divider, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField,
    Drawer, Fab, Zoom, Fade, useTheme, alpha, Slider, Switch, FormControlLabel,
    ToggleButton, ToggleButtonGroup, Badge
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
import TuneIcon from '@mui/icons-material/Tune';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import GridViewIcon from '@mui/icons-material/GridView';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
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

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 6px 30px rgba(25, 118, 210, 0.5);
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

.fullscreen-btn-pulse {
  animation: pulse 2s ease-in-out infinite;
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

// --- Floating Toolbar Component ---
const FloatingToolbar = ({
    isFullScreen,
    onToggleFullScreen,
    onOpenSettings,
    onFitView,
    onDownload,
    searchQuery,
    onSearchChange,
    onSearchClear
}) => {
    const [showSearch, setShowSearch] = useState(false);

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
            }}
        >
            <Fade in={true}>
                <Paper
                    elevation={8}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        p: 0.75,
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    {/* Search */}
                    <Collapse in={showSearch} orientation="horizontal">
                        <TextField
                            size="small"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            sx={{
                                width: 180,
                                mr: 1,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: '#f5f5f5',
                                }
                            }}
                            InputProps={{
                                endAdornment: searchQuery && (
                                    <IconButton size="small" onClick={onSearchClear}>
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                ),
                            }}
                        />
                    </Collapse>

                    <Tooltip title="Search">
                        <IconButton
                            size="small"
                            onClick={() => setShowSearch(!showSearch)}
                            sx={{
                                bgcolor: showSearch ? 'primary.light' : 'transparent',
                                color: showSearch ? 'white' : 'inherit',
                                '&:hover': { bgcolor: showSearch ? 'primary.main' : 'action.hover' }
                            }}
                        >
                            <SearchIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    <Tooltip title="Fit to View">
                        <IconButton size="small" onClick={onFitView}>
                            <CenterFocusStrongIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="View Options">
                        <IconButton size="small" onClick={onOpenSettings}>
                            <TuneIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Download Image">
                        <IconButton size="small" onClick={onDownload}>
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                    <Tooltip title={isFullScreen ? "Exit Full Screen (Esc)" : "Full Screen"}>
                        <IconButton
                            size="small"
                            onClick={onToggleFullScreen}
                            sx={{
                                bgcolor: isFullScreen ? 'error.main' : 'primary.main',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: isFullScreen ? 'error.dark' : 'primary.dark',
                                    transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isFullScreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </Paper>
            </Fade>
        </Box>
    );
};

// --- Settings Drawer Component ---
const SettingsDrawer = ({
    open,
    onClose,
    direction,
    onDirectionChange,
    density,
    onDensityChange,
    onArrange,
    onShowGuide
}) => {
    const theme = useTheme();

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: 320,
                    borderRadius: '16px 0 0 16px',
                    boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
                }
            }}
            ModalProps={{
                keepMounted: true,
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)',
                    color: 'white',
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Stack direction="row" spacing={2} alignItems="center">
                    <TuneIcon />
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            View Options
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            Customize diagram layout
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Content */}
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Layout Direction */}
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
                        LAYOUT DIRECTION
                    </Typography>
                    <ToggleButtonGroup
                        value={direction}
                        exclusive
                        onChange={(e, val) => val && onDirectionChange(val)}
                        fullWidth
                        sx={{
                            '& .MuiToggleButton-root': {
                                py: 1.5,
                                borderRadius: 2,
                                '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: 'primary.dark',
                                    }
                                }
                            }
                        }}
                    >
                        <ToggleButton value="LR">
                            <Stack alignItems="center" spacing={0.5}>
                                <LinearScaleIcon />
                                <Typography variant="caption">Horizontal</Typography>
                            </Stack>
                        </ToggleButton>
                        <ToggleButton value="TB">
                            <Stack alignItems="center" spacing={0.5}>
                                <LinearScaleIcon sx={{ transform: 'rotate(90deg)' }} />
                                <Typography variant="caption">Vertical</Typography>
                            </Stack>
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Node Density */}
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary' }}>
                        NODE SPACING
                    </Typography>
                    <ToggleButtonGroup
                        value={density}
                        exclusive
                        onChange={(e, val) => val && onDensityChange(val)}
                        fullWidth
                        sx={{
                            '& .MuiToggleButton-root': {
                                py: 1.5,
                                borderRadius: 2,
                                '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: 'primary.dark',
                                    }
                                }
                            }
                        }}
                    >
                        <ToggleButton value="compact">
                            <Stack alignItems="center" spacing={0.5}>
                                <GridViewIcon sx={{ fontSize: 20 }} />
                                <Typography variant="caption">Compact</Typography>
                            </Stack>
                        </ToggleButton>
                        <ToggleButton value="normal">
                            <Stack alignItems="center" spacing={0.5}>
                                <ViewModuleIcon sx={{ fontSize: 20 }} />
                                <Typography variant="caption">Normal</Typography>
                            </Stack>
                        </ToggleButton>
                        <ToggleButton value="relaxed">
                            <Stack alignItems="center" spacing={0.5}>
                                <AccountTreeIcon sx={{ fontSize: 20 }} />
                                <Typography variant="caption">Spacious</Typography>
                            </Stack>
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Divider />

                {/* Actions */}
                <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<RefreshIcon />}
                    onClick={onArrange}
                    sx={{
                        borderRadius: 2,
                        py: 1.5,
                        fontWeight: 700,
                        boxShadow: '0 4px 14px rgba(25, 118, 210, 0.4)',
                    }}
                >
                    Apply & Arrange
                </Button>

                <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    startIcon={<HelpOutlineIcon />}
                    onClick={onShowGuide}
                    sx={{
                        borderRadius: 2,
                        py: 1.5,
                        fontWeight: 600,
                    }}
                >
                    CPM Guide
                </Button>
            </Box>

            {/* Legend at Bottom */}
            <Box sx={{ mt: 'auto', p: 3, bgcolor: '#f8f9fa', borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1.5 }}>
                    LEGEND
                </Typography>
                <Stack spacing={1}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: 'primary.main' }} />
                        <Typography variant="caption">ES / EF (Early Start/Finish)</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: 'secondary.main' }} />
                        <Typography variant="caption">LS / LF (Late Start/Finish)</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 16, height: 16, borderRadius: 1, border: '2px dashed #d32f2f' }} />
                        <Typography variant="caption">Critical Path (Zero Slack)</Typography>
                    </Stack>
                </Stack>
            </Box>
        </Drawer>
    );
};

// --- Fullscreen Exit Button (Floating) ---
const FullscreenExitButton = ({ onClick }) => (
    <Zoom in={true}>
        <Fab
            color="error"
            size="medium"
            onClick={onClick}
            sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1400,
                boxShadow: '0 4px 20px rgba(211, 47, 47, 0.4)',
                '&:hover': {
                    transform: 'scale(1.1)',
                }
            }}
        >
            <FullscreenExitIcon />
        </Fab>
    </Zoom>
);

// --- Keyboard Shortcut Hook ---
const useKeyboardShortcuts = (isFullScreen, onToggleFullScreen) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Escape to exit fullscreen
            if (e.key === 'Escape' && isFullScreen) {
                onToggleFullScreen();
            }
            // F key to toggle fullscreen (when not in input)
            if (e.key === 'f' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                e.preventDefault();
                onToggleFullScreen();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen, onToggleFullScreen]);
};

// =====================================================
// NetworkDiagramContent with forwardRef
// =====================================================
const NetworkDiagramContent = forwardRef(({ tasks, isFullScreen, onToggleFullScreen }, ref) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView, zoomIn, zoomOut } = useReactFlow();

    const [direction, setDirection] = useState('LR');
    const [density, setDensity] = useState('compact');
    const [hoveredNode, setHoveredNode] = useState(null);
    const [showGuide, setShowGuide] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isInitialLayoutDone, setIsInitialLayoutDone] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const wrapperRef = useRef(null);
    const { getNodes } = useReactFlow();

    // Keyboard shortcuts
    useKeyboardShortcuts(isFullScreen, onToggleFullScreen);

    // =====================================================
    // High-quality export
    // =====================================================
    const onDownload = useCallback((customFilename = null) => {
        const element = wrapperRef.current;
        if (!element) {
            alert('Diagram not ready. Please wait for it to load.');
            return;
        }

        const nodesList = getNodes();
        if (nodesList.length === 0) {
            alert('No nodes to export.');
            return;
        }

        const nodesBounds = getNodesBounds(nodesList);
        const padding = 150;
        const scaleFactor = 2;

        const imageWidth = (nodesBounds.width + padding * 2) * scaleFactor;
        const imageHeight = (nodesBounds.height + padding * 2) * scaleFactor;

        const translateX = (-nodesBounds.x + padding) * scaleFactor;
        const translateY = (-nodesBounds.y + padding) * scaleFactor;

        const viewportElement = element.querySelector('.react-flow__viewport');
        if (!viewportElement) {
            alert('Could not find the diagram viewport.');
            return;
        }

        toPng(viewportElement, {
            backgroundColor: '#fcfcfc',
            width: imageWidth,
            height: imageHeight,
            cacheBust: true,
            pixelRatio: 1,
            style: {
                width: `${imageWidth}px`,
                height: `${imageHeight}px`,
                transform: `translate(${translateX}px, ${translateY}px) scale(${scaleFactor})`,
                transformOrigin: 'top left',
            },
            filter: (node) => {
                if (node?.classList) {
                    if (
                        node.classList.contains('react-flow__minimap') ||
                        node.classList.contains('react-flow__controls') ||
                        node.classList.contains('react-flow__panel') ||
                        node.classList.contains('react-flow__attribution')
                    ) {
                        return false;
                    }
                }
                return true;
            },
        })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = customFilename || `network-diagram-${new Date().getTime()}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch((err) => {
                console.error('Download failed:', err);
                alert(`Export failed: ${err.message}`);
            });
    }, [getNodes]);

    useImperativeHandle(ref, () => ({
        exportNetwork: onDownload
    }), [onDownload]);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const runLayout = useCallback((dir = direction, den = density) => {
        const layouted = getLayoutedElements(nodes, edges, dir, den);
        setNodes([...layouted.nodes]);
        setEdges([...layouted.edges]);
        window.requestAnimationFrame(() => fitView({ duration: 800 }));
    }, [nodes, edges, setNodes, setEdges, fitView, direction, density]);

    const handleDirectionChange = (newDir) => {
        setDirection(newDir);
    };

    const handleDensityChange = (newDen) => {
        setDensity(newDen);
    };

    const handleArrange = () => {
        runLayout(direction, density);
        setSettingsOpen(false);
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
            setNodes((nds) => nds.map((n) => ({
                ...n, data: { ...n.data, isHovered: false, isDimmed: false }
            })));
            setEdges((eds) => eds.map((e) => ({
                ...e, className: e.data?.isCritical ? 'critical-edge' : '', opacity: 1
            })));
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
            setNodes((nds) => nds.map((n) => ({
                ...n, data: { ...n.data, isSearchMatch: false, isSearchDimmed: false }
            })));
            return;
        }

        const query = searchQuery.toLowerCase();
        setNodes((nds) => nds.map((n) => {
            const isMatch = n.data?.label?.toLowerCase().includes(query) ||
                String(n.data?.id).includes(query);
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

    const handleSearchClear = () => setSearchQuery('');

    useEffect(() => {
        if (tasks.length === 0) return;

        // Filter out summary tasks. A pure AON network diagram shouldn't show aggregate phases,
        // only schedulable actions (work packages) and milestones.
        const networkTasks = tasks.filter(t => t.task_type !== 'summary_task');

        let initialNodes = networkTasks.map(t => ({
            id: String(t.id),
            type: 'cpmNode',
            data: {
                id: t.id,
                label: `${t.wbs_code ? t.wbs_code + ' — ' : ''}${t.name}`,
                duration: t.duration,
                // Support both new field names and legacy aliases
                es: t.early_start || t.es || '—',
                ef: t.early_finish || t.ef || '—',
                ls: t.late_start || t.ls || '—',
                lf: t.late_finish || t.lf || '—',
                slack: t.total_float ?? t.slack ?? '—',
                is_critical: !!t.is_critical,
                task_type: t.task_type || 'work_package',
            },
            position: { x: 0, y: 0 }
        }));

        const initialEdges = [];
        const taskIds = new Set(networkTasks.map(t => t.id));
        const hasPredecessors = new Set();
        const hasSuccessors = new Set();

        networkTasks.forEach(t => {
            // Prefer typed predecessor_deps; fall back to legacy dependencies array
            const usedTyped = t.predecessor_deps && t.predecessor_deps.length > 0;

            if (usedTyped) {
                hasPredecessors.add(t.id);
                t.predecessor_deps.forEach(dep => {
                    const depId = dep.predecessor_task;
                    if (taskIds.has(depId)) {
                        hasSuccessors.add(depId);
                        const depTask = networkTasks.find(x => x.id === depId);
                        const isCriticalEdge = t.is_critical && depTask?.is_critical;
                        const depType = dep.type || 'FS';
                        const lag = dep.lag || 0;
                        const edgeLabel = lag !== 0
                            ? `${depType} ${lag > 0 ? '+' : ''}${lag}d`
                            : depType !== 'FS' ? depType : '';

                        initialEdges.push({
                            id: `e${depId}-${t.id}-${depType}`,
                            source: String(depId),
                            target: String(t.id),
                            type: 'smoothstep',
                            animated: isCriticalEdge,
                            label: edgeLabel,
                            labelStyle: { fill: isCriticalEdge ? '#c62828' : '#64748b', fontWeight: 700, fontSize: 10 },
                            labelBgStyle: { fill: 'white', fillOpacity: 0.85 },
                            data: { isCritical: isCriticalEdge },
                            className: isCriticalEdge ? 'critical-edge' : '',
                            style: {
                                stroke: isCriticalEdge ? '#c62828' : '#b1b1b7',
                                strokeWidth: isCriticalEdge ? 3 : 1.5,
                            },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: isCriticalEdge ? '#c62828' : '#b1b1b7',
                                width: 20, height: 20,
                            },
                        });
                    }
                });
            } else if (t.dependencies && t.dependencies.length > 0) {
                hasPredecessors.add(t.id);
                t.dependencies.forEach(depId => {
                    if (taskIds.has(depId)) {
                        hasSuccessors.add(depId);
                        const depTask = networkTasks.find(x => x.id === depId);
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
                                stroke: isCriticalEdge ? '#c62828' : '#b1b1b7',
                                strokeWidth: isCriticalEdge ? 3 : 1.5,
                            },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: isCriticalEdge ? '#c62828' : '#b1b1b7',
                                width: 20, height: 20,
                            },
                        });
                    }
                });
            }
        });

        initialNodes.push({
            id: 'start', type: 'startNode',
            data: { label: 'Start' }, position: { x: 0, y: 0 }
        });
        initialNodes.push({
            id: 'end', type: 'endNode',
            data: { label: 'End' }, position: { x: 0, y: 0 }
        });

        tasks.forEach(t => {
            if (!hasPredecessors.has(t.id)) {
                initialEdges.push({
                    id: `estart-${t.id}`, source: 'start', target: String(t.id),
                    type: 'smoothstep',
                    style: { stroke: '#4caf50', strokeWidth: 2, strokeDasharray: '5,5' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#4caf50' },
                });
            }
            if (!hasSuccessors.has(t.id)) {
                initialEdges.push({
                    id: `e${t.id}-end`, source: String(t.id), target: 'end',
                    type: 'smoothstep',
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

    useEffect(() => {
        if (isInitialLayoutDone && nodesInitialized && nodes.length > 0) {
            const timer = setTimeout(() => {
                fitView({ duration: 1000, padding: 0.2 });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isInitialLayoutDone, nodesInitialized, nodes.length, fitView]);

    useEffect(() => {
        setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
    }, [isFullScreen, fitView]);

    return (
        <Box ref={wrapperRef} sx={{ width: '100%', height: '100%', position: 'relative' }}>
            <style>{diagramStyles}</style>

            {/* Floating Toolbar */}
            <FloatingToolbar
                isFullScreen={isFullScreen}
                onToggleFullScreen={onToggleFullScreen}
                onOpenSettings={() => setSettingsOpen(true)}
                onFitView={() => fitView({ duration: 800, padding: 0.2 })}
                onDownload={() => onDownload()}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchClear={handleSearchClear}
            />

            {/* Settings Drawer */}
            <SettingsDrawer
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                direction={direction}
                onDirectionChange={handleDirectionChange}
                density={density}
                onDensityChange={handleDensityChange}
                onArrange={handleArrange}
                onShowGuide={() => {
                    setSettingsOpen(false);
                    setShowGuide(true);
                }}
            />

            {/* Fullscreen Exit FAB */}
            {isFullScreen && (
                <FullscreenExitButton onClick={onToggleFullScreen} />
            )}

            <ReactFlow
                nodes={nodes} edges={edges}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onConnect={onConnect} nodeTypes={nodeTypes}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                attributionPosition="bottom-right"
                fitView
            >
                <Controls position="bottom-left" />
                <MiniMap
                    nodeStrokeWidth={3}
                    zoomable
                    pannable
                    position="bottom-right"
                    style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 8,
                    }}
                />
                <Background variant="dots" gap={20} size={1} color="#e0e0e0" />
            </ReactFlow>

            {/* CPM Guide Dialog */}
            <Dialog
                open={showGuide}
                onClose={() => setShowGuide(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3 }
                }}
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)',
                    color: 'white',
                    fontWeight: 800
                }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <HelpOutlineIcon />
                        <span>Critical Path Method (CPM) Guide</span>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ py: 1 }}>
                        <Box>
                            <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
                                1. What is CPM?
                            </Typography>
                            <Typography variant="body2">
                                The <strong>Critical Path Method (CPM)</strong> identifies the most important tasks in a project.
                                It determines the <strong>shortest possible time</strong> to complete a project and which tasks
                                are "critical"—meaning if they slip, the entire project is delayed.
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
                                2. Key Metrics
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                                        <Typography variant="subtitle2" color="primary.dark" sx={{ fontWeight: 700 }}>
                                            Early Start (ES) / Finish (EF)
                                        </Typography>
                                        <Typography variant="caption">
                                            The "Best Case" schedule. Earliest a task can start and end.
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 2, bgcolor: '#fce4ec', borderRadius: 2 }}>
                                        <Typography variant="subtitle2" color="secondary.dark" sx={{ fontWeight: 700 }}>
                                            Late Start (LS) / Finish (LF)
                                        </Typography>
                                        <Typography variant="caption">
                                            The "Last Minute" schedule. Latest a task can end without delaying the project.
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>
                        <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffe0b2' }}>
                            <Typography variant="h6" color="#e65100" gutterBottom sx={{ fontWeight: 700 }}>
                                3. Slack (Float)
                            </Typography>
                            <Typography variant="body2">
                                <strong>Slack</strong> is your "breathing room." It's the amount of time a task can be
                                delayed without affecting the project's end date.
                                <br />
                                <strong>Formula:</strong> LS - ES = Slack.
                            </Typography>
                        </Box>
                        <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, border: '1px solid #ffcdd2' }}>
                            <Typography variant="h6" color="#d32f2f" gutterBottom sx={{ fontWeight: 700 }}>
                                4. The Critical Path
                            </Typography>
                            <Typography variant="body2">
                                The sequence of tasks with <strong>Zero Slack</strong>. These are the bottlenecks.
                                In this diagram, they are highlighted in <strong>Red</strong> with <strong>Animated Lines</strong>.
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
                                5. Keyboard Shortcuts
                            </Typography>
                            <Stack direction="row" spacing={2}>
                                <Chip label="F" variant="outlined" size="small" />
                                <Typography variant="body2">Toggle Full Screen</Typography>
                            </Stack>
                            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                <Chip label="Esc" variant="outlined" size="small" />
                                <Typography variant="body2">Exit Full Screen</Typography>
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setShowGuide(false)} variant="contained" sx={{ borderRadius: 2 }}>
                        Got it!
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
});

// =====================================================
// NetworkDiagram wrapper with proper ref chain
// =====================================================
const NetworkDiagram = forwardRef(({ tasks }, ref) => {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const contentRef = useRef(null);

    useImperativeHandle(ref, () => ({
        exportNetwork: (filename) => {
            if (contentRef.current && contentRef.current.exportNetwork) {
                contentRef.current.exportNetwork(filename);
            } else {
                console.warn('NetworkDiagramContent ref not available');
            }
        }
    }), []);

    const toggleFullScreen = useCallback(() => {
        setIsFullScreen(prev => !prev);
    }, []);

    return (
        <Box sx={isFullScreen ? {
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw', height: '100vh',
            zIndex: 1300,
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
                    ref={contentRef}
                    tasks={tasks}
                    isFullScreen={isFullScreen}
                    onToggleFullScreen={toggleFullScreen}
                />
            </ReactFlowProvider>
        </Box>
    );
});

export default NetworkDiagram;