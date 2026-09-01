import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument } from '../../services/documentService';

const styles = {
  page: { minHeight: '100vh', padding: '32px', background: '#f8fafc', color: '#0f172a' },
  card: { maxWidth: '680px', margin: '0 auto', padding: '28px', borderRadius: '18px', background: '#fff', boxShadow: '0 10px 35px rgba(15,23,42,.08)' },
  input: { width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', marginTop: '6px' },
  label: { display: 'block', marginTop: '16px', fontWeight: 600 },
  button: { marginTop: '22px', padding: '12px 18px', border: 0, borderRadius: '10px', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' },
};

export default function DocumentUploadPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', category: '' });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function selectFile(event) {
    const selected = event.target.files?.[0];
    setError('');
    if (selected && (selected.type !== 'application/pdf' || selected.size > 20 * 1024 * 1024)) {
      setFile(null);
      setError('Please choose a PDF file no larger than 20 MB.');
      return;
    }
    setFile(selected || null);
  }
  async function submit(event) {
    event.preventDefault();
    setError(''); setMessage('');
    if (!file) { setError('Choose a PDF document first.'); return; }
    setLoading(true);
    try {
      const result = await uploadDocument({ ...form, file, onProgress: setProgress });
      setMessage('Document uploaded successfully.');
      navigate(`/documents/${result.document.id}`);
    } catch (submitError) { setError(submitError.message); }
    finally { setLoading(false); }
  }

  return <main style={styles.page}>
    <section style={styles.card}>
      <button type="button" onClick={() => navigate('/documents')}>Back to documents</button>
      <h1>Upload Document</h1>
      <p>Upload a PDF for OCR and text-based verification.</p>
      <form onSubmit={submit}>
        <label style={styles.label}>PDF document<input style={styles.input} type="file" accept="application/pdf,.pdf" onChange={selectFile} /></label>
        <label style={styles.label}>Title<input style={styles.input} value={form.title} onChange={(e) => update('title', e.target.value)} maxLength={200} /></label>
        <label style={styles.label}>Description<textarea style={styles.input} rows="4" value={form.description} onChange={(e) => update('description', e.target.value)} maxLength={2000} /></label>
        <label style={styles.label}>Category<input style={styles.input} value={form.category} onChange={(e) => update('category', e.target.value)} maxLength={100} /></label>
        {progress > 0 && <p>Upload progress: {progress}%</p>}
        {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
        {message && <p style={{ color: '#15803d' }}>{message}</p>}
        <button style={styles.button} type="submit" disabled={loading}>{loading ? 'Uploading…' : 'Upload PDF'}</button>
      </form>
    </section>
  </main>;
}
