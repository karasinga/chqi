import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, TextField, Box, Stepper, Step, StepLabel,
    Alert, IconButton
} from '@mui/material';
import {
    Warning as WarningIcon,
    DeleteForever as DeleteForeverIcon,
    Close as CloseIcon
} from '@mui/icons-material';

const DeleteConfirmationModal = ({
    open,
    onClose,
    onConfirm,
    itemName,
    itemType = 'Project',
    requireNameConfirmation = true
}) => {
    const [activeStep, setActiveStep] = useState(0);
    const [confirmText, setConfirmText] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        if (open) {
            setActiveStep(0);
            setConfirmText('');
            setError(false);
        }
    }, [open]);

    const handleNext = () => {
        setActiveStep((prev) => prev + 1);
    };

    const handleConfirm = () => {
        if (!requireNameConfirmation || confirmText === itemName) {
            onConfirm();
            onClose();
        } else {
            setError(true);
        }
    };

    const steps = ['Warning', 'Final Confirmation'];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    p: 1,
                    borderTop: '6px solid #f44336'
                }
            }}
        >
            <Box sx={{ position: 'absolute', right: 8, top: 8 }}>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>

            <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
                <Box sx={{
                    bgcolor: '#ffebee',
                    color: '#d32f2f',
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                }}>
                    <WarningIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    Delete {itemType}?
                </Typography>
            </DialogTitle>

            <DialogContent>
                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 0 ? (
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                            You are about to delete <strong>{itemName}</strong>.
                        </Typography>
                        <Alert severity="warning" sx={{ textAlign: 'left', borderRadius: 2 }}>
                            This action will permanently delete this {itemType.toLowerCase()} and cannot be undone.
                        </Alert>
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center' }}>
                        {requireNameConfirmation ? (
                            <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    To confirm, please type <strong>{itemName}</strong> below.
                                </Typography>
                                <TextField
                                    fullWidth
                                    value={confirmText}
                                    onChange={(e) => {
                                        setConfirmText(e.target.value);
                                        setError(false);
                                    }}
                                    error={error}
                                    helperText={error ? "Name does not match" : ""}
                                    placeholder={itemName}
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': { borderRadius: 3 },
                                        bgcolor: '#f9fafb'
                                    }}
                                    autoFocus
                                />
                            </>
                        ) : (
                            <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                                Are you sure you want to proceed?
                            </Typography>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'center', gap: 1 }}>
                {activeStep === 0 ? (
                    <>
                        <Button
                            onClick={onClose}
                            variant="outlined"
                            sx={{ borderRadius: 3, fontWeight: 700, px: 3 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleNext}
                            variant="contained"
                            color="error"
                            sx={{ borderRadius: 3, fontWeight: 700, px: 3, boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)' }}
                        >
                            Continue
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            onClick={() => setActiveStep(0)}
                            sx={{ borderRadius: 3, fontWeight: 700, color: 'text.secondary' }}
                        >
                            Back
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            variant="contained"
                            color="error"
                            disabled={requireNameConfirmation && confirmText !== itemName}
                            startIcon={<DeleteForeverIcon />}
                            sx={{ borderRadius: 3, fontWeight: 700, px: 4, boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)' }}
                        >
                            Delete Forever
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default DeleteConfirmationModal;
