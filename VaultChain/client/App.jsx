import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './src/components/common/ProtectedRoute';
import AssetsPage from './src/pages/assets/AssetsPage';
import DashboardPage from './src/pages/dashboard/DashboardPage';
import LoginPage from './src/pages/auth/LoginPage';
import RegisterPage from './src/pages/auth/RegisterPage';
import ProfilePage from './src/pages/settings/ProfilePage';
import DocumentUploadPage from './src/pages/documents/DocumentUploadPage';
import DocumentListPage from './src/pages/documents/DocumentListPage';
import DocumentDetailsPage from './src/pages/documents/DocumentDetailsPage';
import OCRResultPage from './src/pages/documents/OCRResultPage';
import VerificationReportPage from './src/pages/documents/VerificationReportPage';
import VaultPage from './src/pages/vault/VaultPage';
import VaultDetailsPage from './src/pages/vault/VaultDetailsPage';

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
					<Route path="/documents" element={<DocumentListPage />} />
					<Route path="/documents/upload" element={<DocumentUploadPage />} />
					<Route path="/documents/:id" element={<DocumentDetailsPage />} />
					<Route path="/documents/:id/ocr" element={<OCRResultPage />} />
					<Route path="/documents/:id/report" element={<VerificationReportPage />} />
					<Route path="/vault" element={<VaultPage />} />
					<Route path="/vault/:id" element={<VaultDetailsPage />} />
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
