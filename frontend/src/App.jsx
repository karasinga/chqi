import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import PortfolioDashboard from './pages/PortfolioDashboard';
import TaskManagement from './pages/TaskManagement';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000,
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <Layout>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/projects/:id" element={<ProjectDetails />} />
                        <Route path="/portfolio" element={<PortfolioDashboard />} />
                        <Route path="/tasks" element={<TaskManagement />} />
                    </Routes>
                </Layout>
            </Router>

        </QueryClientProvider>
    );
}

export default App;
