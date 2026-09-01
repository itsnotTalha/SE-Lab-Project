import { BrainCircuit, Check, Database, Fingerprint, Image, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const defaultSteps = [
	{ title: 'Image uploaded', description: 'Source received in temporary processing', icon: Image, result: 'Completed', time: 'Timing unavailable' },
	{ title: 'Metadata extracted', description: 'Dimensions and available EXIF inspected', icon: Database, result: 'Completed', time: 'Timing unavailable' },
	{ title: 'Hashes generated', description: 'SHA-256 + 256-bit perceptual hash', icon: Fingerprint, result: 'Completed', time: 'Timing unavailable' },
	{ title: 'Feature analysis', description: 'Visual fingerprint features measured', icon: BrainCircuit, result: 'Completed', time: 'Timing unavailable' },
	{ title: 'Database comparison', description: 'Registered candidates ranked globally', icon: Database, result: 'Completed', time: 'Timing unavailable' },
	{ title: 'Verification completed', description: 'Evidence classified and report saved', icon: ShieldCheck, result: 'Completed', time: 'Report saved' },
];

export default function VerificationTimeline({ steps = defaultSteps, activeStep = steps.length, compact = false, totalTime }) {
	return <div className={`verification-timeline ${compact ? 'is-compact' : ''}`}>{steps.map((step, index) => { const Icon = step.icon; const complete = index < activeStep; const active = index === activeStep; const timing = totalTime && index === steps.length - 1 ? `${(totalTime / 1000).toFixed(2)}s total` : step.time; return <motion.div className={`verification-timeline__step ${complete ? 'is-complete' : ''} ${active ? 'is-active' : ''}`} key={step.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .07 }}><span className="verification-timeline__connector"/><span className="verification-timeline__icon">{complete ? <Check size={15}/> : <Icon size={16}/>}</span><div><strong>{step.title}</strong><p>{step.description}</p></div><div className="verification-timeline__result"><strong>{complete ? step.result : active ? 'Processing' : 'Queued'}</strong><span>{complete ? timing : '—'}</span></div></motion.div>; })}</div>;
}
