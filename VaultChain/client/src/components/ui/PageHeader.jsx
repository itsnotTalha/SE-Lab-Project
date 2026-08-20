export default function PageHeader({ eyebrow, title, description, action }) {
	return (
		<header className="page-header">
			<div>
				{eyebrow ? <span className="page-header__eyebrow">{eyebrow}</span> : null}
				<h1>{title}</h1>
				{description ? <p>{description}</p> : null}
			</div>
			{action ? <div className="page-header__action">{action}</div> : null}
		</header>
	);
}
