import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';

import ProtectedRoute from './src/components/common/ProtectedRoute';
import RoleGuard from './src/components/admin/RoleGuard';
import { defaultRouteForRole } from './src/components/admin/PermissionManager';
import LoadingState from './src/components/ui/LoadingState';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppShell from './src/layouts/AppShell';
import AdminShell from './src/layouts/AdminShell';

const AssetsPage = lazy(() => import('./src/pages/assets/AssetsPage'));
const AssetInspectPage = lazy(() => import('./src/pages/assets/AssetInspectPage'));
const LoginPage = lazy(() => import('./src/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./src/pages/auth/RegisterPage'));
const DashboardPage = lazy(() => import('./src/pages/dashboard/DashboardPage'));
const DocumentsPage = lazy(() => import('./src/pages/documents/DocumentsPage'));
const LandingPage = lazy(() => import('./src/pages/landing/LandingPage'));
const ListingDetails = lazy(() => import('./src/pages/marketplace/ListingDetails'));
const MarketplacePage = lazy(() => import('./src/pages/marketplace/MarketplacePage'));
const ProfilePage = lazy(() => import('./src/pages/settings/ProfilePage'));
const SettingsPage = lazy(() => import('./src/pages/settings/SettingsPage'));
const AnalyticsPage = lazy(() => import('./src/pages/analytics/AnalyticsPage'));
const EarningsPage = lazy(() => import('./src/pages/earnings/EarningsPage'));
const ActivityPage = lazy(() => import('./src/pages/activity/ActivityPage'));
const UploadPage = lazy(() => import('./src/pages/upload/UploadPage'));
const VerificationPage = lazy(() => import('./src/pages/verification/VerificationPage'));
const VaultDetailPage = lazy(() => import('./src/pages/vault/VaultDetailPage'));
const VaultPage = lazy(() => import('./src/pages/vault/VaultPage'));
const WalletPage = lazy(() => import('./src/pages/wallet/WalletPage'));
const AdminDashboardPage = lazy(() => import('./src/pages/admin/AdminDashboardPage'));
const AdminRevenuePage = lazy(() => import('./src/pages/admin/AdminRevenuePage'));
const AdminMarketplacePage = lazy(() => import('./src/pages/admin/AdminMarketplacePage'));
const AdminTransactionsPage = lazy(() => import('./src/pages/admin/AdminTransactionsPage'));
const AdminUsersPage = lazy(() => import('./src/pages/admin/AdminUsersPage'));
const AdminAssetsPage = lazy(() => import('./src/pages/admin/AdminAssetsPage'));
const AdminVerificationPage = lazy(() => import('./src/pages/admin/AdminVerificationPage'));
const AdminAnalyticsPage = lazy(() => import('./src/pages/admin/AdminAnalyticsPage'));
const AdminSecurityPage = lazy(() => import('./src/pages/admin/AdminSecurityPage'));
const AdminLogsPage = lazy(() => import('./src/pages/admin/AdminLogsPage'));
const AdminSettingsPage = lazy(() => import('./src/pages/admin/AdminSettingsPage'));

function PublicOnlyRoute({ children }) {
	const { isAuthenticated, user, authLoading } = useAuth();
	if (authLoading) return <LoadingState fullScreen label="Securing your workspace" />;
	if (!authLoading && isAuthenticated) return <Navigate to={defaultRouteForRole(user?.role)} replace />;
	return children;
}

function AppRoutes() {
	return (
		<Suspense fallback={<LoadingState fullScreen label="Loading VaultChain"/>}><Routes>
			<Route path="/" element={<LandingPage />} />
			<Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
			<Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
			<Route element={<ProtectedRoute />}>
				<Route element={<AppShell />}>
					<Route path="/dashboard" element={<DashboardPage />} />
					<Route path="/documents" element={<DocumentsPage />} />
					<Route path="/assets" element={<AssetsPage />} />
					<Route path="/assets/:assetId/inspect" element={<AssetInspectPage />} />
					<Route path="/upload" element={<UploadPage />} />
					<Route path="/verification" element={<VerificationPage />} />
					<Route path="/vault" element={<VaultPage />} />
					<Route path="/vault/:reference" element={<VaultDetailPage />} />
					<Route path="/profile" element={<ProfilePage />} />
					<Route path="/settings" element={<SettingsPage />} />
					<Route path="/analytics" element={<AnalyticsPage />} />
					<Route path="/earnings" element={<EarningsPage />} />
					<Route path="/activity" element={<ActivityPage />} />
					<Route path="/wallet" element={<WalletPage />} />
					<Route path="/marketplace" element={<MarketplacePage />} />
					<Route path="/marketplace/:id" element={<ListingDetails />} />
				</Route>
				<Route path="/admin" element={<RoleGuard><AdminShell /></RoleGuard>}>
					<Route index element={<Navigate to="/admin/dashboard" replace />} />
					<Route path="dashboard" element={<AdminDashboardPage />} />
					<Route path="revenue" element={<RoleGuard roles={['SUPER_ADMIN', 'FINANCE_ADMIN']}><AdminRevenuePage /></RoleGuard>} />
					<Route path="marketplace" element={<AdminMarketplacePage />} />
					<Route path="transactions" element={<RoleGuard roles={['SUPER_ADMIN', 'FINANCE_ADMIN']}><AdminTransactionsPage /></RoleGuard>} />
					<Route path="users" element={<RoleGuard roles={['SUPER_ADMIN']}><AdminUsersPage /></RoleGuard>} />
					<Route path="assets" element={<RoleGuard roles={['SUPER_ADMIN', 'MODERATOR', 'VERIFICATION_ADMIN']}><AdminAssetsPage /></RoleGuard>} />
					<Route path="verification" element={<RoleGuard roles={['SUPER_ADMIN', 'MODERATOR', 'VERIFICATION_ADMIN']}><AdminVerificationPage /></RoleGuard>} />
					<Route path="analytics" element={<AdminAnalyticsPage />} />
					<Route path="security" element={<RoleGuard roles={['SUPER_ADMIN', 'MODERATOR']}><AdminSecurityPage /></RoleGuard>} />
					<Route path="logs" element={<RoleGuard roles={['SUPER_ADMIN']}><AdminLogsPage /></RoleGuard>} />
					<Route path="settings" element={<RoleGuard roles={['SUPER_ADMIN']}><AdminSettingsPage /></RoleGuard>} />
				</Route>
			</Route>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes></Suspense>
	);
}

export default function App() {
	return <ThemeProvider><BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter></ThemeProvider>;
}
