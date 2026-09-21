import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'vaultchain-theme';

function getInitialTheme() {
	// index.html applies `data-theme` before first paint; trust it so the
	// React state matches what the user is already seeing.
	if (typeof document === 'undefined') return 'dark';
	const current = document.documentElement.getAttribute('data-theme');
	return current === 'light' ? 'light' : 'dark';
}

function readStoredTheme() {
	try {
		const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
		return stored === 'light' || stored === 'dark' ? stored : null;
	} catch {
		return null;
	}
}

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
	const [theme, setTheme] = useState(getInitialTheme);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
		document.querySelectorAll('meta[name="theme-color"][data-theme-color]').forEach((meta) => {
			if (meta.getAttribute('data-theme-color') === theme) {
				meta.setAttribute('media', '');
			} else {
				meta.setAttribute('media', 'not all');
			}
		});
	}, [theme]);

	// While the user has not made an explicit choice, follow the OS preference.
	useEffect(() => {
		if (readStoredTheme()) return undefined;
		if (!window.matchMedia) return undefined;
		const query = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (event) => setTheme(event.matches ? 'dark' : 'light');
		query.addEventListener('change', handleChange);
		return () => query.removeEventListener('change', handleChange);
	}, []);

	const toggleTheme = useCallback(() => {
		setTheme((current) => {
			const next = current === 'dark' ? 'light' : 'dark';
			try {
				window.localStorage.setItem(THEME_STORAGE_KEY, next);
			} catch {
				// Storage unavailable (private mode): theme still switches for this visit.
			}
			return next;
		});
	}, []);

	const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	return useContext(ThemeContext);
}
