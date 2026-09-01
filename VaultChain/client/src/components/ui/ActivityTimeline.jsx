import { CircleCheck, FileImage, Fingerprint, FileText, WalletCards } from 'lucide-react';

const icons = { asset_upload: FileImage, document_upload: FileText, verification: Fingerprint, sale: WalletCards, purchase: WalletCards };

export function relativeTime(date) {
	if (!date) return 'Recently';
	const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
	if (minutes < 10080) return `${Math.round(minutes / 1440)}d ago`;
	return new Date(date).toLocaleDateString();
}

export default function ActivityTimeline({ items = [], onSelect, compact = false }) {
	return <div className={`activity-timeline ${compact ? 'is-compact' : ''}`}>{items.map((item, index) => { const Icon = icons[item.type] || CircleCheck; return <button type="button" className="activity-timeline__item" key={`${item.type}-${item.reference || item.assetId || index}`} onClick={() => onSelect?.(item)}><span className="activity-timeline__line"/><span className="activity-timeline__icon"><Icon size={15}/></span><div><strong>{item.title || item.type?.replaceAll('_', ' ')}</strong><p>{item.detail || item.status?.replaceAll('_', ' ') || item.reference || 'Recorded securely'}</p></div><time>{relativeTime(item.createdAt)}</time></button>; })}</div>;
}
