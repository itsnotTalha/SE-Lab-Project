import { AlertTriangle, CheckCircle2, KeyRound, ShieldAlert } from 'lucide-react';

const icons = { high: ShieldAlert, medium: AlertTriangle, low: KeyRound, success: CheckCircle2 };

export default function ActivityTimeline({ items }) {
	return <div className="admin-timeline">{items.map((item, index) => { const Icon = icons[item.level] || CheckCircle2; const parsed = new Date(item.time?.endsWith?.('Z') ? item.time : `${item.time}Z`); return <article key={`${item.time}-${item.title}`}><div className={`admin-timeline__icon is-${item.level}`}><Icon size={15}/></div><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{Number.isNaN(parsed.getTime()) ? item.time : parsed.toLocaleString()}</time>{index < items.length - 1 ? <span/> : null}</article>; })}</div>;
}
