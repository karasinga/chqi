import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Menu, MenuItem, Tooltip, CircularProgress, Paper, Chip, LinearProgress
} from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import {
    Folder as FolderIcon, FolderOpen as FolderOpenIcon,
    InsertDriveFile as FileIcon, Add as AddIcon, CreateNewFolder as CreateNewFolderIcon,
    MoreVert as MoreVertIcon, Delete as DeleteIcon, Edit as EditIcon,
    Download as DownloadIcon, Visibility as VisibilityIcon,
    Description as DescriptionIcon, TableChart as TableChartIcon,
    PictureAsPdf as PdfIcon, AudioFile as AudioIcon, VideoFile as VideoIcon,
    Image as ImageIcon
} from '@mui/icons-material';
import api from '../utils/api';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const FileTree = ({ projectId, refreshTrigger }) => {
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState([]);
    const [selected, setSelected] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);

    // Dialog states
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedParentFolder, setSelectedParentFolder] = useState(null);

    // Context menu
    const [contextMenu, setContextMenu] = useState(null);
    const [contextItem, setContextItem] = useState(null);

    // Delete confirmation states
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Queries
    const { data: treeData = { folders: [], files: [] }, isLoading: loading } = useQuery({
        queryKey: ['fileTree', projectId, refreshTrigger],
        queryFn: () => api.get(`/folders/tree/?project=${projectId}`),
        enabled: !!projectId
    });

    // Mutations
    const createFolderMutation = useMutation({
        mutationFn: (folderData) => api.post('/folders/', folderData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
            setFolderDialogOpen(false);
            setNewFolderName('');
            setSelectedParentFolder(null);
        },
        onError: (err) => console.error('Error creating folder:', err)
    });

    const deleteFolderMutation = useMutation({
        mutationFn: (folderId) => api.delete(`/folders/${folderId}/`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] }),
        onError: (err) => console.error('Error deleting folder:', err)
    });

    const deleteFileMutation = useMutation({
        mutationFn: (fileId) => api.delete(`/files/${fileId}/`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] }),
        onError: (err) => console.error('Error deleting file:', err)
    });

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;
        createFolderMutation.mutate({
            name: newFolderName,
            project: projectId,
            parent: selectedParentFolder
        });
    };

    const handleFileUpload = async (event, folderId = null) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setUploadProgress(0);

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

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('project', projectId);
            if (folderId) formData.append('folder', folderId);

            try {
                const headers = {};
                if (csrftoken) {
                    headers['X-CSRFToken'] = csrftoken;
                }

                await fetch('http://localhost:8000/api/files/', {
                    method: 'POST',
                    headers: headers,
                    body: formData,
                    credentials: 'include'
                });
                setUploadProgress(((i + 1) / files.length) * 100);
            } catch (error) {
                console.error('Error uploading file:', error);
            }
        }

        setTimeout(() => {
            setUploadProgress(null);
            queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
        }, 1000);
    };

    const handleDeleteFolder = (folder) => {
        setItemToDelete({ type: 'folder', data: folder });
        setDeleteModalOpen(true);
    };

    const handleDeleteFile = (file) => {
        setItemToDelete({ type: 'file', data: file });
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!itemToDelete) return;

        if (itemToDelete.type === 'folder') {
            deleteFolderMutation.mutate(itemToDelete.data.id || itemToDelete.data);
        } else {
            deleteFileMutation.mutate(itemToDelete.data.id || itemToDelete.data);
        }

        setDeleteModalOpen(false);
        setItemToDelete(null);
    };

    const handleDownload = async (file) => {
        let url = file.file_url || file.file;
        if (!url) return;

        // If it's a relative URL, ensure it has the /media/ prefix and is absolute
        if (!url.startsWith('http')) {
            if (!url.startsWith('/')) url = '/' + url;
            if (!url.startsWith('/media/')) url = '/media' + url;
            url = `http://localhost:8000${url}`;
        }

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', file.file_name || file.name || 'download');
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback to opening in new tab if fetch fails (e.g. CORS)
            window.open(url, '_blank');
        }
    };

    const getFileIcon = (fileType) => {
        const iconProps = { sx: { fontSize: 18, mr: 1 } };
        switch (fileType) {
            case 'excel':
            case 'csv':
                return <TableChartIcon {...iconProps} sx={{ ...iconProps.sx, color: '#1d6f42' }} />;
            case 'word':
                return <DescriptionIcon {...iconProps} sx={{ ...iconProps.sx, color: '#2b579a' }} />;
            case 'pdf':
                return <PdfIcon {...iconProps} sx={{ ...iconProps.sx, color: '#d32f2f' }} />;
            case 'audio':
                return <AudioIcon {...iconProps} sx={{ ...iconProps.sx, color: '#f57c00' }} />;
            case 'video':
                return <VideoIcon {...iconProps} sx={{ ...iconProps.sx, color: '#7b1fa2' }} />;
            case 'image':
                return <ImageIcon {...iconProps} sx={{ ...iconProps.sx, color: '#0288d1' }} />;
            default:
                return <FileIcon {...iconProps} sx={{ ...iconProps.sx, color: '#757575' }} />;
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const renderTree = (folders, files, level = 0) => {
        return (
            <>
                {folders.map((folder) => (
                    <TreeItem
                        key={`folder-${folder.id}`}
                        itemId={`folder-${folder.id}`}
                        label={
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    py: 1,
                                    px: 1,
                                    borderRadius: 2,
                                    '&:hover': {
                                        bgcolor: 'rgba(25, 118, 210, 0.08)',
                                        '& .folder-actions': {
                                            opacity: 1
                                        }
                                    }
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY });
                                    setContextItem({ type: 'folder', data: folder });
                                }}
                            >
                                <FolderIcon sx={{ color: '#ffa726', mr: 1, fontSize: 20 }} />
                                <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                                    {folder.name}
                                </Typography>
                                <Box className="folder-actions" sx={{ opacity: 0, transition: 'opacity 0.2s', display: 'flex', gap: 0.5 }}>
                                    <Tooltip title="Add Subfolder">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedParentFolder(folder.id);
                                                setFolderDialogOpen(true);
                                            }}
                                        >
                                            <CreateNewFolderIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Upload File">
                                        <IconButton
                                            size="small"
                                            component="label"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <AddIcon fontSize="small" />
                                            <input
                                                type="file"
                                                hidden
                                                multiple
                                                onChange={(e) => handleFileUpload(e, folder.id)}
                                            />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete Folder">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFolder(folder);
                                            }}
                                            color="error"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        }
                        sx={{
                            '& .MuiTreeItem-content': {
                                borderRadius: 2,
                                mb: 0.5
                            }
                        }}
                    >
                        {renderTree(folder.children || [], folder.files || [], level + 1)}
                    </TreeItem>
                ))}
                {files.map((file) => (
                    <TreeItem
                        key={`file-${file.id}`}
                        itemId={`file-${file.id}`}
                        label={
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    py: 1,
                                    px: 1,
                                    borderRadius: 2,
                                    '&:hover': {
                                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                                        '& .file-actions': {
                                            opacity: 1
                                        }
                                    }
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY });
                                    setContextItem({ type: 'file', data: file });
                                }}
                            >
                                {getFileIcon(file.file_type)}
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                                        {file.name || file.file_name}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {formatFileSize(file.file_size)}
                                    </Typography>
                                </Box>
                                <Box className="file-actions" sx={{ opacity: 0, transition: 'opacity 0.2s', display: 'flex', gap: 0.5 }}>
                                    <Tooltip title="Download">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(file);
                                            }}
                                        >
                                            <DownloadIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFile(file);
                                            }}
                                            color="error"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        }
                        sx={{
                            '& .MuiTreeItem-content': {
                                borderRadius: 2,
                                mb: 0.5
                            }
                        }}
                    />
                ))}
            </>
        );
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderOpenIcon color="primary" /> PROJECT FILES
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<CreateNewFolderIcon />}
                        onClick={() => {
                            setSelectedParentFolder(null);
                            setFolderDialogOpen(true);
                        }}
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
                        <input type="file" hidden multiple onChange={(e) => handleFileUpload(e)} />
                    </Button>
                </Box>
            </Box>

            {/* Upload Progress */}
            {uploadProgress !== null && (
                <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={24} variant="determinate" value={uploadProgress} />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Uploading files... {Math.round(uploadProgress)}%
                            </Typography>
                            <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 1 }} />
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Tree View */}
            {loading ? (
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
                        bgcolor: '#fafafa',
                        minHeight: 400
                    }}
                >
                    {treeData.folders.length === 0 && treeData.files.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <FolderOpenIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="textSecondary">
                                No files or folders yet
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Create a folder or upload files to get started
                            </Typography>
                        </Box>
                    ) : (
                        <SimpleTreeView
                            expandedItems={expanded}
                            selectedItems={selected}
                            onExpandedItemsChange={(event, itemIds) => setExpanded(itemIds)}
                            onSelectedItemsChange={(event, itemIds) => setSelected(itemIds)}
                            sx={{
                                flexGrow: 1,
                                overflowY: 'auto',
                                '& .MuiTreeItem-root': {
                                    '& .MuiTreeItem-content': {
                                        padding: '4px 8px',
                                        borderRadius: 2
                                    }
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
                onClose={() => {
                    setFolderDialogOpen(false);
                    setNewFolderName('');
                    setSelectedParentFolder(null);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Create New Folder</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Folder Name"
                        fullWidth
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleCreateFolder();
                            }
                        }}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => {
                        setFolderDialogOpen(false);
                        setNewFolderName('');
                        setSelectedParentFolder(null);
                    }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateFolder}
                        variant="contained"
                        disabled={!newFolderName.trim()}
                        sx={{ borderRadius: 2 }}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Context Menu */}
            <Menu
                open={contextMenu !== null}
                onClose={() => setContextMenu(null)}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                {contextItem?.type === 'folder' && (
                    <MenuItem
                        onClick={() => {
                            setSelectedParentFolder(contextItem.data.id);
                            setFolderDialogOpen(true);
                            setContextMenu(null);
                        }}
                    >
                        <CreateNewFolderIcon sx={{ mr: 1, fontSize: 18 }} /> Add Subfolder
                    </MenuItem>
                )}
                {contextItem?.type === 'file' && (
                    <MenuItem
                        onClick={() => {
                            handleDownload(contextItem.data);
                            setContextMenu(null);
                        }}
                    >
                        <DownloadIcon sx={{ mr: 1, fontSize: 18 }} /> Download
                    </MenuItem>
                )}
                <MenuItem
                    onClick={() => {
                        if (contextItem?.type === 'folder') {
                            handleDeleteFolder(contextItem.data);
                        } else {
                            handleDeleteFile(contextItem.data);
                        }
                        setContextMenu(null);
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <DeleteIcon sx={{ mr: 1, fontSize: 18 }} /> Delete
                </MenuItem>
            </Menu>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                open={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                itemName={itemToDelete?.data?.name || itemToDelete?.data?.file_name || 'this item'}
                itemType={itemToDelete?.type === 'folder' ? 'Folder' : 'File'}
                requireNameConfirmation={itemToDelete?.type === 'folder'}
            />
        </Box>
    );
};

export default FileTree;
