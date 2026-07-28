import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './src/components/common/ProtectedRoute';
import AssetsPage from './src/pages/assets/AssetsPage';
import DashboardPage from './src/pages/dashboard/DashboardPage';
import LoginPage from './src/pages/auth/LoginPage';
import RegisterPage from './src/pages/auth/RegisterPage';
import ProfilePage from './src/pages/settings/ProfilePage';

function isAuthenticated() {
	return Boolean(localStorage.getItem('vaultchain_token'));
}

function PublicRoute({ children }) {
	if (isAuthenticated()) {
		return <Navigate to="/dashboard" replace />;
	}

	return children;
}

function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />} />
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
			</Route>
			<Route path="*" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />} />
		</Routes>
	);
}

export default function App() {
	return (
		<BrowserRouter>
			<AppRoutes />
		</BrowserRouter>
	);
}
