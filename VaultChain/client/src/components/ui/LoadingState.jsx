export default function LoadingState({ label = 'Loading', fullScreen = false }) {
	return (
		<div className={`loading-state ${fullScreen ? 'loading-state--fullscreen' : ''}`} role="status">
			<span className="loading-state__spinner" aria-hidden="true" />
			<span>{label}</span>
		</div>
	);
}
