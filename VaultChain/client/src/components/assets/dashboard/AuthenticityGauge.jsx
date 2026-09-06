import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Circular gauge showing authenticity/integrity score
 * Animated percentage with confidence badge
 */
export default function AuthenticityGauge({ score = 0, label = 'Authenticity Score', showBreakdown = false }) {
	const [displayScore, setDisplayScore] = useState(0);

	useEffect(() => {
		const timer = setTimeout(() => setDisplayScore(score), 100);
		return () => clearTimeout(timer);
	}, [score]);

	const getScoreLevel = (s) => {
		if (s >= 95) return { text: 'Highly Authentic', color: '#42d69d', bgGradient: 'rgba(66, 214, 157, 0.1)' };
		if (s >= 80) return { text: 'Authentic', color: '#41d9ff', bgGradient: 'rgba(65, 217, 255, 0.1)' };
		if (s >= 60) return { text: 'Review Recommended', color: '#fbbf24', bgGradient: 'rgba(251, 191, 36, 0.1)' };
		return { text: 'Needs Verification', color: '#ff6b7a', bgGradient: 'rgba(255, 107, 122, 0.1)' };
	};

	const level = getScoreLevel(displayScore);
	const circumference = 2 * Math.PI * 45; // radius = 45
	const offset = circumference - (displayScore / 100) * circumference;

	return (
		<motion.div className="authenticity-gauge" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
			<div className="gauge-container" style={{ '--gauge-color': level.color, '--gauge-surface': level.bgGradient }} role="img" aria-label={`${label}: ${score}%, ${getScoreLevel(score).text}`}>
				<svg className="gauge-ring" viewBox="0 0 120 120" aria-hidden="true">
					{/* Background circle */}
					<circle cx="60" cy="60" r="45" fill="none" stroke="var(--border-strong)" strokeWidth="8" />
					{/* Progress circle */}
					<motion.circle
						cx="60"
						cy="60"
						r="45"
						fill="none"
						stroke={level.color}
						strokeWidth="8"
						strokeDasharray={circumference}
						strokeDashoffset={circumference}
						animate={{ strokeDashoffset: offset }}
						transition={{ duration: 1.2, ease: 'easeOut' }}
						strokeLinecap="round"
						style={{ filter: `drop-shadow(0 0 8px ${level.color}20)` }}
					/>
				</svg>

				<div className="gauge-content">
					<motion.div
						className="gauge-score"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.3 }}
					>
						<motion.span
							className="score-number"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.5 }}
						>
							{displayScore}%
						</motion.span>
					</motion.div>
					<motion.p className="gauge-level" style={{ color: level.color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
						{level.text}
					</motion.p>
				</div>
			</div>

			<div className="gauge-info">
				<h3>{label}</h3>
				<p>Based on cryptographic hashes, metadata integrity, and asset registration completeness</p>

				{showBreakdown && (
					<div className="gauge-breakdown">
						<div className="breakdown-item">
							<span>Verification Confidence</span>
							<div className="breakdown-bar">
								<motion.div className="bar-fill" initial={{ width: 0 }} animate={{ width: `${displayScore}%` }} transition={{ duration: 1.2 }} style={{ backgroundColor: level.color }} />
							</div>
							<strong>{displayScore}%</strong>
						</div>
					</div>
				)}
			</div>
		</motion.div>
	);
}
