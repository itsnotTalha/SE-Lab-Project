import { FileCheck, FileSearch, FileText, Loader2, Lock, Store, Trash2, ZoomIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import { documentService } from '../../services/documentService';

const TONES = { completed: 'success', failed: 'warning', processing: 'info', pending: 'info' };

export default function DocumentItem({
	document,
	onPreview,
	onOcr,
	onVerify,
	onVault,
	onRemove,
	onMarketplace,
	vaultingId,
	fileSize,
}) {
	const [thumbUrl, setThumbUrl] = useState('');
	const [loading, setLoading] = useState(true);
	const [hovered, setHovered] = useState(false);
	const [popoverPos, setPopoverPos] = useState({ top: 16, left: 16, maxHeight: 580 });
	const buttonRef = useRef(null);
	const titleRef = useRef(null);

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

		// Horizontal placement: prefer right; if overflows, flip to left
		let left = rect.right + 14;
		if (left + popoverWidth > window.innerWidth - margin) {
			left = rect.left - popoverWidth - 14;
		}
		if (left < margin) {
			left = margin;
		}

		// Vertical placement: align with element top, clamp inside viewport
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

	function handleOpenPreview() {
		if (onPreview) onPreview(document);
	}

	return (
		<article className="document-item">
			{/* Thumbnail Icon (First Page Preview) */}
			<div className="doc-thumb-wrapper">
				<button
					ref={buttonRef}
					type="button"
					className="doc-thumb-btn"
					onClick={handleOpenPreview}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
					title="Hover to inspect first page · Click to view full PDF with all pages"
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
			</div>

			{/* Document Identity */}
			<div className="document-item__identity">
				<strong
					ref={titleRef}
					className="document-item__title-link"
					onClick={handleOpenPreview}
					role="button"
					tabIndex={0}
					title="Click to view full document"
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleOpenPreview();
						}
					}}
				>
					{document.originalName}
				</strong>
				<span>
					{document.reference} · {fileSize(document.fileSize)} ·{' '}
					{document.category === 'image' || document.mimeType?.startsWith('image/')
						? 'Image'
						: document.pageCount
							? `${document.pageCount} ${document.pageCount === 1 ? 'page' : 'pages'}`
							: 'PDF'}
				</span>
				{document.description ? (
					<p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: '3px 0 1px' }}>
						{document.description}
					</p>
				) : null}
				<small>
					Uploaded {new Date(document.createdAt).toLocaleString()} · SHA-256:{' '}
					{document.sha256?.slice(0, 16)}…
				</small>
				{document.matchedOcrText ? (
					<p className="document-match">
						<FileSearch size={12} /> Matched OCR text · …{document.ocrSnippet}…
					</p>
				) : null}
			</div>

			{/* Status Badge */}
			<StatusBadge tone={TONES[document.ocrStatus] || 'neutral'}>
				OCR {document.ocrStatus}
			</StatusBadge>

			{/* Actions */}
			<div className="document-item__actions">
				<Button
					size="sm"
					variant="ghost"
					icon={Store}
					onClick={() => onMarketplace && onMarketplace(document)}
				>
					Add Market Place
				</Button>
				<Button
					size="sm"
					variant="ghost"
					icon={FileSearch}
					onClick={() => onOcr && onOcr(document)}
				>
					Text
				</Button>
				<Button
					size="sm"
					variant="ghost"
					icon={FileCheck}
					onClick={() => onVerify && onVerify(document)}
				>
					Verify
				</Button>
				<Button
					size="sm"
					variant="ghost"
					icon={Lock}
					onClick={() => onVault && onVault(document)}
					disabled={vaultingId === document.id}
				>
					{vaultingId === document.id ? 'Vaulting…' : 'Vault'}
				</Button>
				<Button
					size="sm"
					variant="danger"
					icon={Trash2}
					onClick={() => onRemove && onRemove(document)}
				>
					Delete
				</Button>
			</div>

			{/* Viewport-Bounded Floating Preview Portal (Visible on hover of either thumbnail or title) */}
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
							<span className="doc-zoom-popover__hint">First Page · Click to open all pages</span>
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
		</article>
	);
}
