import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import PublicSite from './pages/PublicSite';
import PublicDashboardsPage from './pages/PublicDashboardsPage';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/TaskManagement';
import Portfolio from './pages/PortfolioDashboard';
import Settings from './pages/Settings';
import ProjectDetail from './pages/ProjectDetails';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage';
import UserGuide from './pages/UserGuide';
import { isLandingDomain, DASHBOARD_BASE_URL } from './utils/site';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Layout>{children}</Layout>;
};

// Smart root route: authenticated → Dashboard, unauthenticated → PublicSite
const RootRoute = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (user) {
        return <Layout><Dashboard /></Layout>;
    }

    return <PublicSite />;
};

const PublicRoute = ({ children }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// On the landing domain (chqi.org) there is no app — send auth-related routes
// to the real app on dashboards.chqi.org, preserving the path (e.g. reset tokens).
const ExternalRedirect = ({ base = DASHBOARD_BASE_URL }) => {
    React.useEffect(() => {
        const { pathname, search, hash } = window.location;
        window.location.replace(`${base}${pathname}${search}${hash}`);
    }, [base]);

    return <LoadingScreen />;
};

const AppRoutes = () => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={
                    isLandingDomain() ? (
                        <ExternalRedirect />
                    ) : (
                        <PublicRoute>
                            <LandingPage />
                        </PublicRoute>
                    )
                }
            />
            <Route
                path="/reset-password/:uidb64/*"
                element={
                    isLandingDomain() ? (
                        <ExternalRedirect />
                    ) : (
                        <PasswordResetConfirmPage />
                    )
                }
            />

            {/* Public dashboard portal (no login required) */}
            <Route
                path="/dashboards"
                element={<PublicDashboardsPage />}
            />

            {/* Protected Routes */}
            <Route
                path="/"
                element={<RootRoute />}
            />
            <Route
                path="/tasks"
                element={
                    <ProtectedRoute>
                        <Tasks />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/portfolio"
                element={
                    <ProtectedRoute>
                        <Portfolio />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/projects/:id"
                element={
                    <ProtectedRoute>
                        <ProjectDetail />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/guide"
                element={
                    <ProtectedRoute>
                        <UserGuide />
                    </ProtectedRoute>
                }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
};

export default App;