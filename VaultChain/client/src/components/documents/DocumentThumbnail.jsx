import { FileText, Loader2, ZoomIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { documentService } from '../../services/documentService';

export default function DocumentThumbnail({ document, onPreview }) {
	const [thumbUrl, setThumbUrl] = useState('');
	const [loading, setLoading] = useState(true);
	const [hovered, setHovered] = useState(false);
	const [popoverPos, setPopoverPos] = useState({ top: 16, left: 16, maxHeight: 580 });
	const buttonRef = useRef(null);

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

	function updatePopoverPosition() {
		if (!buttonRef.current) return;
		const rect = buttonRef.current.getBoundingClientRect();
		const popoverWidth = 440;
		const margin = 16;
		const availableHeight = window.innerHeight - margin * 2;
		const popoverHeight = Math.min(590, availableHeight);

		// Horizontal placement: prefer right; if it overflows screen, flip to left
		let left = rect.right + 14;
		if (left + popoverWidth > window.innerWidth - margin) {
			left = rect.left - popoverWidth - 14;
		}
		if (left < margin) {
			left = margin;
		}

		// Vertical placement: align with button top, but clamp strictly within viewport
		let top = rect.top - 20;
		if (top + popoverHeight > window.innerHeight - margin) {
			top = window.innerHeight - margin - popoverHeight;
		}
		if (top < margin) {
			top = margin;
		}

		setPopoverPos({ top, left, maxHeight: popoverHeight });
	}

	function handleMouseEnter() {
		updatePopoverPosition();
		setHovered(true);
	}

	function handleMouseLeave() {
		setHovered(false);
	}

	// Dismiss on page scroll/resize so it never gets detached or stuck
	useEffect(() => {
		if (!hovered) return undefined;
		const handleDismiss = () => setHovered(false);
		window.addEventListener('scroll', handleDismiss, { passive: true, capture: true });
		window.addEventListener('resize', handleDismiss, { passive: true });
		return () => {
			window.removeEventListener('scroll', handleDismiss, { capture: true });
			window.removeEventListener('resize', handleDismiss);
		};
	}, [hovered]);

	return (
		<div className="doc-thumb-wrapper">
			<button
				ref={buttonRef}
				type="button"
				className="doc-thumb-btn"
				onClick={() => onPreview && onPreview(document)}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
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

			{/* Viewport-Bounded Floating Preview Portal (Always Stays Inside Screen) */}
			{hovered &&
				thumbUrl &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						className="doc-zoom-popover"
						role="tooltip"
						aria-hidden="true"
						style={{
							position: 'fixed',
							top: `${popoverPos.top}px`,
							left: `${popoverPos.left}px`,
							maxHeight: `${popoverPos.maxHeight}px`,
							zIndex: 99999,
						}}
					>
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
					</div>,
					window.document.body
				)}
		</div>
	);
}
