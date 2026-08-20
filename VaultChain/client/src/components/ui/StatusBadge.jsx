export default function StatusBadge({ tone = 'neutral', children, className = '' }) {
	return <span className={`status-badge status-badge--${tone} ${className}`.trim()}>{children}</span>;
}
