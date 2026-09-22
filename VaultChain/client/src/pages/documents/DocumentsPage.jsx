import { AlertCircle, CheckCircle2, Eye, FileCheck2, FileSearch, FileText, Plus, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import DocumentPreviewModal from '../../components/documents/DocumentPreviewModal';
import DocumentVerificationModal from '../../components/documents/DocumentVerificationModal';
import OcrResultModal from '../../components/documents/OcrResultModal';
import DocumentThumbnail from '../../components/documents/DocumentThumbnail';
import UploadDocumentModal from '../../components/documents/UploadDocumentModal';
import Button from '../../components/ui/Button';
import CopyButton from '../../components/ui/CopyButton';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { documentService } from '../../services/documentService';
import { formatDhakaTime } from '../../utils/date';

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
	const [verificationDocument, setVerificationDocument] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		try { setDocuments(await documentService.list({ search, type, ocrStatus })); }
		catch (loadError) { setError(loadError.message); }
		finally { setLoading(false); }
	}, [search, type, ocrStatus]);
	useEffect(() => { load(); }, [load]);

	// Automatically trigger search as user types with a 300ms debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearch(draftSearch.trim());
		}, 300);
		return () => clearTimeout(timer);
	}, [draftSearch]);

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

	const filtered = Boolean(search || type || ocrStatus);
	return <>
		<PageHeader eyebrow="Text evidence" title="Documents" description="Securely store PDF and image documents, preview them, and extract searchable text." action={<Button icon={Plus} onClick={() => setUploadOpen(true)}>Upload document</Button>}/>
		{error ? <div className="error-banner" role="alert"><AlertCircle size={16}/>{error}</div> : null}
		{success ? <div className="success-banner" role="status"><CheckCircle2 size={16}/>{success}</div> : null}
		<SectionCard title="Document library" description="Search filenames and extracted text, or filter your private documents.">
			<div className="document-toolbar">
				<form className="document-search" onSubmit={submitSearch}>
					<label className="search-field"><Search size={16}/><input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Search filename or OCR text" aria-label="Search documents"/>{draftSearch ? <button type="button" onClick={() => setDraftSearch('')} aria-label="Clear search"><X size={14}/></button> : null}</label>
					<Button type="submit" size="sm">Search</Button>
				</form>
				<label className="document-filter"><span>Type</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All</option><option value="pdf">PDF</option><option value="image">Image</option></select></label>
				<label className="document-filter"><span>OCR</span><select value={ocrStatus} onChange={(event) => setOcrStatus(event.target.value)}><option value="">All</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="processing">Processing</option><option value="pending">Pending</option></select></label>
				{filtered ? <Button size="sm" variant="ghost" icon={X} onClick={clearFilters}>Reset</Button> : null}
			</div>
			{loading ? <LoadingState label="Searching documents"/> : documents.length === 0 ? <EmptyState icon={FileText} title={filtered ? 'No matching documents' : 'No documents yet'} description={filtered ? 'Try a different search or reset the document filters.' : 'Upload a supported document to store its fingerprint and extract available text.'} action={filtered ? <Button size="sm" onClick={clearFilters}>Reset filters</Button> : <Button size="sm" icon={Plus} onClick={() => setUploadOpen(true)}>Upload document</Button>}/> : <div className="document-list">{documents.map((document) => <article className="document-item" key={document.id}>
				<div className="document-item__preview-col">
					<DocumentThumbnail document={document} size={50} />
					<Button
						size="sm"
						variant="ghost"
						icon={Eye}
						className="document-item__preview-btn"
						onClick={() => setPreview(document)}
						title="Open full document preview"
					>
						Preview
					</Button>
				</div>
				<div className="document-item__identity">
					<strong>{document.originalName}</strong>
					<span>{document.reference} · {fileSize(document.fileSize)} · {document.mimeType === 'application/pdf' ? `${document.pageCount || '—'} ${document.pageCount === 1 ? 'page' : 'pages'}` : 'Image'}</span>
					{document.sha256 ? (
						<div className="document-item__hash-row">
							<CopyButton value={document.sha256} label="Copy SHA-256" />
							<span className="document-item__hash-label">SHA-256:</span>
							<code className="document-item__hash-code">{document.sha256}</code>
						</div>
					) : null}
					<small>Uploaded {formatDhakaTime(document.createdAt)}</small>
					{document.matchedOcrText ? <p className="document-match"><FileSearch size={12}/> Matched OCR text · …{document.ocrSnippet}…</p> : null}
				</div>
				<StatusBadge tone={TONES[document.ocrStatus] || 'neutral'}>OCR {document.ocrStatus}</StatusBadge>
				<div className="document-item__actions"><Button size="sm" variant="ghost" icon={FileSearch} onClick={() => setOcrDocument(document)}>Text</Button><Button size="sm" variant="ghost" icon={FileCheck2} onClick={() => setVerificationDocument(document)}>Verify</Button><Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(document)}>Delete</Button></div>
			</article>)}</div>}
		</SectionCard>
		<UploadDocumentModal
			open={uploadOpen}
			onClose={() => setUploadOpen(false)}
			onUploaded={(document) => {
				setSuccess(`${document.originalName} uploaded successfully.`);
				load();
			}}
			onDeleted={(document) => {
				setSuccess(`Duplicate document “${document.originalName}” deleted.`);
				load();
			}}
		/>
		{preview ? <DocumentPreviewModal document={preview} onClose={() => setPreview(null)}/> : null}
		{ocrDocument ? <OcrResultModal document={ocrDocument} onClose={() => setOcrDocument(null)} onUpdated={load}/> : null}
		{verificationDocument ? <DocumentVerificationModal document={verificationDocument} documents={documents} open onClose={() => setVerificationDocument(null)} onVerified={(verification) => setSuccess(`Verification completed: ${verification.status}.`)}/> : null}
	</>;
}
