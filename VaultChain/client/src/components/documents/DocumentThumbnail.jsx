import { FileText, ZoomIn } from 'lucide-react';
import { useEffect, useState } from 'react';

import { documentService } from '../../services/documentService';

export default function DocumentThumbnail({ document, size = 46, className = '', enableZoom = true }) {
	const [url, setUrl] = useState('');
	const [loaded, setLoaded] = useState(false);
	const [failed, setFailed] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	useEffect(() => {
		let active = true;
		let objectUrl = '';
		setLoaded(false);
		setFailed(false);

		if (!document?.id) return;

		documentService.getPreviewObjectUrl(document.id)
			.then((previewUrl) => {
				if (!active) {
					URL.revokeObjectURL(previewUrl);
					return;
				}
				objectUrl = previewUrl;
				setUrl(previewUrl);
			})
			.catch(() => {
				if (active) setFailed(true);
			});

		return () => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [document?.id]);

	const dotElement = document?.duplicateRole ? (
		<span
			className={`document-thumbnail__dot document-thumbnail__dot--${document.duplicateRole === 'original' ? 'green' : 'red'}`}
			title={document.duplicateRole === 'original' ? 'Original document (First uploaded)' : 'Duplicate document (Uploaded copy)'}
			aria-label={document.duplicateRole === 'original' ? 'Original document' : 'Duplicate document'}
		/>
	) : null;

	if (failed || !url) {
		return (
			<span
				className={`document-item__icon ${className}`}
				style={{ width: `${size}px`, height: `${size}px`, position: 'relative' }}
				aria-label={document?.originalName || 'Document'}
			>
				{dotElement}
				<FileText size={Math.round(size * 0.45)} />
			</span>
		);
	}

	return (
		<div
			className={`document-thumbnail ${loaded ? 'is-loaded' : 'is-loading'} ${className}`}
			style={{ width: `${size}px`, height: `${size}px`, position: 'relative' }}
			onMouseEnter={() => enableZoom && setIsHovered(true)}
			onMouseLeave={() => enableZoom && setIsHovered(false)}
			title={document?.duplicateRole === 'original' ? 'Original document (First uploaded) · Hover to zoom' : document?.duplicateRole === 'duplicate' ? 'Duplicate document · Hover to zoom' : 'Hover over front page to zoom'}
		>
			{dotElement}
			<img
				src={url}
				alt={`Front page of ${document?.originalName || 'document'}`}
				onLoad={() => setLoaded(true)}
				onError={() => setFailed(true)}
				className="document-thumbnail__img"
			/>

			{enableZoom && isHovered && loaded ? (
				<div className="document-thumbnail__zoom-popover" role="tooltip">
					<div className="document-thumbnail__zoom-header">
						<span><ZoomIn size={12} /> Front page</span>
						<small>{document?.pageCount ? `${document.pageCount} ${document.pageCount === 1 ? 'page' : 'pages'}` : 'Preview'}</small>
					</div>
					<div className="document-thumbnail__zoom-card">
						<img
							src={url}
							alt={`Zoomed front page of ${document?.originalName}`}
							className="document-thumbnail__zoom-img"
						/>
					</div>
				</div>
			) : null}
		</div>
	);
}
