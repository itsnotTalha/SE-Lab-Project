import { FileText, Loader2, ZoomIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { documentService } from '../../services/documentService';

export default function DocumentThumbnail({ document, onPreview }) {
	const [thumbUrl, setThumbUrl] = useState('');
	const [loading, setLoading] = useState(true);
	const [hovered, setHovered] = useState(false);
	const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
	const containerRef = useRef(null);

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

	function handleMouseMove(e) {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
		const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
		setZoomPos({ x, y });
	}

	function handleMouseEnter(e) {
		handleMouseMove(e);
		setHovered(true);
	}

	function handleMouseLeave() {
		setHovered(false);
	}

	return (
		<div className="doc-thumb-wrapper" ref={containerRef}>
			<button
				type="button"
				className="doc-thumb-btn"
				onClick={() => onPreview && onPreview(document)}
				onMouseEnter={handleMouseEnter}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				title="Hover to zoom front page · Click to open"
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
						{hovered && (
							<span
								className="doc-thumb-lens"
								style={{ left: `${zoomPos.x}%`, top: `${zoomPos.y}%` }}
								aria-hidden="true"
							/>
						)}
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

			{/* Floating Zoom Magnifier Card on Hover */}
			{hovered && thumbUrl && (
				<div
					className="doc-zoom-popover"
					role="tooltip"
					aria-hidden="true"
				>
					<div className="doc-zoom-popover__header">
						<span className="doc-zoom-popover__title">Front Page Zoom</span>
						<span className="doc-zoom-popover__hint">Hover to inspect · Click to view full</span>
					</div>
					<div className="doc-zoom-popover__viewport">
						<img
							src={thumbUrl}
							alt=""
							className="doc-zoom-popover__img"
							style={{
								transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
								transform: 'scale(3.0)',
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
