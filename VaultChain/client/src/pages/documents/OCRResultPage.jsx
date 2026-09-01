import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { downloadExtractedText, getOcr } from '../../services/documentService';

export default function OCRResultPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getOcr(id).then(setResult).catch((e) => setError(e.message)); }, [id]);
  return <main style={{ minHeight: '100vh', padding: '32px', background: '#f8fafc' }}><section style={{ maxWidth: '900px', margin: '0 auto', padding: '28px', borderRadius: '18px', background: '#fff' }}>
    <Link to={`/documents/${id}`}>Back to document</Link><h1>OCR Result</h1>
    {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
    {result && <><p><strong>Confidence:</strong> {result.confidence == null ? 'Unavailable' : `${result.confidence}%`}</p><p><strong>Language:</strong> {result.language || 'Unknown'}</p><p><strong>Pages processed:</strong> {result.pagesProcessed || 'Unknown'}</p><button type="button" onClick={() => downloadExtractedText(result.text, `document-${id}-ocr.txt`)}>Download Text</button><pre style={{ whiteSpace: 'pre-wrap', marginTop: '20px', padding: '18px', background: '#f1f5f9', borderRadius: '10px' }}>{result.text}</pre></>}
  </section></main>;
}
