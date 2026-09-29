import { Activity, Eye, EyeOff, Menu, Moon, Pause, Play, Search, Sun } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Navbar({
	firstName,
	role,
	theme,
	onMenu,
	onSearch,
	onToggleTheme,
	motionEnabled,
	onToggleMotion,
	stealthMode = false,
	onToggleStealth,
}) {
	return (
		<header className="topbar">
			<button type="button" className="icon-button topbar__menu" aria-label="Open navigation" onClick={onMenu}>
				<Menu size={19} />
			</button>
			<button type="button" className="topbar__search" onClick={onSearch} aria-label="Search workspace">
				<Search size={16} />
				<span>Search workspace</span>
				<kbd>⌘ K</kbd>
			</button>
			<div className="topbar__actions">
				<span className="network-status"><i /> Your creative workspace</span>

				{/* Public Stealth Mode Toggle */}
				<button
					type="button"
					className={`icon-button ${stealthMode ? 'is-active' : ''}`}
					aria-label={stealthMode ? 'Disable stealth mode' : 'Enable public stealth mode (frosted blur)'}
					title={stealthMode ? 'Stealth Mode Active (Press B)' : 'Stealth Mode: Frosted Blur [B]'}
					onClick={onToggleStealth}
				>
					{stealthMode ? <EyeOff size={17} style={{ color: 'var(--primary, #41d9ff)' }} /> : <Eye size={17} />}
				</button>

				{/* Theme Toggle */}
				<button
					type="button"
					className="icon-button"
					aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
					onClick={onToggleTheme}
				>
					{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
				</button>

				{/* Motion Toggle */}
				<button
					type="button"
					className="icon-button"
					aria-label={motionEnabled ? 'Pause animations' : 'Enable animations'}
					aria-pressed={motionEnabled}
					title={motionEnabled ? 'Pause animations' : 'Enable animations'}
					onClick={onToggleMotion}
				>
					{motionEnabled ? <Pause size={17} /> : <Play size={17} />}
				</button>

				<NavLink to="/activity" className="icon-button" aria-label="View recent activity" title="Recent activity">
					<Activity size={17} />
				</NavLink>

				<NavLink to="/profile" className="topbar__profile">
					<span>{firstName.charAt(0).toUpperCase()}</span>
					<div>
						<strong>{firstName}</strong>
						<small>{role || 'Member'}</small>
					</div>
				</NavLink>
			</div>
		</header>
	);
}
