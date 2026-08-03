import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './src/components/common/ProtectedRoute';
import AssetsPage from './src/pages/assets/AssetsPage';
import DashboardPage from './src/pages/dashboard/DashboardPage';
import LoginPage from './src/pages/auth/LoginPage';
import RegisterPage from './src/pages/auth/RegisterPage';
import ProfilePage from './src/pages/settings/ProfilePage';
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
