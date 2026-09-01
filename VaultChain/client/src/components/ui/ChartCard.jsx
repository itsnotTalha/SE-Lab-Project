import { MoreHorizontal } from 'lucide-react';

export default function ChartCard({ title, description, action, className = '', children }) {
	return <section className={`chart-card ${className}`.trim()}><header><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{action || <button type="button" className="icon-button chart-card__menu" aria-label={`More options for ${title}`}><MoreHorizontal size={17}/></button>}</header><div className="chart-card__content">{children}</div></section>;
}
