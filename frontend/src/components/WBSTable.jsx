/**
 * WBSTable.jsx
 * ─────────────────────────────────────────────────────────────────
 * Professional WBS (Work Breakdown Structure) table view.
 * Displays tasks in a hierarchical tree with CPM-calculated dates,
 * float, and critical path highlighting.
 *
 * Features:
 *  - Tree structure reflecting parent_task hierarchy
 *  - Collapse/expand summary task groups
 *  - WBS Code | Name | Type | Duration | Predecessors | ES | EF | Float | Critical
 *  - Red highlighting for critical path tasks (total_float === 0)
 *  - Bold summary task rows; milestone diamond icon ◆
 *  - Inline edit button on each row
 */

import React, { useState, useMemo } from 'react';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Typography, Chip, Paper, IconButton, Tooltip, Collapse,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandIcon,
    ChevronRight as CollapseIcon,
    Diamond as MilestoneIcon,
    FolderOpen as SummaryIcon,
    Assignment as WorkIcon,
} from '@mui/icons-material';

// ─── Brand tokens ────────────────────────────────────────────────
const tok = {
    primary: '#182F5B',
    accent: '#1BACA7',
    critical: '#c62828',
    criticalBg: '#fff0f0',
    criticalBorder: '#fecaca',
    summaryBg: '#f0f4ff',
    milestoneBg: '#fffbea',
};

// ─── Helpers ─────────────────────────────────────────────────────
const fmtDate = (d) => {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    } catch { return d; }
};

const fmtFloat = (f) => {
    if (f == null) return '—';
    return `${f}d`;
};

const TYPE_ICON = {
    milestone: <MilestoneIcon sx={{ fontSize: 14, color: '#f59e0b' }} />,
    summary_task: <SummaryIcon sx={{ fontSize: 14, color: tok.primary }} />,
    work_package: <WorkIcon sx={{ fontSize: 14, color: tok.accent }} />,
};

const TYPE_LABEL = {
    milestone: 'Mile',
    summary_task: 'Sum',
    work_package: 'Work',
};

// ─── Build tree from flat task list ──────────────────────────────
function buildTree(tasks) {
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

    // Sort by sort_order then wbs_code
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

    // Flatten with depth info for rendering
    const flat = [];
    const flatten = (node, depth) => {
        flat.push({ ...node, _depth: depth });
        if (node._children) node._children.forEach(c => flatten(c, depth + 1));
    };
    rootNodes.forEach(n => flatten(n, 0));
    return flat;
}

// ─── Row component ────────────────────────────────────────────────
const WBSRow = ({ row, collapsed, onToggle, onEdit, onDelete }) => {
    const isCritical = row.is_critical || row.total_float === 0;
    const isSummary = row.task_type === 'summary_task';
    const isMilestone = row.task_type === 'milestone';
    const hasChildren = row._children && row._children.length > 0;

    // Predecessor labels
    const predLabels = (row.predecessor_deps || []).map(d => {
        const label = d.predecessor_name || `ID:${d.predecessor_task}`;
        const suffix = d.type !== 'FS' || d.lag !== 0
            ? ` (${d.type}${d.lag !== 0 ? `, ${d.lag > 0 ? '+' : ''}${d.lag}d` : ''})`
            : '';
        return label + suffix;
    });

    // WBS / legacy dep label fallback
    const legacyPredLabels = predLabels.length === 0 && row.dependencies?.length > 0
        ? [`${row.dependencies.length} dep(s)`]
        : predLabels;

    const rowBg = isCritical ? tok.criticalBg : isSummary ? tok.summaryBg : isMilestone ? tok.milestoneBg : 'white';
    const nameColor = isCritical ? tok.critical : isSummary ? tok.primary : 'inherit';

    return (
        <TableRow sx={{
            bgcolor: rowBg,
            borderLeft: isCritical ? `3px solid ${tok.critical}` : isSummary ? `3px solid ${tok.primary}` : '3px solid transparent',
            '&:hover': { filter: 'brightness(0.97)', cursor: 'pointer' },
            transition: 'background 0.15s',
        }}>
            {/* WBS Code */}
            <TableCell sx={{ py: 0.8, pl: 1.5, fontSize: '0.78rem', fontWeight: 700, color: tok.primary, whiteSpace: 'nowrap', width: 80 }}>
                {row.wbs_code || '—'}
            </TableCell>

            {/* Task Name (indented) */}
            <TableCell sx={{ py: 0.8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', pl: row._depth * 2.5 }}>
                    {hasChildren ? (
                        <IconButton size="small" onClick={() => onToggle(row.id)} sx={{ p: 0.3, mr: 0.5 }}>
                            {collapsed[row.id] ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 28 }} />
                    )}
                    <Box sx={{ mr: 0.8 }}>{TYPE_ICON[row.task_type] || TYPE_ICON.work_package}</Box>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: isSummary || isCritical ? 800 : 500,
                            color: nameColor,
                            fontSize: '0.83rem',
                        }}
                    >
                        {isMilestone ? '◆ ' : ''}{row.name}
                        {isSummary && <span style={{ color: tok.accent, marginLeft: 4, fontStyle: 'italic', fontSize: '0.7rem' }}>*</span>}
                    </Typography>
                    {isCritical && (
                        <Chip label="Critical" size="small" sx={{ ml: 1, height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: tok.critical, color: 'white' }} />
                    )}
                </Box>
            </TableCell>

            {/* Type */}
            <TableCell sx={{ py: 0.8, fontSize: '0.75rem', color: 'text.secondary', width: 50 }}>
                {TYPE_LABEL[row.task_type] || 'Work'}
            </TableCell>

            {/* Duration */}
            <TableCell align="center" sx={{ py: 0.8, fontSize: '0.78rem', width: 70, fontWeight: 700 }}>
                {isSummary
                    ? <span style={{ color: tok.accent, fontStyle: 'italic' }}>{row.duration || 0}d*</span>
                    : isMilestone ? '0d' : `${row.duration || 0}d`}
            </TableCell>

            {/* Predecessors */}
            <TableCell sx={{ py: 0.8, fontSize: '0.75rem', color: 'text.secondary', maxWidth: 120, overflow: 'hidden' }}>
                {legacyPredLabels.length === 0
                    ? <span style={{ color: '#b0b0b0', fontStyle: 'italic' }}>—</span>
                    : legacyPredLabels.slice(0, 2).map((l, i) => (
                        <Chip key={i} label={l} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.3, height: 18, fontSize: '0.62rem' }} />
                    ))}
                {legacyPredLabels.length > 2 && <Chip label={`+${legacyPredLabels.length - 2}`} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />}
            </TableCell>

            {/* Early Start */}
            <TableCell align="center" sx={{ py: 0.8, fontSize: '0.78rem', color: tok.accent, fontWeight: 600, width: 90 }}>
                {fmtDate(row.early_start || row.es)}
            </TableCell>

            {/* Early Finish */}
            <TableCell align="center" sx={{ py: 0.8, fontSize: '0.78rem', color: tok.accent, fontWeight: 600, width: 90 }}>
                {fmtDate(row.early_finish || row.ef)}
            </TableCell>

            {/* Total Float */}
            <TableCell align="center" sx={{ py: 0.8, width: 70 }}>
                <Typography variant="caption" sx={{
                    fontWeight: 800,
                    color: isCritical ? tok.critical : row.total_float > 5 ? '#2e7d32' : '#e65100',
                    fontSize: '0.78rem',
                }}>
                    {fmtFloat(row.total_float ?? row.slack)}
                    {isCritical && ' 🔴'}
                </Typography>
            </TableCell>

            {/* Actions */}
            <TableCell align="right" sx={{ py: 0.8, pr: 1, width: 72 }}>
                <IconButton size="small" onClick={() => onEdit(row)} sx={{ color: tok.accent, p: 0.4 }}>
                    <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(row)} sx={{ color: 'error.light', p: 0.4, '&:hover': { color: 'error.main' } }}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

// ─── Main component ───────────────────────────────────────────────
const WBSTable = ({ tasks = [], onEdit, onDelete }) => {
    const [collapsed, setCollapsed] = useState({});

    const flatTree = useMemo(() => buildTree(tasks), [tasks]);

    const toggleCollapse = (id) => {
        setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Filter out children of collapsed parents
    const visibleRows = useMemo(() => {
        const hiddenIds = new Set();
        const markHidden = (nodeId) => {
            flatTree.filter(r => r.parent_task === nodeId).forEach(child => {
                hiddenIds.add(child.id);
                markHidden(child.id);
            });
        };

        Object.entries(collapsed).forEach(([id, isCollapsed]) => {
            if (isCollapsed) markHidden(Number(id));
        });

        return flatTree.filter(r => !hiddenIds.has(r.id));
    }, [flatTree, collapsed]);

    if (tasks.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <WorkIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                <Typography>No tasks yet. Add a task to start building your schedule.</Typography>
            </Box>
        );
    }

    return (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e8ecf0', overflow: 'hidden' }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow sx={{ bgcolor: tok.primary }}>
                        {[
                            { label: 'WBS', align: 'left', width: 80 },
                            { label: 'Task Name', align: 'left' },
                            { label: 'Type', align: 'left', width: 50 },
                            { label: 'Dur.', align: 'center', width: 70 },
                            { label: 'Predecessors', align: 'left', width: 140 },
                            { label: 'Early Start', align: 'center', width: 90 },
                            { label: 'Early Finish', align: 'center', width: 90 },
                            { label: 'Float', align: 'center', width: 70 },
                            { label: '', align: 'right', width: 72 },
                        ].map(col => (
                            <TableCell
                                key={col.label}
                                align={col.align}
                                sx={{
                                    bgcolor: tok.primary, color: 'white',
                                    fontWeight: 800, fontSize: '0.72rem',
                                    textTransform: 'uppercase', letterSpacing: 0.5,
                                    py: 1, width: col.width,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {col.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {visibleRows.map(row => (
                        <WBSRow
                            key={row.id}
                            row={row}
                            collapsed={collapsed}
                            onToggle={toggleCollapse}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </TableBody>
            </Table>
            {/* Legend */}
            <Box sx={{ px: 2, py: 1, bgcolor: '#fafbfc', borderTop: '1px solid #e8ecf0', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                    <span style={{ color: tok.critical, fontWeight: 800 }}>🔴 Critical</span> = Total Float 0
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    <span style={{ color: tok.accent, fontStyle: 'italic' }}>*</span> = auto-calculated duration
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    ◆ = Milestone
                </Typography>
            </Box>
        </TableContainer>
    );
};

export default WBSTable;
