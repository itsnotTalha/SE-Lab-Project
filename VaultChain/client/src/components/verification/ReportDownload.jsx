import { Download } from 'lucide-react';

import Button from '../ui/Button';
import { formatReportDate, getPerceptualSimilarity } from './verificationUtils';

function escapeHtml(value) {
	return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

export default function ReportDownload({ report, score, state }) {
	function download() {
		const best = report.matches?.[0];
		const perceptual = getPerceptualSimilarity(best);
		const safeOwner = best?.ownerIsCurrentUser ? 'Current authenticated user' : best?.ownerReference ? `${best.ownerReference.slice(0, 5)}••••` : 'Not disclosed';
		const html = `<!doctype html><html><head><meta charset="utf-8"><title>VaultChain ${escapeHtml(report.reference)}</title><style>body{font:15px system-ui;max-width:760px;margin:48px auto;padding:0 24px;color:#17181c}header{border-bottom:2px solid #635bff;padding-bottom:24px}h1{font-size:28px}.score{font-size:44px;font-weight:750;color:#5048e5}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.item{padding:14px;background:#f4f5f7;border-radius:10px}.item span{display:block;color:#6b7280;font-size:12px}.notice{margin-top:28px;padding:14px;background:#f4f5f7;border-radius:10px;font-size:12px}</style></head><body><header><strong>VaultChain Verification Report</strong><h1>${escapeHtml(state.label)}</h1><div class="score">${score.toFixed(1)}%</div><p>${escapeHtml(state.explanation)}</p></header><h2>Closest registered match</h2><div class="grid"><div class="item"><span>Report reference</span><b>${escapeHtml(report.reference)}</b></div><div class="item"><span>Asset reference</span><b>${escapeHtml(best?.assetReference || 'No reliable match')}</b></div><div class="item"><span>Registered owner</span><b>${escapeHtml(safeOwner)}</b></div><div class="item"><span>Registration date</span><b>${escapeHtml(formatReportDate(best?.registeredAt))}</b></div><div class="item"><span>SHA-256 evidence</span><b>${best?.sha256Match ? 'Identical fingerprint' : 'Different or unavailable'}</b></div><div class="item"><span>Perceptual similarity</span><b>${perceptual == null ? 'Unavailable' : `${perceptual.toFixed(1)}%`}</b></div></div><p class="notice">This report records reproducible comparison evidence. It does not independently grant copyright, prove authorship, or transfer ownership.</p></body></html>`;
		const blob = new Blob([html], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url; link.download = `vaultchain-${report.reference}.html`; link.click();
		URL.revokeObjectURL(url);
	}
	return <Button variant="secondary" icon={Download} onClick={download}>Download report</Button>;
}
