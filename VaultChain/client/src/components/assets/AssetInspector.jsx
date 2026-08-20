import { CalendarDays, Database, Eye, FileText, Fingerprint, Image, ScanLine, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { assetService } from '../../services/assetService';
import CopyButton from '../ui/CopyButton';
import LoadingState from '../ui/LoadingState';
import StatusBadge from '../ui/StatusBadge';
import AssetThumbnail from './AssetThumbnail';

function DetailRow({ label, value, copy = false, mono = false }) {
	return <div className="detail-row"><span>{label}</span><div><code className={mono ? 'mono' : ''}>{value ?? 'Unavailable'}</code>{copy ? <CopyButton value={value} /> : null}</div></div>;
}

function fileSize(bytes) {
	if (!Number.isFinite(bytes)) return null;
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function AssetInspector({ asset: initialAsset, onClose, onPreview }) {
	const [asset, setAsset] = useState(initialAsset);
	const [hash, setHash] = useState(null);
	const [metadata, setMetadata] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const previousOverflow = document.body.style.overflow;
		const handleKeyDown = (event) => {
			if (event.key === 'Escape') onClose();
		};
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [onClose]);

	useEffect(() => {
		let active = true;
		setAsset(initialAsset);
		setHash(null);
		setMetadata(null);
		setError('');
		setLoading(true);

		Promise.allSettled([
			assetService.getAsset(initialAsset.id),
			assetService.getHashes(initialAsset.id),
			assetService.getMetadata(initialAsset.id),
		]).then(([assetResult, hashResult, metadataResult]) => {
			if (!active) return;
			if (assetResult.status === 'rejected') {
				setError(assetResult.reason.message);
				return;
			}
			setAsset(assetResult.value);
			if (hashResult.status === 'fulfilled') setHash(hashResult.value);
			if (metadataResult.status === 'fulfilled') setMetadata(metadataResult.value);
		}).finally(() => { if (active) setLoading(false); });

		return () => { active = false; };
	}, [initialAsset]);

	return (
		<div className="asset-inspector-modal" role="dialog" aria-modal="true" aria-labelledby="asset-inspector-title">
			<button type="button" className="asset-inspector-modal__backdrop" onClick={onClose} aria-label="Close asset inspector" />
			<aside className="inspector">
				<header><div><span><Fingerprint size={18} /></span><div><h2 id="asset-inspector-title">Asset identity</h2><p>Asset #{asset?.id} · stored in your library</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close asset details"><X size={17} /></button></header>
				{loading ? <LoadingState label="Loading asset identity" /> : error ? <div className="error-banner">{error}</div> : (
					<div className="inspector__scroll">
						<AssetThumbnail asset={asset} large />
						{onPreview ? <button type="button" className="asset-preview-trigger" onClick={() => onPreview(asset)}><Eye size={15}/> Preview image</button> : null}
						<div className="inspector__title"><div><h3>{asset.title}</h3><p>{asset.description || 'No description provided.'}</p></div>{hash ? <StatusBadge tone="info"><Fingerprint size={10}/> Hash generated</StatusBadge> : null}</div>
						<section><h3><UserRound size={15} />Ownership</h3><DetailRow label="Registered owner" value="You" /><DetailRow label="Asset reference" value={`VC-A${String(asset.id).padStart(6, '0')}`} mono /></section>
						<section><h3><ScanLine size={15} />Cryptographic identity</h3><DetailRow label="SHA-256" value={hash?.sha256} copy mono /><DetailRow label="Perceptual hash" value={hash?.phash} copy mono /></section>
						<section><h3><Image size={15} />Image metadata</h3><DetailRow label="Dimensions" value={metadata?.width && metadata?.height ? `${metadata.width} × ${metadata.height}` : null} /><DetailRow label="Pixel count" value={(metadata?.pixelCount ?? metadata?.pixel_count)?.toLocaleString?.()} /><DetailRow label="Camera" value={metadata?.camera} /><DetailRow label="Location" value={metadata?.location} /><DetailRow label="Image created" value={metadata?.created_date || null} /></section>
						<section><h3><Database size={15} />Stored asset</h3><DetailRow label="Stored filename" value={asset.fileName} mono /><DetailRow label="MIME type" value={asset.mimeType} /><DetailRow label="Category" value={asset.category} /><DetailRow label="File size" value={fileSize(asset.fileSize)} /></section>
						<div className="inspector__timeline"><span><CalendarDays size={15}/></span><div><small>Uploaded to VaultChain</small><strong>{asset.createdAt ? new Date(asset.createdAt).toLocaleString() : 'Date unavailable'}</strong></div></div>
						<div className="inspector__note"><FileText size={15}/><span>Fingerprinting confirms stored file integrity and similarity data. It is not an authenticity verification report.</span></div>
					</div>
				)}
			</aside>
		</div>
	);
}
