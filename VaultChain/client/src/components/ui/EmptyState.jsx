export default function EmptyState({ icon: Icon, title, description, action }) {
	return (
		<div className="empty-state">
			{Icon ? <span className="empty-state__icon"><Icon size={23} /></span> : null}
			<h3>{title}</h3>
			<p>{description}</p>
			{action}
		</div>
	);
}
