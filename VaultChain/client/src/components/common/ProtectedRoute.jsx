import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import LoadingState from '../ui/LoadingState';

export default function ProtectedRoute() {
	const location = useLocation();
	const { isAuthenticated, authLoading } = useAuth();

	if (authLoading) {
		return <LoadingState fullScreen label="Securing your workspace" />;
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return <Outlet />;
}
