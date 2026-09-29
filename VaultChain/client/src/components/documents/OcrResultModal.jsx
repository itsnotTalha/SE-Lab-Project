import { AlertCircle, FileSearch, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { documentService } from '../../services/documentService';
import Button from '../ui/Button';
import CopyButton from '../ui/CopyButton';
import LoadingState from '../ui/LoadingState';
import StatusBadge from '../ui/StatusBadge';

export default function OcrResultModal({ document, onClose, onUpdated }) {
	const [ocr, setOcr] = useState(null);
	const [url, setUrl] = useState('');
	const [previewError, setPreviewError] = useState('');
	const [error, setError] = useState('');
	const [processing, setProcessing] = useState(false);
	useEffect(() => {
		let active = true;
		let objectUrl = '';
		setOcr(null); setUrl(''); setError(''); setPreviewError('');
		documentService.getOcr(document.id).then((result) => { if (active) setOcr(result); }).catch((err) => { if (active) setError(err.message); });
		documentService.getContentObjectUrl(document.id).then((result) => {
			objectUrl = result;
			if (active) setUrl(result); else URL.revokeObjectURL(result);
		}).catch((err) => { if (active) setPreviewError(err.message); });
		return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
	}, [document.id]);
	async function rerun() {
		setProcessing(true); setError('');
		try { const updated = await documentService.rerunOcr(document.id); setOcr(await documentService.getOcr(document.id)); onUpdated(updated); }
		catch (err) { setError(err.message); }
		finally { setProcessing(false); }
	}
	const pages = (ocr?.extractedText || '').split('\f');
	return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ocr-result-title">
		<button className="modal__backdrop" aria-label="Close" onClick={onClose}/>
		<section className="modal__card ocr-modal ocr-modal--layout">
			<header className="modal__header"><div><span className="modal__icon"><FileSearch size={19}/></span><div><h2 id="ocr-result-title">Document and extracted text</h2><p>{document.originalName}</p></div></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></header>
			{error ? <div className="error-banner" role="alert"><AlertCircle size={16}/>{error}</div> : null}
			<div className="ocr-layout">
				<div className="ocr-original"><h3>Original layout</h3>{previewError ? <p role="alert">{previewError}</p> : !url ? <LoadingState label="Loading document"/> : document.mimeType === 'application/pdf' ? <iframe src={url} title={`Original ${document.originalName}`}/> : <img src={url} alt={`Original ${document.originalName}`}/>}</div>
				<div className="ocr-modal__body">
					{!ocr ? <LoadingState label="Loading OCR result"/> : <>
						<div className="ocr-modal__status"><StatusBadge tone={ocr.status === 'completed' ? 'success' : 'warning'}>{ocr.status}</StatusBadge>{Number.isFinite(ocr.confidence) ? <span>OCR confidence: {Math.round(ocr.confidence)}%</span> : null}</div>
						{ocr.source ? <p><strong>OCR method:</strong> {({ local_tesseract: 'Local OCR (Tesseract)', gemini_api: 'Online handwriting OCR (Gemini)', local_pdf: 'Local PDF extraction' })[ocr.source] || ocr.source}. {ocr.source === 'gemini_api' ? 'Auto selected online transcription because local recognition was unclear or failed; handwriting is possible.' : ''}</p> : null}
						{ocr.warning ? <p role="status">{ocr.warning}</p> : null}
						<p>Extracted text preserves available spacing and page breaks. Refer to the original for exact formatting; scanned text may contain recognition errors.</p>
						{ocr.error ? <p className="error-banner" role="alert">{ocr.error}</p> : null}
						<div className="ocr-pages">{pages.map((text, index) => <section className="ocr-page" key={index}><h3>Page {index + 1}</h3><pre>{text || 'No text detected on this page.'}</pre></section>)}</div>
						<CopyButton value={ocr.extractedText} label="Copy text"/>
					</>}
					<footer><Button variant="secondary" icon={RefreshCw} onClick={rerun} disabled={processing}>{processing ? 'Processing…' : 'Rerun OCR'}</Button><Button onClick={onClose}>Done</Button></footer>
				</div>
			</div>
		</section>
	</div>;
}
