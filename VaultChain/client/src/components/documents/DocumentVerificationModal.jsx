import { AlertCircle, FileCheck2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { documentService } from '../../services/documentService';
import Button from '../ui/Button';
import VerificationResult from './VerificationResult';

export default function DocumentVerificationModal({ document, documents, open, onClose, onVerified }) {
	const [referenceDocumentId, setReferenceDocumentId] = useState('');
	const [verification, setVerification] = useState(null);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const references = useMemo(() => documents.filter((candidate) => candidate.id !== document?.id), [document?.id, documents]);

	useEffect(() => {
		if (!open) return;
		setReferenceDocumentId('');
		setVerification(null);
		setError('');
		setLoading(false);
	}, [open, document?.id]);

	if (!open || !document) return null;

	async function submit(event) {
		event.preventDefault();
		setError('');
		if (!referenceDocumentId) {
			setError('Choose a reference document.');
			return;
		}
		setLoading(true);
		try {
			const result = await documentService.verify(document.id, Number(referenceDocumentId));
			setVerification(result);
			onVerified?.(result);
		} catch (verificationError) {
			setError(verificationError.message);
		} finally {
			setLoading(false);
		}
	}

	return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="document-verification-title">
		<button className="modal__backdrop" aria-label="Close" onClick={loading ? undefined : onClose}/>
		<section className="modal__card ocr-modal">
			<header className="modal__header"><div><span className="modal__icon"><FileCheck2 size={19}/></span><div><h2 id="document-verification-title">Verify document</h2><p>Compare {document.originalName} with a reference document.</p></div></div><button type="button" className="icon-button" onClick={onClose} disabled={loading} aria-label="Close"><X size={18}/></button></header>
			<div className="ocr-modal__body">
				{error ? <div className="error-banner" role="alert"><AlertCircle size={16}/>{error}</div> : null}
				{verification ? <VerificationResult verification={verification}/> : <form className="form-grid" onSubmit={submit}>
					<label>Reference document<select value={referenceDocumentId} onChange={(event) => setReferenceDocumentId(event.target.value)} disabled={loading}><option value="">Select a document</option>{references.map((reference) => <option key={reference.id} value={reference.id}>{reference.originalName} · OCR {reference.ocrStatus}</option>)}</select></label>
					{references.length === 0 ? <div className="info-banner">Upload another document before starting verification.</div> : null}
					<footer><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button type="submit" icon={FileCheck2} disabled={loading || references.length === 0}>{loading ? 'Verifying…' : 'Verify'}</Button></footer>
				</form>}
				{verification ? <footer><Button variant="secondary" onClick={() => { setVerification(null); setReferenceDocumentId(''); }}>Compare again</Button><Button onClick={onClose}>Done</Button></footer> : null}
			</div>
		</section>
	</div>;
}
