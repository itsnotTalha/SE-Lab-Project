import { createContext, useContext, useState } from 'react';

import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

	async function login(credentials) {
		const user = await authService.login(credentials);
		setIsAuthenticated(true);
		return user;
	}

	async function register(payload) {
		const user = await authService.register(payload);
		setIsAuthenticated(true);
		return user;
	}

	function logout() {
		authService.logout();
		setIsAuthenticated(false);
	}

	return (
		<AuthContext.Provider value={{ isAuthenticated, login, register, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}

	return context;
}
