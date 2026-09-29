// Preload page code on navigation intent; no API requests or page mounting.
const loaders = {
	'/': () => import('../pages/landing/LandingPage'),
	'/login': () => import('../pages/auth/LoginPage'),
	'/register': () => import('../pages/auth/RegisterPage'),
	'/blockchain': () => import('../pages/blockchain/BlockchainPage'),
	'/dashboard': () => import('../pages/dashboard/DashboardPage'),
	'/documents': () => import('../pages/documents/DocumentsPage'),
	'/assets': () => import('../pages/assets/AssetsPage'),
	'/upload': () => import('../pages/upload/UploadPage'),
	'/verification': () => import('../pages/verification/VerificationPage'),
	'/vault': () => import('../pages/vault/VaultPage'),
	'/profile': () => import('../pages/settings/ProfilePage'),
	'/settings': () => import('../pages/settings/SettingsPage'),
	'/analytics': () => import('../pages/analytics/AnalyticsPage'),
	'/earnings': () => import('../pages/earnings/EarningsPage'),
	'/activity': () => import('../pages/activity/ActivityPage'),
	'/wallet': () => import('../pages/wallet/WalletPage'),
	'/marketplace': () => import('../pages/marketplace/MarketplacePage'),
	'/admin/dashboard': () => import('../pages/admin/AdminDashboardPage'),
	'/admin/revenue': () => import('../pages/admin/AdminRevenuePage'),
	'/admin/marketplace': () => import('../pages/admin/AdminMarketplacePage'),
	'/admin/transactions': () => import('../pages/admin/AdminTransactionsPage'),
	'/admin/users': () => import('../pages/admin/AdminUsersPage'),
	'/admin/assets': () => import('../pages/admin/AdminAssetsPage'),
	'/admin/verification': () => import('../pages/admin/AdminVerificationPage'),
	'/admin/analytics': () => import('../pages/admin/AdminAnalyticsPage'),
	'/admin/security': () => import('../pages/admin/AdminSecurityPage'),
	'/admin/logs': () => import('../pages/admin/AdminLogsPage'),
	'/admin/settings': () => import('../pages/admin/AdminSettingsPage'),
};
const pending = new Map();

export function preloadPage(path) {
	if (typeof navigator !== 'undefined' && (navigator.connection?.saveData || /(^|-)2g$/.test(navigator.connection?.effectiveType || ''))) return;
	const load = loaders[path];
	if (!load || pending.has(path)) return;
	pending.set(path, load().catch(() => { pending.delete(path); }));
}
