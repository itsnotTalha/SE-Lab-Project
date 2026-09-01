import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';

/**
 * Verification Breakdown component with charts and visual indicators
 * Shows overall score and breakdown by verification method
 */
export default function VerificationBreakdown({ overallScore = 98.7, breakdown = null, explainableChecks = [] }) {
	const defaultBreakdown = [
		{ label: 'Visual Similarity', score: 98, color: '#41d9ff' },
		{ label: 'Metadata Match', score: 96, color: '#42d69d' },
		{ label: 'Hash Match', score: 100, color: '#8b9dff' },
		{ label: 'Perceptual Hash', score: 97, color: '#fbbf24' },
		{ label: 'AI Analysis', score: 99, color: '#ff9d5d' },
	];

	const data = breakdown || defaultBreakdown;

	const chartData = data.map((item) => ({
		name: item.label,
		value: item.score,
		fill: item.color,
	}));

	const pieData = [{ name: 'Score', value: overallScore, fill: '#41d9ff' }];

	return (
		<div className="verification-breakdown">
			{/* Overall Score Section */}
			<motion.div className="breakdown-overall" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
				<div className="overall-chart">
					<ResponsiveContainer width="100%" height={220}>
						<PieChart>
							<Pie
								data={pieData}
								cx="50%"
								cy="50%"
								innerRadius={60}
								outerRadius={90}
								dataKey="value"
								startAngle={90}
								endAngle={90 - (overallScore / 100) * 360}
								isAnimationActive={true}
								animationDuration={1.5}
							>
								<Cell fill="#41d9ff" />
							</Pie>
						</PieChart>
					</ResponsiveContainer>
					<div className="score-overlay">
						<motion.span className="overall-score" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
							{overallScore}%
						</motion.span>
						<p>Overall Verification Score</p>
					</div>
				</div>
			</motion.div>

			{/* Breakdown Items Section */}
			<motion.div className="breakdown-items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}>
				<h3>Verification Breakdown</h3>
				<div className="breakdown-list">
					{data.map((item, idx) => (
						<motion.div
							key={item.label}
							className="breakdown-item"
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.1 * idx, duration: 0.4 }}
						>
							<div className="item-label">
								<span>{item.label}</span>
								<strong>{item.score}%</strong>
							</div>
							<div className="item-bar">
								<motion.div
									className="bar-progress"
									style={{ backgroundColor: item.color }}
									initial={{ width: 0 }}
									animate={{ width: `${item.score}%` }}
									transition={{ delay: 0.15 * idx, duration: 0.8, ease: 'easeOut' }}
								/>
							</div>
						</motion.div>
					))}
				</div>
			</motion.div>

			{/* Explainable Checks Section */}
			{explainableChecks.length > 0 && (
				<motion.div className="breakdown-checks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}>
					<h3>Why was this asset verified?</h3>
					<div className="checks-list">
						{explainableChecks.map((check, idx) => (
							<motion.div
								key={check}
								className="check-item"
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.08 * idx }}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
									<polyline points="20 6 9 17 4 12" />
								</svg>
								<span>{check}</span>
							</motion.div>
						))}
					</div>
				</motion.div>
			)}
		</div>
	);
}
