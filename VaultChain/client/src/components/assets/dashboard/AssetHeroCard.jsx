import { motion } from 'framer-motion';
import { Maximize2, FileImage } from 'lucide-react';
import AuthenticityGauge from './AuthenticityGauge';

/**
 * Asset Hero Card - Main hero section with preview and basic info
 * Shows asset image, name, description, and authenticity score
 */
export default function AssetHeroCard({ asset, previewUrl, integrityScore, onPreviewClick }) {
	const formatSize = (bytes) => {
		if (!Number.isFinite(bytes)) return 'Unavailable';
		if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
	};

	const assetReference = (id) => `VC-A${String(id).padStart(6, '0')}`;

	return (
		<motion.section className="asset-hero-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
			<div className="hero-layout">
				{/* Asset Preview */}
				<motion.div className="hero-preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
					{previewUrl ? (
						<>
							<img src={previewUrl} alt={asset.title} className="preview-image" />
							<motion.button
								className="preview-expand"
								onClick={onPreviewClick}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
							>
								<Maximize2 size={16} />
								Expand
							</motion.button>
						</>
					) : (
						<div className="preview-placeholder">
							<FileImage size={48} />
							<span>Preview unavailable</span>
						</div>
					)}
				</motion.div>

				{/* Asset Info */}
				<motion.div className="hero-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
					<div className="info-header">
						<div>
							<span className="category-tag">{asset.category || 'Digital Asset'}</span>
							<h1 className="asset-title">{asset.title}</h1>
							<p className="asset-description">
								{asset.description || 'No description has been added to this registered asset.'}
							</p>
						</div>
						{asset.vaultProtection?.isLocked && (
							<div className="lock-badge">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
									<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
									<path d="M7 11V7a5 5 0 0 1 10 0v4" />
								</svg>
								Protected
							</div>
						)}
					</div>

					{/* Asset Reference */}
					<motion.div className="asset-ref-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
						<span>Asset ID</span>
						<code>{assetReference(asset.id)}</code>
						<button
							className="copy-btn"
							onClick={() => navigator.clipboard.writeText(assetReference(asset.id))}
							title="Copy asset ID"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
								<rect x="8" y="2" width="8" height="4" rx="1" />
							</svg>
						</button>
					</motion.div>

					{/* Asset Facts */}
					<motion.div className="asset-facts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
						<div className="fact-item">
							<FileImage size={16} />
							<div>
								<span>Type</span>
								<strong>{asset.mimeType?.startsWith('image/') ? 'Image' : 'File'}</strong>
							</div>
						</div>
						<div className="fact-item">
							<FileImage size={16} />
							<div>
								<span>Format</span>
								<strong>{asset.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown'}</strong>
							</div>
						</div>
						<div className="fact-item">
							<FileImage size={16} />
							<div>
								<span>Size</span>
								<strong>{formatSize(asset.fileSize)}</strong>
							</div>
						</div>
						<div className="fact-item">
							<FileImage size={16} />
							<div>
								<span>Dimensions</span>
								<strong>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : 'Unavailable'}</strong>
							</div>
						</div>
					</motion.div>

					{/* Date registered */}
					<motion.p className="registered-date" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
						📅 Registered {new Date(asset.createdAt).toLocaleDateString()}
					</motion.p>
				</motion.div>

				{/* Authenticity Gauge */}
				<motion.div className="hero-gauge" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
					<AuthenticityGauge score={integrityScore} label="Integrity Score" />
				</motion.div>
			</div>
		</motion.section>
	);
}
