import { AlertTriangle, CalendarDays, CheckCircle2, Database, ShieldQuestion } from 'lucide-react';
import { motion } from 'framer-motion';

import StatusBadge from '../ui/StatusBadge';
import ConfidenceGauge from './ConfidenceGauge';

export default function VerificationResultCard({ report, score, state }) {
	const Icon = state.level === 'high' ? CheckCircle2 : state.level === 'medium' ? AlertTriangle : ShieldQuestion;
	return <motion.header className={`verification-result-card verification-result-card--${state.level}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><div className="verification-result-card__copy"><span className="journey-kicker"><Icon size={13}/> Completed verification · {report.reference}</span><h2>{state.label}</h2><p>{state.explanation}</p><div className="verification-result-card__status"><StatusBadge tone={state.tone}>{state.status}</StatusBadge><span><Database size={13}/>{report.candidateCount ?? '—'} registered fingerprints compared</span><span><CalendarDays size={13}/>{report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Just now'}</span></div><div className="verification-result-card__reason"><strong>Conclusion</strong><span>{state.level === 'high' ? 'Multiple deterministic signals crossed the high-confidence threshold.' : state.level === 'medium' ? 'Similarity evidence crossed the review threshold but not the strong-match threshold.' : 'No candidate crossed VaultChain’s configured match threshold.'}</span></div></div><ConfidenceGauge score={score} level={state.level}/></motion.header>;
}
