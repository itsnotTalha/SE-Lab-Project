import { motion } from 'framer-motion';

/**
 * Enhanced summary cards for the asset dashboard
 * Shows: Ownership, Verification, Blockchain Status, Current Status
 */
export default function AssetSummaryCards({ ownership, verification, blockchain, status }) {
	const container = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
				delayChildren: 0.2,
			},
		},
	};

	const item = {
		hidden: { opacity: 0, y: 15 },
		show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
	};

	return (
		<motion.div className="summary-cards-grid" variants={container} initial="hidden" animate="show">
			{/* Ownership Card */}
			<motion.article className="summary-card summary-card--ownership" variants={item}>
				<div className="card-header">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
						<circle cx="12" cy="7" r="4" />
					</svg>
					<h3>Ownership</h3>
				</div>
				<div className="card-content">
					<p className="card-value">{ownership.owner || 'You'}</p>
					<span className="card-detail">Registered Owner</span>
					{ownership.memberSince && <p className="card-meta">Member since {ownership.memberSince}</p>}
					{ownership.previousOwner && (
						<>
							<p className="card-meta" style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
								<strong>Previous Owner:</strong> {ownership.previousOwner}
							</p>
							{ownership.purchaseDate && <p className="card-meta">Purchased {ownership.purchaseDate}</p>}
							{ownership.purchasePrice !== undefined && <p className="card-meta">Price: {Number(ownership.purchasePrice).toLocaleString()} Credits</p>}
						</>
					)}
				</div>
				{ownership.profileLink && (
					<button className="card-action">View Profile</button>
				)}
			</motion.article>

			{/* Verification Card */}
			<motion.article className="summary-card summary-card--verification" variants={item}>
				<div className="card-header">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
					<h3>AI Verification</h3>
				</div>
				<div className="card-content">
					<p className="card-value">{verification.status || 'Verified'}</p>
					<span className="card-detail">Confidence: {verification.confidence || '—'}%</span>
					{verification.verifiedDate && <p className="card-meta">Verified {verification.verifiedDate}</p>}
				</div>
				{verification.confidence !== undefined && (
					<div className="card-progress">
						<div className="progress-bar">
							<motion.div
								className="progress-fill"
								initial={{ width: 0 }}
								animate={{ width: `${verification.confidence}%` }}
								transition={{ duration: 0.8, delay: 0.3 }}
							/>
						</div>
					</div>
				)}
			</motion.article>

			{/* Blockchain Status Card */}
			<motion.article className="summary-card summary-card--blockchain" variants={item}>
				<div className="card-header">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<rect x="3" y="3" width="7" height="7" />
						<rect x="14" y="3" width="7" height="7" />
						<rect x="14" y="14" width="7" height="7" />
						<rect x="3" y="14" width="7" height="7" />
					</svg>
					<h3>Blockchain Status</h3>
				</div>
				<div className="card-content">
					<p className="card-value">✓ Recorded</p>
					<span className="card-detail">Cryptographic Identity</span>
					{blockchain.hash && (
						<code className="card-hash">
							{blockchain.hash.slice(0, 12)}…{blockchain.hash.slice(-6)}
						</code>
					)}
				</div>
				{blockchain.copyable && (
					<button className="card-action" title="Copy hash">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
							<rect x="8" y="2" width="8" height="4" rx="1" />
						</svg>
						Copy
					</button>
				)}
			</motion.article>

			{/* Current Status Card */}
			<motion.article className="summary-card summary-card--status" variants={item}>
				<div className="card-header">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
						<circle cx="12" cy="12" r="6" />
					</svg>
					<h3>Current Status</h3>
				</div>
				<div className="card-content">
					<p className="card-value">{status.state || 'Active'}</p>
					<span className="card-detail">{status.description || 'Asset is secure and available'}</span>
					{status.badge && <div className="status-indicator">{status.badge}</div>}
				</div>
			</motion.article>
		</motion.div>
	);
}
