import { FileText, Loader2, ZoomIn } from 'lucide-react';
import { useEffect, useState } from 'react';

import { documentService } from '../../services/documentService';

export default function DocumentThumbnail({ document, onPreview }) {
	const [thumbUrl, setThumbUrl] = useState('');
	const [loading, setLoading] = useState(true);
	const [hovered, setHovered] = useState(false);

	useEffect(() => {
		let active = true;
		let objectUrl = '';

		if (!document?.id) return undefined;

		setLoading(true);
		documentService
			.getThumbnailObjectUrl(document.id)
			.then((url) => {
				objectUrl = url;
				if (active) {
					setThumbUrl(url);
					setLoading(false);
				} else {
					URL.revokeObjectURL(url);
				}
			})
			.catch(() => {
				if (active) {
					setThumbUrl('');
					setLoading(false);
				}
			});

		return () => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [document?.id]);

	return (
		<div className="doc-thumb-wrapper">
			<button
				type="button"
				className="doc-thumb-btn"
				onClick={() => onPreview && onPreview(document)}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				title="Hover to view full first page · Click to open"
				aria-label={`Preview ${document.originalName}`}
			>
				{loading ? (
					<span className="doc-thumb-placeholder">
						<Loader2 size={16} className="doc-thumb-spinner" />
					</span>
				) : thumbUrl ? (
					<div className="doc-thumb-frame">
						<img
							src={thumbUrl}
							alt={`Front page of ${document.originalName}`}
							className="doc-thumb-img"
						/>
						<span className="doc-thumb-badge" aria-hidden="true">
							<ZoomIn size={10} />
						</span>
					</div>
				) : (
					<span className="doc-thumb-placeholder">
						<FileText size={20} />
					</span>
				)}
			</button>

			{/* Floating Full First Page Preview on Hover */}
			{hovered && thumbUrl && (
				<div className="doc-zoom-popover" role="tooltip" aria-hidden="true">
					<div className="doc-zoom-popover__header">
						<span className="doc-zoom-popover__title">{document.originalName}</span>
						<span className="doc-zoom-popover__hint">First Page (Full View)</span>
					</div>
					<div className="doc-zoom-popover__viewport">
						<img
							src={thumbUrl}
							alt={`Full first page of ${document.originalName}`}
							className="doc-zoom-popover__img"
						/>
					</div>
				</div>
			)}
		</div>
	);
}
