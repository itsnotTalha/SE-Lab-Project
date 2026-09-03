import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import LoadingState from '../ui/LoadingState';
import { ADMIN_ROLES, normalizeRole } from './PermissionManager';

export default function RoleGuard({ roles = ADMIN_ROLES, children }) {
	const { user, authLoading } = useAuth();
	const location = useLocation();
	if (authLoading) return <LoadingState fullScreen label="Verifying administrator access" />;
	if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
	if (!roles.includes(normalizeRole(user.role))) {
		return <main className="admin-access-denied"><span><ShieldAlert size={28}/></span><h1>Administrator access required</h1><p>Your account does not have permission to open the VaultChain control center.</p><a href="/dashboard">Return to your workspace</a></main>;
	}
	return children;
}
