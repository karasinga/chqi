import React, { useMemo } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    MarkerType,
    Handle,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Box, Typography, Paper } from '@mui/material';

const MiniNode = ({ data }) => (
    <Box sx={{
        width: 120,
        height: 40,
        borderRadius: 2,
        bgcolor: 'rgba(211, 47, 47, 0.1)',
        border: '2px solid #d32f2f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 10px rgba(211, 47, 47, 0.3)',
        position: 'relative'
    }}>
        <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#d32f2f', fontSize: '0.65rem', textAlign: 'center', px: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.label}
        </Typography>
        <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </Box>
);

const nodeTypes = { miniNode: MiniNode };

const getLayoutedElements = (nodes, edges) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 40, nodesep: 20 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 120, height: 40 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - 60,
                y: nodeWithPosition.y - 20,
            },
        };
    });
};

const MiniNetworkDiagram = ({ criticalPath }) => {
    const { nodes, edges } = useMemo(() => {
        if (!criticalPath || criticalPath.length === 0) return { nodes: [], edges: [] };

        const initialNodes = criticalPath.map(t => ({
            id: String(t.id),
            type: 'miniNode',
            data: { label: t.name },
            position: { x: 0, y: 0 }
        }));

        const initialEdges = [];
        for (let i = 0; i < criticalPath.length - 1; i++) {
            initialEdges.push({
                id: `e${criticalPath[i].id}-${criticalPath[i + 1].id}`,
                source: String(criticalPath[i].id),
                target: String(criticalPath[i + 1].id),
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#d32f2f', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#d32f2f',
                    width: 15, height: 15
                },
            });
        }

        const layoutedNodes = getLayoutedElements(initialNodes, initialEdges);
        return { nodes: layoutedNodes, edges: initialEdges };
    }, [criticalPath]);

    if (!criticalPath || criticalPath.length === 0) {
        return (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                <Typography variant="caption" color="textSecondary">No critical path data</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
            <ReactFlowProvider>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    fitView
                    zoomOnScroll={false}
                    zoomOnPinch={false}
                    panOnDrag={false}
                    panOnScroll={false}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                />
            </ReactFlowProvider>
        </Box>
    );
};

export default MiniNetworkDiagram;
