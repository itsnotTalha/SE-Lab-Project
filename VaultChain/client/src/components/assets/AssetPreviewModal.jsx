import { AlertCircle, Image, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { assetService } from '../../services/assetService';
import LoadingState from '../ui/LoadingState';

export default function AssetPreviewModal({ asset, sourceUrl = '', onClose }) {
	const [url, setUrl] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;
		let objectUrl = '';
		const previousOverflow = document.body.style.overflow;
		const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', handleKeyDown);

		if (sourceUrl) {
			setUrl(sourceUrl);
			return () => {
				document.body.style.overflow = previousOverflow;
				document.removeEventListener('keydown', handleKeyDown);
			};
		}

		assetService.getContentObjectUrl(asset.id).then((nextUrl) => {
			objectUrl = nextUrl;
			if (active) setUrl(nextUrl);
			else URL.revokeObjectURL(nextUrl);
		}).catch((previewError) => { if (active) setError(previewError.message); });

		return () => {
			active = false;
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', handleKeyDown);
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [asset.id, onClose, sourceUrl]);

	return (
		<div className="asset-preview-modal" role="dialog" aria-modal="true" aria-labelledby="asset-preview-title">
			<button type="button" className="asset-preview-modal__backdrop" onClick={onClose} aria-label="Close image preview" />
			<div className="asset-preview-modal__card">
				<header><div><span><Image size={18}/></span><div><h2 id="asset-preview-title">Image preview</h2><p>{asset.title}</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close image preview"><X size={18}/></button></header>
				<div className="asset-preview-modal__content">
					{error ? <div className="asset-preview-modal__error"><AlertCircle size={22}/><strong>Preview unavailable</strong><p>{error}</p></div> : url ? <img src={url} alt={`Full preview of ${asset.title}`}/> : <LoadingState label="Loading image preview" />}
				</div>
				<footer><span>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : asset.mimeType || 'Image'}</span><span>{asset.id ? `Asset #${asset.id}` : 'Comparison image'}</span></footer>
			</div>
		</div>
	);
}
