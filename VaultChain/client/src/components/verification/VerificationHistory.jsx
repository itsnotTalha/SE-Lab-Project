import { Clock3, FileSearch } from 'lucide-react';

import EmptyState from '../ui/EmptyState';
import LoadingState from '../ui/LoadingState';
import StatusBadge from '../ui/StatusBadge';
import { RESULT_COPY } from './VerificationReport';

export default function VerificationHistory({ reports, loading, onOpen }) {
	if (loading) return <LoadingState label="Loading verification history"/>;
	if (!reports.length) return <EmptyState icon={FileSearch} title="No verification reports yet" description="Completed comparisons will be saved here for future review."/>;
	return <div className="verification-history-list">{reports.map((report) => { const copy = RESULT_COPY[report.result] || RESULT_COPY.no_match; return <button type="button" className="verification-history-item" key={report.reference} onClick={() => onOpen(report.reference)}><span className="verification-history-item__icon"><FileSearch size={18}/></span><div><strong>{report.reference}</strong><span>{report.registeredAsset.title}</span></div><div className="verification-history-item__evidence"><StatusBadge tone={copy.tone}>{copy.label}</StatusBadge><small>{report.fingerprints?.sha256Match ? 'SHA-256 identical' : `pHash distance ${report.fingerprints?.perceptualDistance ?? '—'} / ${report.fingerprints?.hashBits || 256}`}</small></div><time><Clock3 size={12}/>{new Date(report.createdAt).toLocaleDateString()}</time></button>; })}</div>;
}
