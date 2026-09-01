import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getVerificationReport } from '../../services/documentService';

const colors = { Original: '#15803d', Modified: '#b45309', Unknown: '#64748b' };

export default function VerificationReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getVerificationReport(id).then((data) => setReport(data.report)).catch((e) => setError(e.message)); }, [id]);
  const verification = report?.verification;
  return <main style={{ minHeight: '100vh', padding: '32px', background: '#f8fafc' }}><section style={{ maxWidth: '850px', margin: '0 auto', padding: '28px', borderRadius: '18px', background: '#fff' }}>
    <Link to={`/documents/${id}`}>Back to document</Link><h1>Verification Report</h1>
    {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
    {report && <><h2>{report.document.title}</h2><p><strong>Status:</strong> <span style={{ color: colors[verification?.status] || colors.Unknown, fontWeight: 700 }}>{verification?.status || 'Not verified'}</span></p><p><strong>Similarity:</strong> {verification?.similarity == null ? 'Unavailable' : `${verification.similarity}%`}</p><p><strong>Changes detected:</strong> {verification ? (verification.changesDetected ? 'Yes' : 'No') : 'Unavailable'}</p><p><strong>Verification timestamp:</strong> {verification?.verifiedAt || 'Unavailable'}</p><hr /><h3>OCR information</h3><pre>{JSON.stringify(report.ocr, null, 2)}</pre><h3>Comparison information</h3><pre>{JSON.stringify(report.comparison, null, 2)}</pre></>}
  </section></main>;
}
