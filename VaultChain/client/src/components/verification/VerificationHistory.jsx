import { Clock3, FileSearch } from 'lucide-react';

import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import StatusBadge from '../ui/StatusBadge';
import { RESULT_COPY } from './VerificationReport';

export default function VerificationHistory({ reports, loading, onOpen }) {
	if (loading) return <LoadingState label="Loading verification history"/>;
	if (!reports.length) return <EmptyState icon={FileSearch} title="No verification reports yet" description="Completed global searches will be saved here for future review."/>;
	return <div className="verification-history-list">{reports.map((report)=>{const best=report.matches?.[0];const copy=best?RESULT_COPY[best.matchType]:RESULT_COPY[report.result]||RESULT_COPY.no_match;const reference=best?.assetReference||report.registeredAsset?.reference||'No registered match';return <button type="button" className="verification-history-item" key={report.reference} onClick={()=>onOpen(report.reference)}><span className="verification-history-item__icon"><FileSearch size={18}/></span><div><strong>{report.reference}</strong><span>{reference}</span></div><div className="verification-history-item__evidence"><StatusBadge tone={copy.tone}>{best?copy.label:report.result==='no_match'?'No Meaningful Match':copy.label}</StatusBadge><small>{best?best.sha256Match?'SHA-256 identical':`Best pHash distance ${best.distance} / ${best.hashBits||256}`:report.nearestDistance!=null?`Nearest distance ${report.nearestDistance} · not a match`:'Saved verification report'}</small></div><time><Clock3 size={12}/>{new Date(report.createdAt).toLocaleDateString()}</time></button>;})}</div>;
}
