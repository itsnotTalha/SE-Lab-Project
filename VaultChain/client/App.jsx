import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './src/components/common/ProtectedRoute';
import LoadingState from './src/components/ui/LoadingState';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppShell from './src/layouts/AppShell';
import AssetsPage from './src/pages/assets/AssetsPage';
import LoginPage from './src/pages/auth/LoginPage';
import RegisterPage from './src/pages/auth/RegisterPage';
import DashboardPage from './src/pages/dashboard/DashboardPage';
import LandingPage from './src/pages/landing/LandingPage';
import ListingDetails from './src/pages/marketplace/ListingDetails';
import MarketplacePage from './src/pages/marketplace/MarketplacePage';
import ProfilePage from './src/pages/settings/ProfilePage';
import VerificationPage from './src/pages/verification/VerificationPage';
import WalletPage from './src/pages/wallet/WalletPage';

function PublicOnlyRoute({ children }) {
	const { isAuthenticated, authLoading } = useAuth();
	if (authLoading) return <LoadingState fullScreen label="Securing your workspace" />;
	if (!authLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;
	return children;
}

function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<LandingPage />} />
			<Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
			<Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
			<Route element={<ProtectedRoute />}>
				<Route element={<AppShell />}>
					<Route path="/dashboard" element={<DashboardPage />} />
					<Route path="/assets" element={<AssetsPage />} />
					<Route path="/verification" element={<VerificationPage />} />
					<Route path="/profile" element={<ProfilePage />} />
					<Route path="/wallet" element={<WalletPage />} />
					<Route path="/marketplace" element={<MarketplacePage />} />
					<Route path="/marketplace/:id" element={<ListingDetails />} />
				</Route>
			</Route>
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export default function App() {
	return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>;
}
