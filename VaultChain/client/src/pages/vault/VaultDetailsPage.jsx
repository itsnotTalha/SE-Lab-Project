import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { downloadVaultItem, getVaultItem } from '../../services/vaultService';

export default function VaultDetailsPage() {
  const { id } = useParams(); const [item, setItem] = useState(null); const [error, setError] = useState('');
  useEffect(() => { getVaultItem(id).then((data) => setItem(data.item)).catch((e) => setError(e.message)); }, [id]);
  return <main style={{ minHeight: '100vh', padding: '32px', background: '#f8fafc' }}><section style={{ maxWidth: '700px', margin: '0 auto', padding: '28px', borderRadius: '18px', background: '#fff' }}><Link to="/vault">Back to vault</Link><h1>Vault Details</h1>{error && <p style={{ color: '#b91c1c' }}>{error}</p>}{item && <><h2>{item.title}</h2><p>{item.description || 'No description.'}</p><dl><dt>Original filename</dt><dd>{item.originalName}</dd><dt>Original size</dt><dd>{item.originalSize} bytes</dd><dt>Encrypted size</dt><dd>{item.encryptedSize} bytes</dd><dt>Algorithm</dt><dd>{item.encryptionAlgorithm}</dd><dt>Checksum</dt><dd>{item.checksum}</dd><dt>Created</dt><dd>{item.createdAt}</dd></dl><button type="button" onClick={() => downloadVaultItem(item.id, item.originalName)}>Download decrypted document</button></>}</section></main>;
}
