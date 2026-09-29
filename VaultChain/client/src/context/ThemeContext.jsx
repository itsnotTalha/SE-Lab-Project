import { MotionConfig } from 'framer-motion';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

function getInitialTheme() {
	const saved = window.localStorage.getItem('vaultchain-theme');
	if (saved === 'light' || saved === 'dark') return saved;
	return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
	const [theme, setTheme] = useState(getInitialTheme);
	const [motionEnabled, setMotionEnabled] = useState(() => window.localStorage.getItem('vaultchain-motion') !== 'off');
	useEffect(() => {
		document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off';
		window.localStorage.setItem('vaultchain-motion', motionEnabled ? 'on' : 'off');
	}, [motionEnabled]);

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		document.documentElement.style.colorScheme = theme;
		window.localStorage.setItem('vaultchain-theme', theme);
	}, [theme]);

	const value = useMemo(() => ({
		theme,
		motionEnabled,
		toggleMotion: () => setMotionEnabled((current) => !current),
		setTheme,
		toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark'),
	}), [theme, motionEnabled]);

	return <ThemeContext.Provider value={value}><MotionConfig reducedMotion={motionEnabled ? 'user' : 'always'}>{children}</MotionConfig></ThemeContext.Provider>;
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) throw new Error('useTheme must be used inside ThemeProvider');
	return context;
}
