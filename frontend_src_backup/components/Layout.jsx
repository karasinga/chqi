import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        ResearchEval Mission Control
                    </Typography>
                    <Button color="inherit" component={Link} to="/">Projects</Button>
                </Toolbar>
            </AppBar>
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                {children}
            </Container>
        </Box>
    );
};

export default Layout;
