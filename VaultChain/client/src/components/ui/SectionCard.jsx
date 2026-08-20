export default function SectionCard({ title, description, action, className = '', children }) {
	return (
		<section className={`section-card ${className}`.trim()}>
			{title || action ? (
				<header className="section-card__header">
					<div>
						{title ? <h2>{title}</h2> : null}
						{description ? <p>{description}</p> : null}
					</div>
					{action}
				</header>
			) : null}
			{children}
		</section>
	);
}
