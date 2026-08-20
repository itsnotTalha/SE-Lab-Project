import { ArrowUpRight } from 'lucide-react';

export default function StatCard({ label, value, helper, icon: Icon, tone = 'blue', pending = false }) {
	return (
		<article className={`stat-card stat-card--${tone}`}>
			<div className="stat-card__icon">{Icon ? <Icon size={19} /> : null}</div>
			<div>
				<p>{label}</p>
				<strong>{pending ? <span className="skeleton skeleton--value" /> : value}</strong>
				<span>{helper}</span>
			</div>
			<ArrowUpRight className="stat-card__arrow" size={16} aria-hidden="true" />
		</article>
	);
}
