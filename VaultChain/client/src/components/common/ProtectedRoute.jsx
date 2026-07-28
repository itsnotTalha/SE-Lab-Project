import { Navigate, Outlet, useLocation } from 'react-router-dom';

function isAuthenticated() {
	return Boolean(localStorage.getItem('vaultchain_token'));
}

export default function ProtectedRoute() {
	const location = useLocation();

	if (!isAuthenticated()) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	return <Outlet />;
}