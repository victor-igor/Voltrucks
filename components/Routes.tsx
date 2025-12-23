import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RouteProps {
    children?: React.ReactNode;
}

export const PrivateRoute: React.FC<RouteProps> = ({ children }) => {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-background-dark">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!session) {
        // user is not authenticated
        return <Navigate to="/login" replace />;
    }

    // authorized, render Outlet (for nested routes) or children
    return children ? <>{children}</> : <Outlet />;
};

export const PublicRoute: React.FC<RouteProps> = ({ children }) => {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-background-dark">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (session) {
        // user is authenticated, redirect to dashboard
        return <Navigate to="/" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};
