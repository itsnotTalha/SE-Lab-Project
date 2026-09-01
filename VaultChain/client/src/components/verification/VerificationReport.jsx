import { AlertTriangle, ChevronDown, ClipboardCheck, FileWarning, Fingerprint, Flag, History, Info, RotateCcw, Save, Send, Share2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import Toast from '../ui/Toast';
import EvidenceBreakdown from './EvidenceBreakdown';
import MatchComparison from './MatchComparison';
import OwnerBadge from './OwnerBadge';
import ReportDownload from './ReportDownload';
import VerificationResultCard from './VerificationResultCard';
import VerificationTimeline from './VerificationTimeline';
import { formatReportDate, getConfidenceState, getPerceptualSimilarity, getVerificationConfidence } from './verificationUtils';

const RESULT_COPY = {
	exact: { label: 'Exact registered match', short: 'Strong Match Found', tone: 'success' },
	strong_visual: { label: 'Strong visual match', short: 'Strong Match Found', tone: 'success' },
	possible_visual: { label: 'Possible visual match', short: 'Possible Match Found', tone: 'warning' },
	no_match: { label: 'No reliable match', short: 'No Reliable Match Found', tone: 'neutral' },
	matches_found: { label: 'Matches found', short: 'Evidence located', tone: 'success' },
};

function fallbackCopy(text) {
	const element = document.createElement('textarea');
	element.value = text; element.style.position = 'fixed'; element.style.opacity = '0';
	document.body.appendChild(element); element.select(); document.execCommand('copy'); element.remove();
}

async function copyText(text) {
	if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
	fallbackCopy(text);
}

export default function VerificationReport({ report, history = [], sourceUrl, onVerifyAnother }) {
	const [toast, setToast] = useState('');
	const [action, setAction] = useState(null);
	const best = report.matches?.[0];
	const score = getVerificationConfidence(report);
	const state = getConfidenceState(score, Boolean(best));
	const suspicious = Boolean(best && state.level === 'high' && !best.ownerIsCurrentUser);
	const previous = history.filter((item) => item.reference !== report.reference).slice(0, 6);

	async function shareReport() {
		const text = `VaultChain ${report.reference}: ${state.label} (${score.toFixed(1)}% confidence). Closest registered match: ${best?.assetReference || 'none'}.`;
		if (navigator.share) {
			try { await navigator.share({ title: `VaultChain ${report.reference}`, text }); setToast('Verification shared.'); return; } catch (error) { if (error.name === 'AbortError') return; }
		}
		await copyText(text); setToast('Privacy-safe verification summary copied.');
	}

	function saveReport() {
		const key = 'vaultchain-saved-verifications';
		const saved = JSON.parse(window.localStorage.getItem(key) || '[]');
		window.localStorage.setItem(key, JSON.stringify([...new Set([report.reference, ...saved])].slice(0, 50)));
		setToast('Report saved to this workspace browser.');
	}

	async function prepareRequest(kind) {
		const text = `${kind === 'proof' ? 'Ownership proof request' : 'Incorrect match review'} for verification ${report.reference}, candidate ${best?.assetReference || 'none'}.`;
		await copyText(text); setAction(null); setToast(`${kind === 'proof' ? 'Proof request' : 'Review request'} reference copied.`);
	}

	const historyColumns = [
		{ key: 'createdAt', label: 'Date', render: (item) => <div className="table-primary"><strong>{new Date(item.createdAt).toLocaleDateString()}</strong><small>{item.reference}</small></div> },
		{ key: 'result', label: 'Result', render: (item) => { const itemScore = getVerificationConfidence(item); const itemState = getConfidenceState(itemScore, Boolean(item.matches?.[0])); return <StatusBadge tone={itemState.tone}>{itemState.label}</StatusBadge>; } },
		{ key: 'similarity', label: 'Confidence', render: (item) => <strong>{getVerificationConfidence(item).toFixed(1)}%</strong> },
		{ key: 'asset', label: 'Closest asset', render: (item) => item.matches?.[0]?.assetReference || 'No reliable match' },
	];

	return <section className="verification-report-new">
		<VerificationResultCard report={report} score={score} state={state}/>

		<div className="report-explainer"><Info size={16}/><p><strong>What this score means:</strong> VaultChain combines the stored match classification, cryptographic equality, and perceptual fingerprint distance into clear confidence bands. A match is evidence of similarity to a registered record—not an automatic declaration of copyright or legal ownership.</p></div>

		{suspicious ? <div className="security-warning"><span><AlertTriangle size={21}/></span><div><strong>Possible duplicate detected</strong><p>This upload has high similarity with an asset registered to another privacy-protected account. Further ownership verification is recommended before relying on it.</p></div><StatusBadge tone="warning">Review ownership</StatusBadge></div> : null}

		{best ? <section className="closest-match-card"><header><div><span><ShieldCheck size={17}/></span><div><h3>Closest registered match</h3><p>The highest-ranked candidate—not a declaration that the upload belongs to this owner</p></div></div><StatusBadge tone={state.tone}>{score.toFixed(1)}% confidence</StatusBadge></header><div className="closest-match-card__grid"><div><small>Asset ID</small><strong>{best.assetReference}</strong></div><div><small>Match confidence</small><strong>{score.toFixed(1)}%</strong></div><div><small>Registration date</small><strong>{formatReportDate(best.registeredAt)}</strong></div><div><small>Match basis</small><strong>{best.sha256Match ? 'Identical SHA-256 fingerprint' : `${best.distance} bit perceptual distance`}</strong></div></div><OwnerBadge match={best} confidenceLevel={state.level}/>{state.level === 'medium' ? <p className="closest-match-card__privacy"><Info size={14}/>Owner identity remains hidden until stronger verification evidence is available.</p> : null}</section> : null}

		<MatchComparison sourceUrl={sourceUrl} source={report.comparison} match={best} score={score}/>

		<div className="report-two-column"><EvidenceBreakdown report={report} score={score}/><section className="report-section report-pipeline"><header><span><Fingerprint size={17}/></span><div><h3>Verification timeline</h3><p>How the submitted image became this result</p></div></header><VerificationTimeline compact totalTime={report.clientProcessingMs}/></section></div>

		<section className="report-section technical-evidence"><header><span><Fingerprint size={17}/></span><div><h3>Technical evidence</h3><p>Thresholds and source properties retained with this report</p></div></header><details open><summary>Hash and classification rules <ChevronDown size={15}/></summary><div className="technical-grid"><div><span>SHA-256 comparison</span><strong>{best?.sha256Match ? 'Identical' : 'Different or unavailable'}</strong></div><div><span>Perceptual similarity</span><strong>{getPerceptualSimilarity(best)?.toFixed(1) || '—'}%</strong></div><div><span>Strong distance threshold</span><strong>0–{report.thresholds?.strong ?? 6} bits</strong></div><div><span>Review distance threshold</span><strong>{(report.thresholds?.strong ?? 6) + 1}–{report.thresholds?.possible ?? 12} bits</strong></div></div></details><details><summary>Uploaded source information <ChevronDown size={15}/></summary><div className="technical-grid"><div><span>File name</span><strong>{report.comparison?.fileName || 'Unavailable in history view'}</strong></div><div><span>Media type</span><strong>{report.comparison?.mimeType || 'Unavailable'}</strong></div><div><span>Dimensions</span><strong>{report.comparison?.width && report.comparison?.height ? `${report.comparison.width} × ${report.comparison.height}` : 'Unavailable'}</strong></div><div><span>File size</span><strong>{report.comparison?.fileSize ? `${(report.comparison.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unavailable'}</strong></div></div></details>{report.matches?.length > 1 ? <details><summary>Additional candidate matches ({report.matches.length - 1}) <ChevronDown size={15}/></summary><div className="additional-matches">{report.matches.slice(1).map((match) => <div key={match.assetReference}><span>#{match.rank}</span><strong>{match.assetReference}</strong><small>{getPerceptualSimilarity(match).toFixed(1)}% fingerprint similarity · {match.distance} bit distance</small></div>)}</div></details> : null}</section>

		<section className="report-section match-history"><header><span><History size={17}/></span><div><h3>Previous verification attempts</h3><p>Recent saved reports from your authenticated workspace</p></div></header><DataTable columns={historyColumns} rows={previous} getRowKey={(item) => item.reference} empty="No previous verification attempts yet."/></section>

		<section className="verification-actions"><header><div><h3>Report actions</h3><p>Export or share only privacy-safe evidence.</p></div><StatusBadge><ClipboardCheck size={11}/>Auto-saved</StatusBadge></header><div><ReportDownload report={report} score={score} state={state}/><Button variant="secondary" icon={Share2} onClick={shareReport}>Share verification</Button><Button variant="secondary" icon={Send} disabled={state.level !== 'high'} onClick={() => setAction('proof')}>Request ownership proof</Button><Button variant="secondary" icon={Save} onClick={saveReport}>Save result</Button><Button variant="ghost" icon={Flag} onClick={() => setAction('incorrect')}>Report incorrect match</Button><Button variant="ghost" icon={RotateCcw} onClick={onVerifyAnother}>Verify another image</Button></div></section>

		<footer className="report-legal"><FileWarning size={15}/><p>VaultChain reports technical comparison evidence. Results do not independently grant copyright, prove authorship, establish legal title, or transfer ownership.</p></footer>

		<Modal open={Boolean(action)} title={action === 'proof' ? 'Request ownership proof' : 'Report an incorrect match'} description={action === 'proof' ? 'Prepare a privacy-safe request using this verification reference.' : 'Prepare this result for a manual review workflow.'} onClose={() => setAction(null)}><div className="verification-request"><div><small>Verification reference</small><strong>{report.reference}</strong></div><div><small>Candidate asset</small><strong>{best?.assetReference || 'No candidate'}</strong></div><p>{action === 'proof' ? 'No private owner information will be exposed. The registered owner can choose whether to provide additional proof through an authorized channel.' : 'The report reference and candidate ID will be included without exposing private account data.'}</p><footer><Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button><Button icon={action === 'proof' ? Send : Flag} onClick={() => prepareRequest(action)}>{action === 'proof' ? 'Copy proof request' : 'Copy review request'}</Button></footer></div></Modal>
		<Toast message={toast} onClose={() => setToast('')}/>
	</section>;
}

export { RESULT_COPY };
