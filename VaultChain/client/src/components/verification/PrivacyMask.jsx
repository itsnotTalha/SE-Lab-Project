export default function PrivacyMask({ value, visibleStart = 5, className = '' }) {
	const text = String(value || 'Private owner');
	if (text.length <= visibleStart) return <span className={className}>{text}</span>;
	return <span className={className} aria-label="Privacy-protected owner reference">{text.slice(0, visibleStart)}<span aria-hidden="true">••••</span></span>;
}
