import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { documentService } from '../../services/documentService';
import Button from '../ui/Button';

const matchLabel = (value) => value === null || value === undefined ? 'Unavailable' : value ? 'Match' : 'Different';

export default function DocumentVerificationModal({ document, onClose }) {
	const [documents, setDocuments] = useState([]);
	const [target, setTarget] = useState('');
	const [report, setReport] = useState(null);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		let active = true;
		Promise.all([documentService.list(), documentService.getReport(document.id)])
			.then(([items, saved]) => { if (active) { setDocuments(items); setReport(saved.report || null); } })
			.catch((err) => { if (active) setError(err.message); });
		return () => { active = false; };
	}, [document.id]);
	async function verify() {
		setBusy(true); setError('');
		try { setReport((await documentService.verify(document.id, target ? Number(target) : undefined)).report); }
		catch (err) { setError(err.message); }
		finally { setBusy(false); }
	}
	const evidence = report?.evidence;
	return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="document-verify-title">
		<button className="modal__backdrop" aria-label="Close" onClick={onClose}/>
		<section className="modal__card">
			<header className="modal__header"><div><h2 id="document-verify-title">Verify document</h2><p>{document.originalName}</p></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18}/></button></header>
			<div className="modal__form form-grid">
				<label>Verification mode<select value={target} disabled={busy} onChange={(event) => { setTarget(event.target.value); setReport(null); }}><option value="">Check stored file and metadata integrity</option>{documents.filter((item) => item.id !== document.id).map((item) => <option key={item.id} value={item.id}>Compare with {item.originalName}</option>)}</select></label>
				{error ? <p className="error-banner" role="alert">{error}</p> : null}
				{evidence ? <div className="document-verification-result" aria-live="polite">
					<strong>{evidence.classification}</strong>
					<p>{report.targetDocument ? `Compared with ${report.targetDocument.originalName}` : 'Stored document integrity check'} · {new Date(report.verifiedAt).toLocaleString()}</p>
					<dl><dt>File SHA-256</dt><dd>{matchLabel(evidence.sha256Match)}</dd><dt>Metadata SHA-256</dt><dd>{matchLabel(evidence.metadataMatch)}</dd><dt>Extracted text</dt><dd>{matchLabel(evidence.textMatch)}</dd><dt>Text similarity</dt><dd>{evidence.similarityScore === null ? 'Unavailable' : `${Math.round(evidence.similarityScore * 100)}%`}</dd><dt>Stored source file</dt><dd>{evidence.sourceIntegrity.fileMatch ? 'Intact' : 'Changed or missing'}</dd><dt>Stored source metadata</dt><dd>{matchLabel(evidence.sourceIntegrity.metadataMatch)}</dd></dl>
					{evidence.differences ? <><p>Added words: {evidence.differences.addedWords.join(', ') || 'None'}</p><p>Removed words: {evidence.differences.removedWords.join(', ') || 'None'}</p></> : null}
					<details><summary>Registered hashes</summary><pre>{JSON.stringify(report.sourceDocument, null, 2)}</pre></details>
				</div> : null}
				<p>Matching text does not prove that layout, signatures, images, or embedded metadata are unchanged. File hashes include every byte; metadata hashes cover the registered name, description, type, and size.</p>
				<footer className="modal__footer"><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={verify} disabled={busy}>{busy ? 'Verifying…' : 'Run verification'}</Button></footer>
			</div>
		</section>
	</div>;
}
