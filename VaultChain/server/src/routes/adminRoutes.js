const express = require('express');

const adminRepository = require('../repositories/adminRepository');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();
const ADMIN_ROLES = ['SUPER_ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN'];
const VALID_ROLES = [...ADMIN_ROLES, 'USER'];
const VALID_STATUSES = ['active', 'suspended', 'review'];

router.use(authenticateToken, authorizeRoles(...ADMIN_ROLES));

router.get('/overview', asyncHandler(async (req, res) => res.json({ overview: await adminRepository.getOverview() })));
router.get('/users', authorizeRoles('SUPER_ADMIN'), asyncHandler(async (req, res) => res.json({ users: await adminRepository.getUsers() })));
router.get('/transactions', authorizeRoles('SUPER_ADMIN', 'FINANCE_ADMIN'), asyncHandler(async (req, res) => res.json({ transactions: await adminRepository.getTransactions() })));
router.get('/logs', authorizeRoles('SUPER_ADMIN'), asyncHandler(async (req, res) => res.json({ logs: await adminRepository.getActivityLogs() })));
router.get('/settings', authorizeRoles('SUPER_ADMIN'), asyncHandler(async (req, res) => res.json({ settings: await adminRepository.getSettings() })));

router.patch('/settings/marketplace-commission', authorizeRoles('SUPER_ADMIN'), asyncHandler(async (req, res) => {
	const percentage = Number(req.body.percentage);
	if (!Number.isFinite(percentage) || percentage < 0 || percentage > 20) { const error = new Error('Commission must be between 0% and 20%'); error.status = 400; throw error; }
	await adminRepository.updateSetting('marketplace_commission_rate', String(percentage / 100), req.user.id);
	await adminRepository.logAction({ adminId: req.user.id, action: 'changed_commission_rate', targetType: 'platform_setting', targetId: 'marketplace_commission_rate', details: { percentage }, ipAddress: req.ip });
	res.json({ marketplaceCommissionPercentage: percentage });
}));

router.patch('/users/:id', authorizeRoles('SUPER_ADMIN'), asyncHandler(async (req, res) => {
	const role = req.body.role ? String(req.body.role).toUpperCase() : undefined;
	const status = req.body.status ? String(req.body.status).toLowerCase() : undefined;
	if (role && !VALID_ROLES.includes(role)) { const error = new Error('Invalid role'); error.status = 400; throw error; }
	if (status && !VALID_STATUSES.includes(status)) { const error = new Error('Invalid status'); error.status = 400; throw error; }
	if (Number(req.params.id) === Number(req.user.id) && (status === 'suspended' || role === 'USER')) { const error = new Error('You cannot remove your own admin access'); error.status = 400; throw error; }
	const user = await adminRepository.updateUser(req.params.id, { role, status });
	if (!user) { const error = new Error('User not found'); error.status = 404; throw error; }
	await adminRepository.logAction({ adminId: req.user.id, action: 'updated_user_access', targetType: 'user', targetId: req.params.id, details: { role, status }, ipAddress: req.ip });
	res.json({ user });
}));

module.exports = router;
