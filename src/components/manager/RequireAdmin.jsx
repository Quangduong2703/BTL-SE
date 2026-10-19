import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

export default function RequireAdmin() {
    const { user } = useAuth();
    const location = useLocation();

    const hasToken = Boolean(user?.token);
    const isAdmin = user?.role === 'admin';
    const isActive = user?.status !== 'banned';

    if (!hasToken) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (!isActive) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
