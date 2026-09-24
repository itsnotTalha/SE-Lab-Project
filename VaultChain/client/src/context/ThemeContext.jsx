import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

function getInitialTheme() {
	const saved = window.localStorage.getItem('vaultchain-theme');
	if (saved === 'light' || saved === 'dark') return saved;
	return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
	const [theme, setTheme] = useState(getInitialTheme);

	useEffect(() => {
		const root = document.documentElement;
		root.classList.add('theme-switching');
		root.dataset.theme = theme;
		root.style.colorScheme = theme;
		window.localStorage.setItem('vaultchain-theme', theme);
		const timeout = window.setTimeout(() => root.classList.remove('theme-switching'), 320);
		return () => window.clearTimeout(timeout);
	}, [theme]);

	const value = useMemo(() => ({
		theme,
		setTheme,
		toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark'),
	}), [theme]);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) throw new Error('useTheme must be used inside ThemeProvider');
	return context;
}
