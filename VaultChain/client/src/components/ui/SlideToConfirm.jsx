import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import '../../styles/slide-to-confirm.css';

export default function SlideToConfirm({ label = 'Slide to confirm purchase', successLabel = 'Purchase confirmed', onConfirm, disabled = false, loading = false }) {
 const track = useRef(null);
 const gesture = useRef(null);
 const submitting = useRef(false);
 const [progress, setProgress] = useState(0);
 const [pending, setPending] = useState(false);
 const [confirmed, setConfirmed] = useState(false);
 const blocked = disabled || loading || pending || confirmed;
 async function confirm() {
  if (blocked || submitting.current) return;
  submitting.current = true;
  setPending(true);
  setProgress(1);
  try {
   const succeeded = await onConfirm?.();
   if (succeeded === false) setProgress(0);
   else setConfirmed(true);
  } catch { setProgress(0); }
  finally { submitting.current = false; setPending(false); }
 }
 function start(event) {
  if (blocked || !event.isPrimary || event.button !== 0) return;
  const distance = track.current.clientWidth - event.currentTarget.offsetWidth - 8;
  if (distance <= 0) return;
  gesture.current = { id: event.pointerId, start: event.clientX, distance, progress: 0 };
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function move(event) {
  const drag = gesture.current;
  if (!drag || drag.id !== event.pointerId || blocked) return;
  drag.progress = Math.min(1, Math.max(0, (event.clientX - drag.start) / drag.distance));
  setProgress(drag.progress);
 }
 function finish(event, cancelled = false) {
  const drag = gesture.current;
  if (!drag || drag.id !== event.pointerId) return;
  gesture.current = null;
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  if (!cancelled && drag.progress >= .95) void confirm();
  else setProgress(0);
 }
 return <div className="slide-confirm-container">
  <div ref={track} className={`slide-confirm-track ${confirmed ? 'is-confirmed' : ''}`} aria-busy={loading || pending}>
   <div className="slide-confirm-progress" style={{ width: `${progress * 100}%` }}/>
   <span className="slide-confirm-label" role="status">{loading || pending ? 'Processing purchase…' : confirmed ? successLabel : label}</span>
   <button type="button" className="slide-confirm-thumb" disabled={blocked}
    style={{ left: `calc(4px + (100% - 56px) * ${progress})` }}
    aria-label={`${label}. Press Enter to confirm, or drag fully to the right.`}
    onPointerDown={start} onPointerMove={move} onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)}
    onLostPointerCapture={(event) => finish(event, true)}
    onClick={(event) => { if (event.detail === 0) void confirm(); }}>
    {loading || pending ? <Loader2 className="slide-confirm-spinner" size={20}/> : confirmed ? <Check size={20}/> : <ArrowRight size={20}/>}
   </button>
  </div>
  <div className="slide-confirm-hint"><span>Slide fully to the right and release.</span><button type="button" className="slide-confirm-fallback-btn" disabled={blocked} onClick={confirm}>Confirm without dragging</button></div>
 </div>;
}
