const ROLE_PERMISSIONS = {
	SUPER_ADMIN: ['*'],
	MODERATOR: ['reports.view', 'reports.manage', 'disputes.manage', 'security.view', 'assets.view'],
	FINANCE_ADMIN: ['transactions.view', 'revenue.view', 'payouts.manage', 'reports.export'],
	VERIFICATION_ADMIN: ['verification.view', 'verification.manage', 'assets.view', 'disputes.verification'],
};

export function normalizeRole(role) {
	return String(role || 'USER').toUpperCase();
}

export function hasPermission(role, permission) {
	const permissions = ROLE_PERMISSIONS[normalizeRole(role)] || [];
	return permissions.includes('*') || permissions.includes(permission);
}

export function permissionsFor(role) {
	return ROLE_PERMISSIONS[normalizeRole(role)] || [];
}

export default function PermissionManager({ role, permission, fallback = null, children }) {
	return hasPermission(role, permission) ? children : fallback;
}

