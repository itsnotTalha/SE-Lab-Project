import { AlertCircle, CheckCircle2, Eye, FileCheck, FileSearch, FileText, Lock, Plus, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import DocumentPreviewModal from '../../components/documents/DocumentPreviewModal';
import DocumentThumbnail from '../../components/documents/DocumentThumbnail';
import DocumentVerificationModal from '../../components/documents/DocumentVerificationModal';
import OcrResultModal from '../../components/documents/OcrResultModal';
import UploadDocumentModal from '../../components/documents/UploadDocumentModal';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { documentService } from '../../services/documentService';

const TONES = { completed: 'success', failed: 'warning', processing: 'info', pending: 'info' };

function fileSize(bytes) {
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function DocumentsPage() {
	const [documents, setDocuments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [draftSearch, setDraftSearch] = useState('');
	const [search, setSearch] = useState('');
	const [type, setType] = useState('');
	const [ocrStatus, setOcrStatus] = useState('');
	const [uploadOpen, setUploadOpen] = useState(false);
	const [preview, setPreview] = useState(null);
	const [ocrDocument, setOcrDocument] = useState(null);
	const [verifyingDoc, setVerifyingDoc] = useState(null);
	const [vaultingId, setVaultingId] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		try { setDocuments(await documentService.list({ search, type, ocrStatus })); }
		catch (loadError) { setError(loadError.message); }
		finally { setLoading(false); }
	}, [search, type, ocrStatus]);

	useEffect(() => { load(); }, [load]);

	function submitSearch(event) {
		event.preventDefault();
		setSearch(draftSearch.trim());
	}

	function clearFilters() {
		setDraftSearch('');
		setSearch('');
		setType('');
		setOcrStatus('');
	}

	async function remove(document) {
		if (!window.confirm(`Delete “${document.originalName}”? This cannot be undone.`)) return;
		setError('');
		setSuccess('');
		try {
			await documentService.remove(document.id);
			setSuccess('Document deleted successfully.');
			await load();
		} catch (deleteError) { setError(deleteError.message); }
	}

	async function vaultDocument(document) {
		setError('');
		setSuccess('');
		setVaultingId(document.id);
		try {
			const res = await documentService.vaultDocument(document.id);
			setSuccess(`“${document.originalName}” successfully encrypted with AES-256-GCM and stored in Secure Vault.`);
		} catch (vaultError) {
			setError(vaultError.message || 'Failed to encrypt and store document in vault.');
		} finally {
			setVaultingId(null);
		}
	}

	const filtered = Boolean(search || type || ocrStatus);
	return <>
		<PageHeader
			eyebrow="Verification & Vault"
			title="Documents"
			description="Securely store PDF documents, extract text via Gemini OCR, verify document integrity, and encrypt with AES-256-GCM."
			action={<Button icon={Plus} onClick={() => setUploadOpen(true)}>Upload PDF</Button>}
		/>
		{error ? <div className="error-banner" role="alert"><AlertCircle size={16} />{error}</div> : null}
		{success ? <div className="success-banner" role="status"><CheckCircle2 size={16} />{success}</div> : null}
		<SectionCard title="Document library" description="Search filenames, SHA-256 fingerprints, or extracted text.">
			<div className="document-toolbar">
				<form className="document-search" onSubmit={submitSearch}>
					<label className="search-field">
						<Search size={16} />
						<input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Search filename or OCR text" aria-label="Search documents" />
						{draftSearch ? <button type="button" onClick={() => setDraftSearch('')} aria-label="Clear search"><X size={14} /></button> : null}
					</label>
					<Button type="submit" size="sm">Search</Button>
				</form>
				<label className="document-filter">
					<span>OCR Status</span>
					<select value={ocrStatus} onChange={(event) => setOcrStatus(event.target.value)}>
						<option value="">All</option>
						<option value="completed">Completed</option>
						<option value="failed">Failed</option>
						<option value="processing">Processing</option>
						<option value="pending">Pending</option>
					</select>
				</label>
				{filtered ? <Button size="sm" variant="ghost" icon={X} onClick={clearFilters}>Reset</Button> : null}
			</div>
			{loading ? <LoadingState label="Searching documents" /> : documents.length === 0 ? <EmptyState icon={FileText} title={filtered ? 'No matching documents' : 'No documents yet'} description={filtered ? 'Try a different search or reset the document filters.' : 'Upload a PDF or image document to calculate SHA-256, extract text with Gemini, and store in Secure Vault.'} action={filtered ? <Button size="sm" onClick={clearFilters}>Reset filters</Button> : <Button size="sm" icon={Plus} onClick={() => setUploadOpen(true)}>Upload Document</Button>} /> : <div className="document-list">{documents.map((document) => <article className="document-item" key={document.id}>
				<DocumentThumbnail document={document} onPreview={setPreview} />
				<div className="document-item__identity">
					<strong>{document.originalName}</strong>
					<span>{document.reference} · {fileSize(document.fileSize)} · {document.category === 'image' || document.mimeType?.startsWith('image/') ? 'Image' : document.pageCount ? `${document.pageCount} ${document.pageCount === 1 ? 'page' : 'pages'}` : 'PDF'}</span>
					{document.description ? <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: '3px 0 1px' }}>{document.description}</p> : null}
					<small>Uploaded {new Date(document.createdAt).toLocaleString()} · SHA-256: {document.sha256?.slice(0, 16)}…</small>
					{document.matchedOcrText ? <p className="document-match"><FileSearch size={12} /> Matched OCR text · …{document.ocrSnippet}…</p> : null}
				</div>
				<StatusBadge tone={TONES[document.ocrStatus] || 'neutral'}>OCR {document.ocrStatus}</StatusBadge>
				<div className="document-item__actions">
					<Button size="sm" variant="ghost" icon={Eye} onClick={() => setPreview(document)}>Preview</Button>
					<Button size="sm" variant="ghost" icon={FileSearch} onClick={() => setOcrDocument(document)}>Text</Button>
					<Button size="sm" variant="ghost" icon={FileCheck} onClick={() => setVerifyingDoc(document)}>Verify</Button>
					<Button size="sm" variant="ghost" icon={Lock} onClick={() => vaultDocument(document)} disabled={vaultingId === document.id}>
						{vaultingId === document.id ? 'Vaulting…' : 'Vault'}
					</Button>
					<Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(document)}>Delete</Button>
				</div>
			</article>)}</div>}
		</SectionCard>
		<UploadDocumentModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={(document) => { setSuccess(`“${document.originalName}” uploaded and registered successfully.`); load(); }} />
		{preview ? <DocumentPreviewModal document={preview} onClose={() => setPreview(null)} /> : null}
		{ocrDocument ? <OcrResultModal document={ocrDocument} onClose={() => setOcrDocument(null)} onUpdated={load} /> : null}
		{verifyingDoc ? <DocumentVerificationModal open={Boolean(verifyingDoc)} document={verifyingDoc} allDocuments={documents} onClose={() => setVerifyingDoc(null)} /> : null}
	</>;
}
