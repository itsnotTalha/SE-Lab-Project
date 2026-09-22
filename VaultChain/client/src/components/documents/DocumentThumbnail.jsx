import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

import { documentService } from '../../services/documentService';

export default function DocumentThumbnail({ document, size = 48, className = '' }) {
	const [url, setUrl] = useState('');
	const [loaded, setLoaded] = useState(false);
	const [failed, setFailed] = useState(false);

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

	if (failed || !url) {
		return (
			<span
				className={`document-item__icon ${className}`}
				style={{ width: `${size}px`, height: `${size}px` }}
				aria-label={document?.originalName || 'Document'}
			>
				<FileText size={Math.round(size * 0.45)} />
			</span>
		);
	}

	return (
		<div
			className={`document-thumbnail ${loaded ? 'is-loaded' : 'is-loading'} ${className}`}
			style={{ width: `${size}px`, height: `${size}px` }}
		>
			<img
				src={url}
				alt={`Front page of ${document?.originalName || 'document'}`}
				onLoad={() => setLoaded(true)}
				onError={() => setFailed(true)}
				className="document-thumbnail__img"
			/>
		</div>
	);
}
