import { motion } from 'framer-motion';

/**
 * Similar Asset Card component for showing similar or related assets
 * Displays image, similarity score, and action button
 */
export default function SimilarAssetCard({ asset, similarityScore = 92, onView }) {
	const container = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: {
				staggerChildren: 0.08,
				delayChildren: 0.05,
			},
		},
	};

	const item = {
		hidden: { opacity: 0, y: 15 },
		show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
	};

	return (
		<motion.div className="similar-assets-grid" variants={container} initial="hidden" animate="show">
			{asset ? (
				<motion.article className="similar-asset-card" variants={item} whileHover={{ y: -4 }} transition={{ duration: 0.3 }}>
					<div className="card-image">
						{asset.imageUrl ? (
							<img src={asset.imageUrl} alt={asset.title} />
						) : (
							<div className="image-placeholder">
								<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
									<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
									<circle cx="8.5" cy="8.5" r="1.5" />
									<path d="M21 15l-5-5L5 21" />
								</svg>
							</div>
						)}
						<div className="similarity-badge">
							<strong>{similarityScore}%</strong>
							<span>Similar</span>
						</div>
					</div>

					<div className="card-content">
						<h4>{asset.title}</h4>
						<p>{asset.description || 'Similar asset'}</p>

						<div className="card-similarity">
							<div className="similarity-bar">
								<motion.div
									className="similarity-fill"
									initial={{ width: 0 }}
									animate={{ width: `${similarityScore}%` }}
									transition={{ duration: 0.8, delay: 0.3 }}
									style={{
										background: `linear-gradient(90deg, ${
											similarityScore >= 80 ? '#42d69d' : similarityScore >= 60 ? '#41d9ff' : '#fbbf24'
										}, ${similarityScore >= 80 ? '#41d9ff' : similarityScore >= 60 ? '#8b9dff' : '#ff9d5d'})`,
									}}
								/>
							</div>
							<span className="similarity-text">{similarityScore}% match</span>
						</div>

						{onView && (
							<motion.button
								className="view-button"
								onClick={() => onView(asset.id)}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
							>
								View Asset →
							</motion.button>
						)}
					</div>
				</motion.article>
			) : (
				<motion.div className="similar-assets-empty" variants={item}>
					<p>No similar assets found</p>
				</motion.div>
			)}
		</motion.div>
	);
}
