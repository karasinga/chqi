import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Box, Tabs, Tab } from '@mui/material';
import { Gantt } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";

const ProjectDetails = () => {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [tab, setTab] = useState(0);

    useEffect(() => {
        fetch(`http://localhost:8000/api/projects/${id}/`)
            .then(res => res.json())
            .then(data => setProject(data));

        fetch(`http://localhost:8000/api/pm/tasks/?project_id=${id}`)
            .then(res => res.json())
            .then(data => {
                // Transform tasks for gantt-task-react
                const ganttTasks = data.map(t => ({
                    start: new Date(t.start_date),
                    end: new Date(new Date(t.start_date).setDate(new Date(t.start_date).getDate() + t.duration)),
                    name: t.name,
                    id: String(t.id),
                    type: 'task',
                    progress: 0,
                    isDisabled: false,
                    styles: { progressColor: '#ffbb54', progressSelectedColor: '#ff9e0d' },
                }));
                setTasks(ganttTasks);
            });
    }, [id]);

    if (!project) return <div>Loading...</div>;

    return (
        <div>
            <Typography variant="h4">{project.name}</Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Overview" />
                    <Tab label="Gantt Chart" />
                    <Tab label="Power BI" />
                    <Tab label="Files" />
                </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
                {tab === 0 && <Typography>{project.description}</Typography>}
                {tab === 1 && (tasks.length > 0 ? <Gantt tasks={tasks} /> : <Typography>No tasks found.</Typography>)}
                {tab === 2 && <Typography>Power BI Embed Placeholder</Typography>}
                {tab === 3 && <Typography>File Manager Placeholder</Typography>}
            </Box>
        </div>
    );
};

export default ProjectDetails;
