import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDocument, listDocuments, runOcr, verifyDocument } from '../../services/documentService';

const styles = { page: { minHeight: '100vh', padding: '32px', background: '#f8fafc', color: '#0f172a' }, card: { maxWidth: '850px', margin: '0 auto', padding: '28px', borderRadius: '18px', background: '#fff', boxShadow: '0 10px 35px rgba(15,23,42,.08)' }, button: { padding: '10px 14px', margin: '6px 6px 6px 0', border: 0, borderRadius: '9px', background: '#2563eb', color: '#fff', cursor: 'pointer' } };

export default function DocumentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [referenceId, setReferenceId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getDocument(id), listDocuments()]).then(([detail, all]) => { setDocument(detail.document); setDocuments(all.documents || []); }).catch((e) => setError(e.message));
  }, [id]);

  async function processOcr() { setLoading(true); setError(''); try { await runOcr(id); setMessage('OCR completed.'); const result = await getDocument(id); setDocument(result.document); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  async function verify() { setLoading(true); setError(''); try { const result = await verifyDocument(id, referenceId); setMessage(`Verification result: ${result.status}`); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  if (!document && !error) return <main style={styles.page}><div style={styles.card}>Loading document…</div></main>;
  return <main style={styles.page}><section style={styles.card}>
    <button type="button" onClick={() => navigate('/documents')}>Back to documents</button>
    {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
    {document && <>
      <h1>{document.title}</h1><p>{document.originalName}</p><p>{document.description || 'No description.'}</p>
      <dl><dt>Category</dt><dd>{document.category || 'Uncategorized'}</dd><dt>Pages</dt><dd>{document.pageCount || 'Pending OCR'}</dd><dt>Language</dt><dd>{document.language || 'Pending OCR'}</dd><dt>Status</dt><dd>{document.status}</dd></dl>
      <button style={styles.button} type="button" disabled={loading} onClick={processOcr}>{loading ? 'Processing…' : 'Run OCR'}</button>
      <Link style={{ ...styles.button, display: 'inline-block', textDecoration: 'none' }} to={`/documents/${id}/ocr`}>View OCR result</Link>
      <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #e2e8f0' }}>
        <h2>Text Verification</h2>
        <p>Select the previously uploaded original document. If no reliable reference exists, the result will be Unknown.</p>
        <select value={referenceId} onChange={(e) => setReferenceId(e.target.value)} style={{ padding: '10px', minWidth: '260px' }}><option value="">No reference document</option>{documents.filter((item) => String(item.id) !== String(id)).map((item) => <option key={item.id} value={item.id}>{item.title} (#{item.id})</option>)}</select>
        <button style={styles.button} type="button" disabled={loading} onClick={verify}>Verify document</button>
        <Link style={{ ...styles.button, display: 'inline-block', textDecoration: 'none' }} to={`/documents/${id}/report`}>View report</Link>
      </div>
      {message && <p style={{ color: '#15803d' }}>{message}</p>}
    </>}
  </section></main>;
}
