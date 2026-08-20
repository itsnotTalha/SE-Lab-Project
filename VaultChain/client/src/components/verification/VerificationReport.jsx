import { ArrowRight, Eye, FileImage, Fingerprint, RotateCcw, ShieldCheck } from 'lucide-react';

import AssetThumbnail from '../assets/AssetThumbnail';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';

const RESULT_COPY = {
	exact: { label: 'Exact Match', tone: 'success', description: 'The comparison file is byte-for-byte identical to the selected registered asset.' },
	strong_visual: { label: 'Strong Visual Match', tone: 'info', description: 'The file contents differ, but the visual fingerprints are highly similar.' },
	possible_visual: { label: 'Possible Visual Match', tone: 'warning', description: 'The comparison image shares visual characteristics with the registered asset, but the evidence is weaker than a strong match.' },
	no_match: { label: 'No Meaningful Match', tone: 'neutral', description: 'No meaningful fingerprint match was detected between the comparison image and the selected registered asset.' },
};

function formatSize(bytes) {
	if (!Number.isFinite(bytes)) return 'Size unavailable';
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function dimensions(item) {
	return item?.width && item?.height ? `${item.width} × ${item.height}` : 'Dimensions unavailable';
}

function EvidenceImage({ title, item, registered, previewUrl, onPreview }) {
	return <div className="verification-evidence-card"><span className="verification-kicker">{title}</span><div className="verification-evidence-card__visual">{registered ? <AssetThumbnail asset={item}/> : previewUrl ? <img src={previewUrl} alt={`Preview of ${item.fileName}`}/> : <FileImage size={34}/>}</div><h3>{registered ? item.title : item.fileName}</h3><p>{dimensions(item)} · {formatSize(item.fileSize)}</p>{onPreview ? <button type="button" className="text-button" onClick={onPreview}><Eye size={13}/> Preview image</button> : null}</div>;
}

export default function VerificationReport({ report, comparisonPreviewUrl, onPreviewAsset, onPreviewComparison, onVerifyAnother, onViewAsset }) {
	const copy = RESULT_COPY[report.result] || RESULT_COPY.no_match;
	const fingerprints = report.fingerprints || {};
	return <section className="verification-report"><header className="verification-report__header"><div><span><ShieldCheck size={20}/></span><div><small>Verification report</small><h2>{report.reference}</h2></div></div><StatusBadge tone={copy.tone}>{copy.label}</StatusBadge></header><div className="verification-report__summary"><h3>{copy.label}</h3><p>{copy.description}</p></div><div className="verification-evidence-grid"><EvidenceImage title="Registered asset" item={report.registeredAsset} registered onPreview={() => onPreviewAsset(report.registeredAsset)}/><EvidenceImage title="Comparison image" item={report.comparison} previewUrl={comparisonPreviewUrl} onPreview={comparisonPreviewUrl ? onPreviewComparison : null}/></div><section className="verification-report__section"><h3><Fingerprint size={15}/>Fingerprint comparison</h3><div className="verification-fingerprint-grid"><div><span>SHA-256</span><strong>{fingerprints.sha256Match ? 'Identical' : 'Different'}</strong></div><div><span>Perceptual distance</span><strong>{fingerprints.perceptualDistance ?? 'Unavailable'} / {fingerprints.hashBits || 256}</strong></div><div><span>Strong threshold</span><strong>{fingerprints.strongThreshold}</strong></div><div><span>Possible threshold</span><strong>{fingerprints.possibleThreshold}</strong></div><div><span>Similarity</span><strong>{fingerprints.similarity === 'none' ? 'No meaningful match' : fingerprints.similarity}</strong></div></div></section><section className="verification-report__section"><h3>Metadata comparison</h3><div className="metadata-comparison">{(report.metadataDifferences || []).map((row) => <div className="metadata-comparison__row" key={row.field}><strong>{row.label}</strong><div><span>{row.registered ?? 'Not present'}</span><ArrowRight size={13}/><span>{row.compared ?? 'Not present'}</span></div><StatusBadge tone={row.status === 'same' ? 'success' : row.status === 'unavailable' ? 'neutral' : 'warning'}>{row.status}</StatusBadge></div>)}</div></section>{report.warnings?.map((warning) => <p className="verification-report__warning" key={warning}>{warning}</p>)}<div className="verification-timeline"><div><span>Asset registered</span><strong>{report.registeredAsset.registeredAt ? new Date(report.registeredAsset.registeredAt).toLocaleString() : 'Unavailable'}</strong></div><div><span>Verification performed</span><strong>{new Date(report.createdAt).toLocaleString()}</strong></div></div><footer className="verification-report__footer"><div><Button type="button" variant="secondary" icon={RotateCcw} onClick={onVerifyAnother}>Verify another image</Button><Button type="button" variant="ghost" onClick={onViewAsset}>View registered asset</Button></div><p>VaultChain reports fingerprint and metadata evidence. Verification results do not independently prove authorship, copyright ownership, or absolute authenticity.</p></footer></section>;
}

export { RESULT_COPY };
