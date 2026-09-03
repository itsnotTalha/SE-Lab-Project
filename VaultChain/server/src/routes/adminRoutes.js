const express = require('express');

const adminRepository = require('../repositories/adminRepository');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();
const ADMIN_ROLES = ['SUPER_ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN'];
const VALID_ROLES = [...ADMIN_ROLES, 'USER'];
const VALID_STATUSES = ['active', 'suspended', 'review'];
const VALID_LISTING_STATUSES = ['active', 'cancelled'];
const VALID_ASSET_STATUSES = ['active', 'review', 'suspicious', 'suspended'];

function rangeOptions(req) { return { range: req.query.range, from: req.query.from, to: req.query.to }; }

router.use(authenticateToken, authorizeRoles(...ADMIN_ROLES));

router.get('/overview', asyncHandler(async (req, res) => {
	const overview = await adminRepository.getOverview(rangeOptions(req));
	if (!['SUPER_ADMIN','MODERATOR'].includes(String(req.user.role).toUpperCase())) overview.securityEvents = [];
	res.json({ overview });
}));
router.get('/revenue', authorizeRoles('SUPER_ADMIN', 'FINANCE_ADMIN'), asyncHandler(async (req, res) => res.json({ revenue: await adminRepository.getRevenue(rangeOptions(req)) })));
router.get('/marketplace', asyncHandler(async (req, res) => res.json({ marketplace: await adminRepository.getMarketplace(rangeOptions(req)) })));
router.get('/transactions', authorizeRoles('SUPER_ADMIN', 'FINANCE_ADMIN'), asyncHandler(async (req, res) => res.json({ transactions: await adminRepository.getTransactions(rangeOptions(req)) })));
router.get('/users', authorizeRoles('SUPER_ADMIN'), asyncHandler(async (req, res) => res.json({ users: await adminRepository.getUsers(rangeOptions(req)) })));
router.get('/assets', authorizeRoles('SUPER_ADMIN', 'MODERATOR', 'VERIFICATION_ADMIN'), asyncHandler(async (req, res) => res.json({ assets: await adminRepository.getAssets(rangeOptions(req)) })));
router.get('/verification', authorizeRoles('SUPER_ADMIN', 'MODERATOR', 'VERIFICATION_ADMIN'), asyncHandler(async (req, res) => res.json({ verification: await adminRepository.getVerification(rangeOptions(req)) })));
router.get('/analytics', asyncHandler(async (req, res) => res.json({ analytics: await adminRepository.getAnalytics(rangeOptions(req)) })));
router.get('/security', authorizeRoles('SUPER_ADMIN', 'MODERATOR'), asyncHandler(async (req, res) => res.json({ security: await adminRepository.getSecurity() })));
router.get('/notifications', asyncHandler(async (req, res) => res.json({ notifications: await adminRepository.getNotifications(req.user.id) })));
router.patch('/notifications/read', asyncHandler(async (req, res) => { await adminRepository.markNotificationsRead(req.user.id); res.status(204).end(); }));
router.get('/logs', authorizeRoles('SUPER_ADMIN'), asyncHandler(async (req, res) => res.json({ logs: await adminRepository.getActivityLogs() })));
router.get('/settings', authorizeRoles('SUPER_ADMIN'), asyncHandler(async (req, res) => res.json({ settings: await adminRepository.getSettings() })));

router.patch('/settings/marketplace', authorizeRoles('SUPER_ADMIN'), asyncHandler(async (req, res) => {
	const commissionPercentage = Number(req.body.commissionPercentage); const minimumListingPrice = Number(req.body.minimumListingPrice);
	if (!Number.isFinite(commissionPercentage) || commissionPercentage < 0 || commissionPercentage > 20) { const error = new Error('Commission must be between 0% and 20%'); error.status = 400; throw error; }
	if (!Number.isFinite(minimumListingPrice) || minimumListingPrice <= 0 || minimumListingPrice > 1000000000) { const error = new Error('Minimum listing price must be a positive number'); error.status = 400; throw error; }
	await adminRepository.updateSetting('marketplace_commission_rate', String(commissionPercentage / 100), req.user.id);
	await adminRepository.updateSetting('minimum_listing_price', String(minimumListingPrice), req.user.id);
	await adminRepository.logAction({ adminId: req.user.id, action: 'updated_marketplace_settings', targetType: 'platform_settings', targetId: 'marketplace', details: { commissionPercentage, minimumListingPrice }, ipAddress: req.ip });
	res.json({ marketplace: { commissionPercentage, minimumListingPrice } });
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

router.patch('/listings/:id', authorizeRoles('SUPER_ADMIN', 'MODERATOR'), asyncHandler(async (req, res) => {
	const status = String(req.body.status || '').toLowerCase();
	if (!VALID_LISTING_STATUSES.includes(status)) { const error = new Error('Invalid listing status'); error.status = 400; throw error; }
	const listing = await adminRepository.updateListing(req.params.id, status);
	if (!listing) { const error = new Error('Listing not found'); error.status = 404; throw error; }
	await adminRepository.logAction({ adminId: req.user.id, action: 'updated_listing_status', targetType: 'listing', targetId: listing.public_reference, details: { status }, ipAddress: req.ip });
	res.json({ listing });
}));

router.patch('/assets/:id', authorizeRoles('SUPER_ADMIN', 'MODERATOR', 'VERIFICATION_ADMIN'), asyncHandler(async (req, res) => {
	const status = String(req.body.status || '').toLowerCase();
	if (!VALID_ASSET_STATUSES.includes(status)) { const error = new Error('Invalid asset status'); error.status = 400; throw error; }
	const asset = await adminRepository.updateAsset(req.params.id, status);
	if (!asset) { const error = new Error('Asset not found'); error.status = 404; throw error; }
	await adminRepository.logAction({ adminId: req.user.id, action: 'updated_asset_status', targetType: 'asset', targetId: req.params.id, details: { status }, ipAddress: req.ip });
	res.json({ asset });
}));

module.exports = router;
