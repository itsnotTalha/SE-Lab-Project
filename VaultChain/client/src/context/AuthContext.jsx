import { createContext, useContext, useEffect, useState } from 'react';

import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
	const [user, setUser] = useState(null);
	const [authLoading, setAuthLoading] = useState(authService.isAuthenticated());

	useEffect(() => {
		let active = true;

		if (!authService.isAuthenticated()) {
			setAuthLoading(false);
			return () => { active = false; };
		}

		authService.getCurrentUser()
			.then((currentUser) => {
				if (active) setUser(currentUser);
			})
			.catch(() => {
				if (active) {
					authService.logout();
					setIsAuthenticated(false);
				}
			})
			.finally(() => {
				if (active) setAuthLoading(false);
			});

		return () => { active = false; };
	}, []);

	async function login(credentials) {
		const authenticatedUser = await authService.login(credentials);
		setUser(authenticatedUser);
		setIsAuthenticated(true);
		return authenticatedUser;
	}

	async function register(payload) {
		const authenticatedUser = await authService.register(payload);
		setUser(authenticatedUser);
		setIsAuthenticated(true);
		return authenticatedUser;
	}

	function logout() {
		authService.logout();
		setIsAuthenticated(false);
		setUser(null);
	}

	return (
		<AuthContext.Provider value={{ isAuthenticated, user, authLoading, login, register, logout }}>
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
