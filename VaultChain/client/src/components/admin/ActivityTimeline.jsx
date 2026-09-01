import { AlertTriangle, CheckCircle2, KeyRound, ShieldAlert } from 'lucide-react';

const icons = { high: ShieldAlert, medium: AlertTriangle, low: KeyRound, success: CheckCircle2 };

export default function ActivityTimeline({ items }) {
	return <div className="admin-timeline">{items.map((item, index) => { const Icon = icons[item.level] || CheckCircle2; return <article key={`${item.time}-${item.title}`}><div className={`admin-timeline__icon is-${item.level}`}><Icon size={15}/></div><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.time}</time>{index < items.length - 1 ? <span/> : null}</article>; })}</div>;
}

