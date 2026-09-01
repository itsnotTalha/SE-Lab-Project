import { motion } from 'framer-motion';

export default function ConfidenceGauge({ score, level = 'low', label = 'Authenticity score' }) {
	const normalized = Math.max(0, Math.min(100, Number(score) || 0));
	return <div className={`confidence-gauge confidence-gauge--${level}`}><motion.div className="confidence-gauge__ring" initial={{ '--gauge-value': '0deg' }} animate={{ '--gauge-value': `${normalized * 3.6}deg` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}><div><span>{label}</span><strong>{normalized.toFixed(1)}%</strong><small>{level} confidence</small></div></motion.div></div>;
}
