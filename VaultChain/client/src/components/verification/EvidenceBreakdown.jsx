import { ChevronDown, CircleCheck, Database, Fingerprint, Image, ScanSearch } from 'lucide-react';
import { motion } from 'framer-motion';

import SimilarityChart from './SimilarityChart';
import { getPerceptualSimilarity } from './verificationUtils';

function EvidenceRow({ icon: Icon, title, value, state = 'available', explanation, details }) {
	const numeric = typeof value === 'number';
	return <details className={`evidence-row evidence-row--${state}`}><summary><span className="evidence-row__icon">{state === 'available' ? <CircleCheck size={15}/> : <Icon size={15}/>}</span><div><strong>{title}</strong><small>{explanation}</small></div><b>{numeric ? `${value.toFixed(1)}%` : value}</b><ChevronDown size={15}/></summary>{numeric ? <div className="evidence-row__progress"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} transition={{ duration: .8 }}/></div> : null}<p>{details}</p></details>;
}

export default function EvidenceBreakdown({ report, score }) {
	const best = report.matches?.[0];
	const pHash = getPerceptualSimilarity(best);
	return <section className="report-section evidence-breakdown"><header><span><ScanSearch size={17}/></span><div><h3>Why was this matched?</h3><p>Each conclusion is tied to an inspectable verification signal</p></div></header><SimilarityChart score={score}/><div className="evidence-breakdown__list"><EvidenceRow icon={Image} title="Visual match confidence" value={score} explanation="Classification across configured evidence thresholds" details="This score maps the backend match classification and fingerprint distance onto VaultChain’s low, review, and strong confidence bands."/><EvidenceRow icon={Fingerprint} title="Perceptual hash similarity" value={pHash ?? 'No match'} state={pHash == null ? 'unavailable' : 'available'} explanation="256-bit visual fingerprint comparison" details={best ? `${best.distance} of ${best.hashBits || 256} fingerprint bits differ. Lower distance means greater visual similarity.` : 'No candidate was close enough to be returned as a meaningful perceptual match.'}/><EvidenceRow icon={Database} title="Cryptographic image fingerprint" value={best?.sha256Match ? 100 : 'Different'} state={best?.sha256Match ? 'available' : 'neutral'} explanation="Byte-for-byte SHA-256 comparison" details={best?.sha256Match ? 'The uploaded bytes produce the same SHA-256 fingerprint as the registered source.' : 'The SHA-256 fingerprints differ. A visual match can still occur after resizing, recompression, or small edits.'}/><EvidenceRow icon={Database} title="Metadata comparison" value="Not evaluated" state="unavailable" explanation="No matched EXIF comparison in this report" details="The current global verification endpoint extracts source metadata but does not return a field-by-field comparison with the registered candidate. VaultChain does not fabricate this signal."/></div><p className="analysis-disclosure">This report uses deterministic SHA-256 and perceptual-hash analysis. It is explainable and reproducible; it is not a generative-AI authorship judgment.</p></section>;
}
