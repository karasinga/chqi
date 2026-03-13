// FileTree.jsx
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Menu, MenuItem, Tooltip, CircularProgress, Paper, LinearProgress,
    Snackbar, Alert, Chip, Stack
} from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import {
    Folder as FolderIcon, FolderOpen as FolderOpenIcon,
    InsertDriveFile as FileIcon, Add as AddIcon, CreateNewFolder as CreateNewFolderIcon,
    Delete as DeleteIcon, Download as DownloadIcon,
    Description as DescriptionIcon, TableChart as TableChartIcon,
    PictureAsPdf as PdfIcon, AudioFile as AudioIcon, VideoFile as VideoIcon,
    Image as ImageIcon, Archive as ArchiveIcon, Code as CodeIcon,
    ChevronRight as ChevronRightIcon,
    SubdirectoryArrowRight as SubdirectoryIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import api from '../utils/api';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import {
    FILE_SIZE_CONFIG,
    FILE_CATEGORIES,
    getFileCategory,
    getFileSizeLimit,
    formatFileSize as formatBytes, // Rename to avoid conflict with local formatFileSize if kept
    getAllowedExtensions,
    validateFiles as validateFilesSmart,
    getUploadGuidance,
} from '../utils/fileConfig';

// =====================================================
// CONSTANTS
// =====================================================
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// settings removed - now using fileConfig.js

// Indentation settings
const INDENT_SIZE = 24; // pixels per level
const CONNECTOR_COLOR = '#d0d0d0';

// =====================================================
// HELPER FUNCTIONS
// =====================================================
const getCsrfToken = () => {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
};

const getFileIcon = (fileType) => {
    const iconMap = {
        excel: { icon: TableChartIcon, color: '#1d6f42' },
        csv: { icon: TableChartIcon, color: '#1d6f42' },
        word: { icon: DescriptionIcon, color: '#2b579a' },
        pdf: { icon: PdfIcon, color: '#d32f2f' },
        audio: { icon: AudioIcon, color: '#f57c00' },
        video: { icon: VideoIcon, color: '#7b1fa2' },
        image: { icon: ImageIcon, color: '#0288d1' },
        archive: { icon: ArchiveIcon, color: '#5d4037' },
        code: { icon: CodeIcon, color: '#00695c' },
    };

    const config = iconMap[fileType] || { icon: FileIcon, color: '#757575' };
    const IconComponent = config.icon;
    return <IconComponent sx={{ fontSize: 18, mr: 1, color: config.color }} />;
};

const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

// validateFiles removed - now using validateFilesSmart from fileConfig.js

const getFileUrl = (file) => {
    let url = file.file_url || file.file;
    if (!url) return null;
    if (!url.startsWith('http')) {
        if (!url.startsWith('/')) url = '/' + url;
        if (!url.startsWith('/media/')) url = '/media' + url;
        url = `${API_BASE_URL}${url}`;
    }
    return url;
};

// =====================================================
// SUB-COMPONENTS
// =====================================================
const EmptyState = () => (
    <Box sx={{ textAlign: 'center', py: 8 }}>
        <FolderOpenIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
            No files or folders yet
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Create a folder or upload files to get started
        </Typography>
    </Box>
);

const UploadProgressBar = ({ progress }) => {
    if (progress === null) return null;
    return (
        <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={24} variant="determinate" value={progress} />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Uploading files... {Math.round(progress)}%
                    </Typography>
                    <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1 }} />
                </Box>
            </Box>
        </Paper>
    );
};

// =====================================================
// TREE ITEM CONNECTOR LINES
// =====================================================
const TreeConnector = ({ level, isLast, hasChildren }) => {
    if (level === 0) return null;

    return (
        <Box
            sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: level * INDENT_SIZE,
                pointerEvents: 'none',
            }}
        >
            {/* Vertical line from parent */}
            <Box
                sx={{
                    position: 'absolute',
                    left: (level - 1) * INDENT_SIZE + 10,
                    top: 0,
                    bottom: isLast ? '50%' : 0,
                    width: 1,
                    bgcolor: CONNECTOR_COLOR,
                }}
            />
            {/* Horizontal connector to item */}
            <Box
                sx={{
                    position: 'absolute',
                    left: (level - 1) * INDENT_SIZE + 10,
                    top: '50%',
                    width: INDENT_SIZE - 14,
                    height: 1,
                    bgcolor: CONNECTOR_COLOR,
                }}
            />
        </Box>
    );
};

// Level indicator dots/badge
const LevelIndicator = ({ level }) => {
    if (level === 0) return null;

    const colors = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828'];
    const color = colors[level % colors.length];

    return (
        <Box
            sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: color,
                mr: 1,
                flexShrink: 0,
            }}
        />
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================
const FileTree = ({ projectId, refreshTrigger }) => {
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState([]);
    const [selected, setSelected] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);

    // Smart file policy states
    const [guidanceDialog, setGuidanceDialog] = useState({ open: false, category: null });
    const [uploadErrors, setUploadErrors] = useState([]);

    // Dialog states
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedParentFolder, setSelectedParentFolder] = useState(null);

    // Context menu
    const [contextMenu, setContextMenu] = useState(null);
    const [contextItem, setContextItem] = useState(null);

    // Delete confirmation
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Notifications
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

    const showNotification = useCallback((message, severity = 'success') => {
        setNotification({ open: true, message, severity });
    }, []);

    const closeNotification = useCallback(() => {
        setNotification(prev => ({ ...prev, open: false }));
    }, []);

    // =====================================================
    // QUERIES & MUTATIONS
    // =====================================================
    const { data: treeData = { folders: [], files: [] }, isLoading } = useQuery({
        queryKey: ['fileTree', projectId, refreshTrigger],
        queryFn: () => api.get(`/folders/tree/?project=${projectId}`),
        enabled: !!projectId,
        staleTime: 30_000,
    });

    const createFolderMutation = useMutation({
        mutationFn: (folderData) => api.post('/folders/', folderData),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
            setFolderDialogOpen(false);
            setNewFolderName('');
            setSelectedParentFolder(null);
            showNotification(`Folder "${data.name || newFolderName}" created`);
        },
        onError: (err) => {
            showNotification(`Failed to create folder: ${err.message}`, 'error');
        }
    });

    const deleteFolderMutation = useMutation({
        mutationFn: (folderId) => api.delete(`/folders/${folderId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
            showNotification('Folder deleted');
        },
        onError: (err) => {
            showNotification(`Failed to delete folder: ${err.message}`, 'error');
        }
    });

    const deleteFileMutation = useMutation({
        mutationFn: (fileId) => api.delete(`/files/${fileId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
            showNotification('File deleted');
        },
        onError: (err) => {
            showNotification(`Failed to delete file: ${err.message}`, 'error');
        }
    });

    // =====================================================
    // HANDLERS
    // =====================================================
    const handleCreateFolder = useCallback(() => {
        const trimmed = newFolderName.trim();
        if (!trimmed) return;

        if (/[<>:"/\\|?*]/.test(trimmed)) {
            showNotification('Folder name contains invalid characters', 'error');
            return;
        }

        createFolderMutation.mutate({
            name: trimmed,
            project: projectId,
            parent: selectedParentFolder,
        });
    }, [newFolderName, projectId, selectedParentFolder, createFolderMutation, showNotification]);

    const handleFileUpload = useCallback(async (event, folderId = null) => {
        const validation = validateFilesSmart(event.target.files);
        event.target.value = '';

        if (validation.errors.length > 0) {
            setUploadErrors(validation.errors);
            showNotification(
                `${validation.errors.length} file(s) rejected. Click for details.`,
                'error'
            );
        }

        if (validation.warnings.length > 0) {
            validation.warnings.forEach((w) => {
                console.warn(`Upload warning: ${w.file} - ${w.message}`);
            });
        }

        const filesToUpload = validation.validFiles;
        if (filesToUpload.length === 0) return;

        setUploadProgress(0);
        const csrftoken = getCsrfToken();
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < filesToUpload.length; i++) {
            const { file, needsChunkedUpload } = filesToUpload[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('project', projectId);
            if (folderId) formData.append('folder', folderId);

            try {
                const headers = {};
                if (csrftoken) headers['X-CSRFToken'] = csrftoken;

                if (needsChunkedUpload) {
                    console.log(`Large file upload detected: ${file.name} (${formatBytes(file.size)})`);
                }

                const response = await fetch(`${API_BASE_URL}/api/files/`, {
                    method: 'POST',
                    headers,
                    body: formData,
                    credentials: 'include',
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Server returned ${response.status}`);
                }
                successCount++;
            } catch (error) {
                console.error(`Error uploading "${file.name}":`, error);
                failCount++;
            }

            setUploadProgress(((i + 1) / filesToUpload.length) * 100);
        }

        setTimeout(() => {
            setUploadProgress(null);
            queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });

            if (failCount > 0) {
                showNotification(`Uploaded ${successCount} file(s), ${failCount} failed`, 'warning');
            } else if (successCount > 0) {
                showNotification(`${successCount} file(s) uploaded successfully`);
            }
        }, 800);
    }, [projectId, queryClient, showNotification]);

    const handleDownload = useCallback(async (file) => {
        const url = getFileUrl(file);
        if (!url) {
            showNotification('File URL not available', 'error');
            return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Download failed (${response.status})`);

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = file.file_name || file.name || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }, [showNotification]);

    const handleDeleteRequest = useCallback((type, data) => {
        setItemToDelete({ type, data });
        setDeleteModalOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!itemToDelete) return;

        const id = itemToDelete.data.id || itemToDelete.data;
        if (itemToDelete.type === 'folder') {
            deleteFolderMutation.mutate(id);
        } else {
            deleteFileMutation.mutate(id);
        }

        setDeleteModalOpen(false);
        setItemToDelete(null);
    }, [itemToDelete, deleteFolderMutation, deleteFileMutation]);

    const handleContextMenu = useCallback((e, type, data) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ mouseX: e.clientX, mouseY: e.clientY });
        setContextItem({ type, data });
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
        setContextItem(null);
    }, []);

    const openFolderDialog = useCallback((parentId = null) => {
        setSelectedParentFolder(parentId);
        setNewFolderName('');
        setFolderDialogOpen(true);
    }, []);

    const closeFolderDialog = useCallback(() => {
        setFolderDialogOpen(false);
        setNewFolderName('');
        setSelectedParentFolder(null);
    }, []);

    // =====================================================
    // TREE RENDERING WITH INDENTATION
    // =====================================================
    const renderTree = useCallback((folders, files, level = 0, parentPath = '') => {
        const totalItems = folders.length + files.length;
        let itemIndex = 0;

        return (
            <>
                {folders.map((folder, folderIndex) => {
                    const isLast = itemIndex === totalItems - 1;
                    const currentPath = parentPath ? `${parentPath} / ${folder.name}` : folder.name;
                    const hasChildren = (folder.children?.length || 0) + (folder.files?.length || 0) > 0;
                    itemIndex++;

                    return (
                        <TreeItem
                            key={`folder-${folder.id}`}
                            itemId={`folder-${folder.id}`}
                            label={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        py: 1.25,
                                        px: 1.5,
                                        ml: level * 2, // Indentation based on level
                                        borderRadius: 2,
                                        position: 'relative',
                                        borderLeft: level > 0 ? `3px solid ${['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828'][level % 5]}` : 'none',
                                        bgcolor: level > 0 ? `rgba(0, 0, 0, ${0.01 * level})` : 'transparent',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: 'rgba(25, 118, 210, 0.08)',
                                            '& .folder-actions': { opacity: 1 }
                                        }
                                    }}
                                    onContextMenu={(e) => handleContextMenu(e, 'folder', folder)}
                                >
                                    {/* Level indicator */}
                                    <LevelIndicator level={level} />

                                    {/* Folder icon */}
                                    <FolderIcon
                                        sx={{
                                            color: level === 0 ? '#ffa726' : ['#ffa726', '#66bb6a', '#42a5f5', '#ab47bc', '#ef5350'][level % 5],
                                            mr: 1,
                                            fontSize: level === 0 ? 22 : 20
                                        }}
                                    />

                                    {/* Folder info */}
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: level === 0 ? 700 : 600,
                                                fontSize: level === 0 ? '0.9rem' : '0.85rem',
                                                color: level === 0 ? 'text.primary' : 'text.secondary'
                                            }}
                                            noWrap
                                        >
                                            {folder.name}
                                        </Typography>
                                        {level > 0 && (
                                            <Typography
                                                variant="caption"
                                                sx={{ color: 'text.disabled', fontSize: '0.7rem' }}
                                            >
                                                Level {level + 1}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Item count badge */}
                                    <Tooltip title={`${folder.children?.length || 0} subfolders, ${folder.files?.length || 0} files`}>
                                        <Box
                                            sx={{
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 1,
                                                bgcolor: hasChildren ? 'rgba(25, 118, 210, 0.1)' : 'rgba(0,0,0,0.05)',
                                                mr: 1
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: hasChildren ? 'primary.main' : 'text.disabled',
                                                    fontSize: '0.7rem'
                                                }}
                                            >
                                                {(folder.children?.length || 0) + (folder.files?.length || 0)} items
                                            </Typography>
                                        </Box>
                                    </Tooltip>

                                    {/* Actions */}
                                    <Box
                                        className="folder-actions"
                                        sx={{ opacity: 0, transition: 'opacity 0.2s', display: 'flex', gap: 0.5 }}
                                    >
                                        <Tooltip title="Add Subfolder">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => { e.stopPropagation(); openFolderDialog(folder.id); }}
                                                sx={{ bgcolor: 'rgba(25, 118, 210, 0.1)', '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.2)' } }}
                                            >
                                                <CreateNewFolderIcon fontSize="small" color="primary" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Upload File Here">
                                            <IconButton
                                                size="small" component="label"
                                                onClick={(e) => e.stopPropagation()}
                                                sx={{ bgcolor: 'rgba(56, 142, 60, 0.1)', '&:hover': { bgcolor: 'rgba(56, 142, 60, 0.2)' } }}
                                            >
                                                <AddIcon fontSize="small" color="success" />
                                                <input type="file" hidden multiple onChange={(e) => handleFileUpload(e, folder.id)} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Folder">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteRequest('folder', folder); }}
                                                sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.2)' } }}
                                            >
                                                <DeleteIcon fontSize="small" color="error" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            }
                            sx={{
                                '& .MuiTreeItem-content': {
                                    borderRadius: 2,
                                    mb: 0.5,
                                    p: 0,
                                },
                                '& .MuiTreeItem-group': {
                                    ml: 0, // We handle indentation manually
                                }
                            }}
                        >
                            {renderTree(folder.children || [], folder.files || [], level + 1, currentPath)}
                        </TreeItem>
                    );
                })}

                {files.map((file, fileIndex) => {
                    const isLast = itemIndex === totalItems - 1;
                    itemIndex++;

                    return (
                        <TreeItem
                            key={`file-${file.id}`}
                            itemId={`file-${file.id}`}
                            label={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        py: 1,
                                        px: 1.5,
                                        ml: level * 2, // Match folder indentation
                                        borderRadius: 2,
                                        position: 'relative',
                                        borderLeft: level > 0 ? `2px dashed ${CONNECTOR_COLOR}` : 'none',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                                            '& .file-actions': { opacity: 1 }
                                        }
                                    }}
                                    onContextMenu={(e) => handleContextMenu(e, 'file', file)}
                                >
                                    {/* Subdirectory arrow for nested files */}
                                    {level > 0 && (
                                        <SubdirectoryIcon
                                            sx={{
                                                fontSize: 14,
                                                color: 'text.disabled',
                                                mr: 0.5,
                                                transform: 'rotate(0deg)'
                                            }}
                                        />
                                    )}

                                    {/* File icon */}
                                    {getFileIcon(file.file_type)}

                                    {/* File info */}
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography variant="body2" noWrap sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                                            {file.name || file.file_name}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                                {formatFileSize(file.file_size)}
                                            </Typography>
                                            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                                by {file.uploader_name || 'System'}
                                            </Typography>
                                            {file.uploaded_at && (
                                                <>
                                                    <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                                        {new Date(file.uploaded_at).toLocaleString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </Typography>
                                                </>
                                            )}
                                        </Stack>
                                    </Box>

                                    {/* Actions */}
                                    <Box
                                        className="file-actions"
                                        sx={{ opacity: 0, transition: 'opacity 0.2s', display: 'flex', gap: 0.5 }}
                                    >
                                        <Tooltip title="Download">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                                sx={{ bgcolor: 'rgba(25, 118, 210, 0.1)', '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.2)' } }}
                                            >
                                                <DownloadIcon fontSize="small" color="primary" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteRequest('file', file); }}
                                                sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.2)' } }}
                                            >
                                                <DeleteIcon fontSize="small" color="error" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            }
                            sx={{
                                '& .MuiTreeItem-content': {
                                    borderRadius: 2,
                                    mb: 0.5,
                                    p: 0,
                                }
                            }}
                        />
                    );
                })}
            </>
        );
    }, [handleContextMenu, handleFileUpload, handleDownload, handleDeleteRequest, openFolderDialog]);

    // =====================================================
    // RENDER
    // =====================================================
    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FolderOpenIcon color="primary" /> PROJECT FILES
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {treeData.folders.length} folders · {treeData.files.length} root files
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<CreateNewFolderIcon />}
                        onClick={() => openFolderDialog(null)}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        New Folder
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        component="label"
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        Upload Files
                        <input
                            type="file"
                            hidden
                            multiple
                            accept={getAllowedExtensions().map(ext => `.${ext}`).join(',')}
                            onChange={(e) => handleFileUpload(e)}
                        />
                    </Button>
                </Box>
            </Box>

            {/* Hierarchy Legend */}
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    mb: 2,
                    borderRadius: 2,
                    border: '1px solid #e0e0e0',
                    bgcolor: '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    flexWrap: 'wrap'
                }}
            >
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Depth Levels:
                </Typography>
                {['Root', 'Level 2', 'Level 3', 'Level 4', 'Level 5'].map((label, index) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c62828'][index]
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                    </Box>
                ))}
            </Paper>

            {/* File Size Limits Info Panel */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 3,
                    border: '1px solid #e3f2fd',
                    bgcolor: '#f8fbff',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        📁 Upload Limits by File Type
                    </Typography>
                    <Tooltip title="Limits are optimized for research data types">
                        <IconButton size="small">
                            <InfoIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(FILE_SIZE_CONFIG.limits).map(([category, limit]) => (
                        <Tooltip
                            key={category}
                            title={
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        {category.charAt(0).toUpperCase() + category.slice(1)} Files
                                    </Typography>
                                    <br />
                                    <Typography variant="caption">
                                        Formats: {FILE_CATEGORIES[category]?.slice(0, 5).join(', ')}
                                        {FILE_CATEGORIES[category]?.length > 5 ? '...' : ''}
                                    </Typography>
                                    <br />
                                    <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                                        {getUploadGuidance(category).tips[0]}
                                    </Typography>
                                </Box>
                            }
                        >
                            <Chip
                                size="small"
                                label={`${category}: ${formatBytes(limit)}`}
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    bgcolor: {
                                        document: '#e3f2fd',
                                        spreadsheet: '#e8f5e9',
                                        image: '#fff3e0',
                                        audio: '#fce4ec',
                                        video: '#f3e5f5',
                                        data: '#e0f7fa',
                                        archive: '#efebe9',
                                        code: '#f1f8e9',
                                        other: '#fafafa',
                                    }[category],
                                    cursor: 'help',
                                }}
                                onClick={() => setGuidanceDialog({ open: true, category })}
                            />
                        </Tooltip>
                    ))}
                </Box>
            </Paper>

            <UploadProgressBar progress={uploadProgress} />

            {/* Tree View */}
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: 4,
                        border: '1px solid #e0e0e0',
                        bgcolor: '#ffffff',
                        minHeight: 400
                    }}
                >
                    {treeData.folders.length === 0 && treeData.files.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <SimpleTreeView
                            expandedItems={expanded}
                            selectedItems={selected}
                            onExpandedItemsChange={(_, itemIds) => setExpanded(itemIds)}
                            onSelectedItemsChange={(_, itemIds) => setSelected(itemIds)}
                            sx={{
                                flexGrow: 1,
                                overflowY: 'auto',
                                '& .MuiTreeItem-root': {
                                    '& .MuiTreeItem-content': {
                                        padding: 0,
                                        borderRadius: 2,
                                    }
                                },
                                '& .MuiTreeItem-iconContainer': {
                                    width: 24,
                                    display: 'flex',
                                    justifyContent: 'center',
                                }
                            }}
                        >
                            {renderTree(treeData.folders, treeData.files)}
                        </SimpleTreeView>
                    )}
                </Paper>
            )}

            {/* Create Folder Dialog */}
            <Dialog
                open={folderDialogOpen}
                onClose={closeFolderDialog}
                maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {selectedParentFolder ? 'Create Subfolder' : 'Create New Folder'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Folder Name"
                        fullWidth
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && newFolderName.trim()) {
                                handleCreateFolder();
                            }
                        }}
                        helperText='Avoid special characters: < > : " / \\ | ? *'
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeFolderDialog}>Cancel</Button>
                    <Button
                        onClick={handleCreateFolder}
                        variant="contained"
                        disabled={!newFolderName.trim() || createFolderMutation.isLoading}
                        sx={{ borderRadius: 2 }}
                    >
                        {createFolderMutation.isLoading ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Context Menu */}
            <Menu
                open={contextMenu !== null}
                onClose={closeContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
                }
            >
                {contextItem?.type === 'folder' && (
                    <>
                        <MenuItem onClick={() => { openFolderDialog(contextItem.data.id); closeContextMenu(); }}>
                            <CreateNewFolderIcon sx={{ mr: 1, fontSize: 18 }} /> Add Subfolder
                        </MenuItem>
                        <MenuItem component="label">
                            <AddIcon sx={{ mr: 1, fontSize: 18 }} /> Upload File Here
                            <input
                                type="file"
                                hidden
                                multiple
                                accept={getAllowedExtensions().map(ext => `.${ext}`).join(',')}
                                onChange={(e) => {
                                    handleFileUpload(e, contextItem.data.id);
                                    closeContextMenu();
                                }}
                            />
                        </MenuItem>
                    </>
                )}
                {contextItem?.type === 'file' && (
                    <MenuItem onClick={() => { handleDownload(contextItem.data); closeContextMenu(); }}>
                        <DownloadIcon sx={{ mr: 1, fontSize: 18 }} /> Download
                    </MenuItem>
                )}
                <MenuItem
                    onClick={() => {
                        handleDeleteRequest(contextItem?.type, contextItem?.data);
                        closeContextMenu();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <DeleteIcon sx={{ mr: 1, fontSize: 18 }} /> Delete
                </MenuItem>
            </Menu>

            {/* Delete Confirmation */}
            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
                onConfirm={handleConfirmDelete}
                itemName={itemToDelete?.data?.name || itemToDelete?.data?.file_name || 'this item'}
                itemType={itemToDelete?.type === 'folder' ? 'Folder' : 'File'}
                requireNameConfirmation={itemToDelete?.type === 'folder'}
            />

            {/* Notification Snackbar */}
            <Snackbar
                open={notification.open}
                autoHideDuration={4000}
                onClose={closeNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={closeNotification}
                    severity={notification.severity}
                    variant="filled"
                    sx={{ borderRadius: 2, fontWeight: 600 }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>

            {/* Upload Errors Dialog */}
            <Dialog
                open={uploadErrors.length > 0}
                onClose={() => setUploadErrors([])}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', fontWeight: 800 }}>
                    Upload Issues ({uploadErrors.length} files)
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Stack spacing={2}>
                        {uploadErrors.map((error, index) => (
                            <Paper
                                key={index}
                                variant="outlined"
                                sx={{ p: 2, borderRadius: 2, borderColor: 'error.light' }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    {error.file}
                                </Typography>
                                <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
                                    {error.message}
                                </Typography>
                                {error.suggestion && (
                                    <Typography variant="caption" color="text.secondary">
                                        💡 {error.suggestion}
                                    </Typography>
                                )}
                            </Paper>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setUploadErrors([])} variant="contained">
                        Understood
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Upload Guidance Dialog */}
            <Dialog
                open={guidanceDialog.open}
                onClose={() => setGuidanceDialog({ open: false, category: null })}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                {guidanceDialog.category && (
                    <>
                        <DialogTitle sx={{ fontWeight: 800 }}>
                            {guidanceDialog.category.charAt(0).toUpperCase() + guidanceDialog.category.slice(1)} File Guidelines
                        </DialogTitle>
                        <DialogContent>
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <Paper
                                    variant="outlined"
                                    sx={{ p: 2, borderRadius: 2, bgcolor: '#f8f9fa' }}
                                >
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                        Maximum Size
                                    </Typography>
                                    <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800 }}>
                                        {formatBytes(FILE_SIZE_CONFIG.limits[guidanceDialog.category])}
                                    </Typography>
                                </Paper>

                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                        Supported Formats
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {FILE_CATEGORIES[guidanceDialog.category]?.map((ext) => (
                                            <Chip
                                                key={ext}
                                                label={`.${ext}`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                                            />
                                        ))}
                                    </Box>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                        Tips for Researchers
                                    </Typography>
                                    <Stack spacing={1}>
                                        {getUploadGuidance(guidanceDialog.category).tips.map((tip, i) => (
                                            <Typography key={i} variant="body2" color="text.secondary">
                                                • {tip}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </Box>
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ p: 2 }}>
                            <Button
                                onClick={() => setGuidanceDialog({ open: false, category: null })}
                                variant="contained"
                            >
                                Got it
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default FileTree;