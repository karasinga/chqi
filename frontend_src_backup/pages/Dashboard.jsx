import React, { useState, useEffect } from 'react';
import { Typography, Grid, Card, CardContent, CardActions, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        fetch('http://localhost:8000/api/projects/')
            .then(res => res.json())
            .then(data => setProjects(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <Typography variant="h4" gutterBottom>Projects</Typography>
            <Grid container spacing={3}>
                {projects.map(project => (
                    <Grid item xs={12} md={4} key={project.id}>
                        <Card>
                            <CardContent>
                                <Typography variant="h5">{project.name}</Typography>
                                <Typography color="textSecondary">{project.status}</Typography>
                                <Typography variant="body2">{project.description}</Typography>
                            </CardContent>
                            <CardActions>
                                <Button size="small" component={Link} to={`/projects/${project.id}`}>View Details</Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </div>
    );
};

export default Dashboard;
