import { ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function SlideToConfirm({
	label = 'Slide to confirm payment',
	successLabel = 'Payment authorized!',
	onConfirm,
	disabled = false,
	loading = false,
}) {
	const trackRef = useRef(null);
	const thumbRef = useRef(null);
	const [dragging, setDragging] = useState(false);
	const [dragX, setDragX] = useState(0);
	const [confirmed, setConfirmed] = useState(false);
	const [maxX, setMaxX] = useState(200);

	useEffect(() => {
		function updateMax() {
			if (trackRef.current && thumbRef.current) {
				const trackWidth = trackRef.current.clientWidth;
				const thumbWidth = thumbRef.current.clientWidth;
				setMaxX(Math.max(0, trackWidth - thumbWidth - 6));
			}
		}
		updateMax();
		window.addEventListener('resize', updateMax);
		return () => window.removeEventListener('resize', updateMax);
	}, []);

	useEffect(() => {
		if (!dragging && !confirmed) {
			setDragX(0);
		}
	}, [dragging, confirmed]);

	function handlePointerDown() {
		if (disabled || loading || confirmed) return;
		setDragging(true);
	}

	useEffect(() => {
		function onPointerMove(e) {
			if (!dragging || confirmed || !trackRef.current) return;
			const clientX = e.touches ? e.touches[0].clientX : e.clientX;
			const rect = trackRef.current.getBoundingClientRect();
			const offsetX = clientX - rect.left - 24;
			const clamped = Math.max(0, Math.min(offsetX, maxX));
			setDragX(clamped);

			if (maxX > 0 && clamped >= maxX * 0.85) {
				setConfirmed(true);
				setDragging(false);
				setDragX(maxX);
				if (onConfirm) {
					onConfirm();
				}
			}
		}

		function onPointerUp() {
			if (dragging && !confirmed) {
				setDragging(false);
				setDragX(0);
			}
		}

		if (dragging) {
			window.addEventListener('mousemove', onPointerMove);
			window.addEventListener('mouseup', onPointerUp);
			window.addEventListener('touchmove', onPointerMove, { passive: true });
			window.addEventListener('touchend', onPointerUp);
		}

		return () => {
			window.removeEventListener('mousemove', onPointerMove);
			window.removeEventListener('mouseup', onPointerUp);
			window.removeEventListener('touchmove', onPointerMove);
			window.removeEventListener('touchend', onPointerUp);
		};
	}, [dragging, confirmed, maxX, onConfirm]);

	const progressPercent = maxX > 0 ? Math.min(100, Math.max(0, (dragX / maxX) * 100)) : 0;

	return (
		<div className="slide-confirm-container">
			<div
				ref={trackRef}
				className={`slide-confirm-track ${confirmed || loading ? 'is-confirmed' : ''}`}
				style={{ opacity: disabled ? 0.6 : 1 }}
			>
				<div
					className="slide-confirm-progress"
					style={{ width: `${Math.max(24, progressPercent)}%` }}
				/>

				<div className="slide-confirm-label">
					{loading ? (
						<>
							<Loader2 size={16} className="slide-confirm-spinner" />
							<span>Authorizing transaction...</span>
						</>
					) : confirmed ? (
						<>
							<ShieldCheck size={17} style={{ color: '#42d69d' }} />
							<span style={{ color: '#42d69d' }}>{successLabel}</span>
						</>
					) : (
						<span className="slide-confirm-shimmer">{label}</span>
					)}
				</div>

				<div
					ref={thumbRef}
					className="slide-confirm-thumb"
					style={{
						transform: `translateX(${dragX}px)`,
						transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
					}}
					onMouseDown={handlePointerDown}
					onTouchStart={handlePointerDown}
					role="slider"
					aria-label={label}
					aria-valuenow={Math.round(progressPercent)}
					aria-valuemin="0"
					aria-valuemax="100"
					tabIndex={disabled ? -1 : 0}
					onKeyDown={(e) => {
						if ((e.key === 'Enter' || e.key === ' ') && !disabled && !loading && !confirmed) {
							e.preventDefault();
							setConfirmed(true);
							setDragX(maxX);
							onConfirm?.();
						}
					}}
				>
					{loading ? (
						<Loader2 size={18} className="slide-confirm-spinner" />
					) : confirmed ? (
						<Check size={20} strokeWidth={2.5} />
					) : (
						<ArrowRight size={20} className="slide-confirm-arrow" />
					)}
				</div>
			</div>

			<div className="slide-confirm-hint">
				<span>🔒 Drag slider to right or tap fallback</span>
				{!disabled && !loading && !confirmed && (
					<button
						type="button"
						className="slide-confirm-fallback-btn"
						onClick={() => {
							setConfirmed(true);
							setDragX(maxX);
							onConfirm?.();
						}}
					>
						Instant click confirm
					</button>
				)}
			</div>
		</div>
	);
}
