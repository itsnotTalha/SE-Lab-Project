import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDocuments } from '../../services/documentService';

const styles = { page: { minHeight: '100vh', padding: '32px', background: '#f8fafc', color: '#0f172a' }, card: { padding: '18px', background: '#fff', borderRadius: '14px', boxShadow: '0 5px 20px rgba(15,23,42,.06)' } };

export default function DocumentListPage() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { listDocuments().then((data) => setDocuments(data.documents || [])).catch((e) => setError(e.message)); }, []);
  return <main style={styles.page}>
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div><h1>My Documents</h1><p>Only documents owned by your account are shown.</p></div>
        <Link to="/documents/upload">Upload PDF</Link>
      </div>
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {!error && documents.length === 0 && <div style={styles.card}>No Documents Yet</div>}
      <div style={{ display: 'grid', gap: '14px', marginTop: '20px' }}>
        {documents.map((document) => <article key={document.id} style={styles.card}>
          <h2 style={{ marginTop: 0 }}>{document.title}</h2>
          <p>{document.originalName} · {document.category || 'Uncategorized'}</p>
          <p>{document.pageCount || 'Pages pending'} pages · {document.language || 'Language pending'} · {document.status}</p>
          <Link to={`/documents/${document.id}`}>Open document</Link>
        </article>)}
      </div>
    </div>
  </main>;
}
