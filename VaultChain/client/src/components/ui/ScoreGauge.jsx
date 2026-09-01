import { motion } from 'framer-motion';

export default function ScoreGauge({ score = 0, label = 'Authenticity', size = 'lg' }) {
	const normalized = Math.max(0, Math.min(100, Number(score) || 0));
	return <div className={`score-gauge score-gauge--${size}`} style={{ '--score': `${normalized * 3.6}deg` }}><motion.div className="score-gauge__ring" initial={{ '--score': '0deg' }} animate={{ '--score': `${normalized * 3.6}deg` }} transition={{ duration: .9, ease: 'easeOut' }}><div><strong>{normalized.toFixed(1)}%</strong><span>{label}</span></div></motion.div></div>;
}
