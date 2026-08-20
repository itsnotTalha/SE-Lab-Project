import { ArrowUpRight, Eye, Fingerprint } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import AssetThumbnail from './AssetThumbnail';

function formatFileSize(bytes) {
	if (!Number.isFinite(bytes)) return null;
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function AssetCard({ asset, onInspect, onPreview, view = 'grid' }) {
	const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;
	const uploadedAt = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

	return (
		<article className={`asset-card asset-card--${view}`}>
			<div className="asset-card__visual">
				<AssetThumbnail asset={asset} />
				{asset.hasHash ? <StatusBadge tone="info"><Fingerprint size={10} /> Hash generated</StatusBadge> : null}
			</div>
			<div className="asset-card__body">
				<div className="asset-card__heading">
					<div>
						<h3>{asset.title}</h3>
						<p>Asset #{asset.id} · {asset.category || asset.mimeType || 'File'}</p>
					</div>
					<ArrowUpRight size={17} aria-hidden="true" />
				</div>
				<div className="asset-card__meta">
					<span>{dimensions || asset.mimeType || 'File'}</span>
					<span>{formatFileSize(asset.fileSize) || uploadedAt || 'Stored asset'}</span>
				</div>
				<div className="asset-card__footer"><span>{uploadedAt ? `Uploaded ${uploadedAt}` : 'Upload date unavailable'}</span><div><button type="button" className="text-button" onClick={() => onPreview?.(asset)} aria-label={`Preview ${asset.title}`}><Eye size={13}/> Preview</button><button type="button" className="text-button" onClick={() => onInspect?.(asset)} aria-label={`Inspect ${asset.title}`}>Inspect asset</button></div></div>
			</div>
		</article>
	);
}
