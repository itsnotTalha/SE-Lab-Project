import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './src/components/common/ProtectedRoute';
import AssetsPage from './src/pages/assets/AssetsPage';
import DashboardPage from './src/pages/dashboard/DashboardPage';
import LoginPage from './src/pages/auth/LoginPage';
import RegisterPage from './src/pages/auth/RegisterPage';
import ListingDetails from './src/pages/marketplace/ListingDetails';
import MarketplacePage from './src/pages/marketplace/MarketplacePage';
import ProfilePage from './src/pages/settings/ProfilePage';
import WalletPage from './src/pages/wallet/WalletPage';
import { AuthProvider, useAuth } from './src/context/AuthContext';

function PublicRoute({ children }) {
	const { isAuthenticated } = useAuth();

	if (isAuthenticated) {
		return <Navigate to="/dashboard" replace />;
	}

	return children;
}

function AppRoutes() {
	const { isAuthenticated } = useAuth();

	return (
		<Routes>
			<Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
			<Route
				path="/login"
				element={
					<PublicRoute>
						<LoginPage />
					</PublicRoute>
				}
			/>
			<Route
				path="/register"
				element={
					<PublicRoute>
						<RegisterPage />
					</PublicRoute>
				}
			/>
			<Route element={<ProtectedRoute />}>
				<Route path="/dashboard" element={<DashboardPage />} />
				<Route path="/assets" element={<AssetsPage />} />
				<Route path="/profile" element={<ProfilePage />} />
				<Route path="/wallet" element={<WalletPage />} />
				<Route path="/marketplace" element={<MarketplacePage />} />
				<Route path="/marketplace/:id" element={<ListingDetails />} />
			</Route>
			<Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
		</Routes>
	);
}

export default function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<AppRoutes />
			</AuthProvider>
		</BrowserRouter>
	);
}
