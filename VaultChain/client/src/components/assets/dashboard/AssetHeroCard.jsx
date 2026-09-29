import { motion } from 'framer-motion';
import { Maximize2, FileImage, Sparkles } from 'lucide-react';
import AuthenticityGauge from './AuthenticityGauge';
import VisualDnaGlyph from '../../ui/VisualDnaGlyph';

/**
 * Asset Hero Card - Main hero section with preview, Visual DNA glyph, and 3D card action
 */
export default function AssetHeroCard({ asset, previewUrl, integrityScore, onPreviewClick, onOpenHolo }) {
	const formatSize = (bytes) => {
		if (!Number.isFinite(bytes)) return 'Unavailable';
		if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
		return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
	};

	const assetReference = (id) => `VC-A${String(id).padStart(6, '0')}`;
	const assetHash = asset.sha256 || asset.fileSha256 || `VC-A${asset.id}-SHA256`;

	return (
		<motion.section className="asset-hero-card" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
			<div className="hero-layout">
				{/* Asset Preview */}
				<motion.div className="hero-preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
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
				<motion.div className="hero-info" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.16 }}>
					<div className="info-header">
						<div>
							<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<span className="category-tag">{asset.category || 'Digital Asset'}</span>
								{onOpenHolo && (
									<button
										type="button"
										onClick={onOpenHolo}
										style={{
											background: 'linear-gradient(135deg, rgba(65,217,255,0.18), rgba(121,139,255,0.15))',
											border: '1px solid rgba(65,217,255,0.35)',
											borderRadius: '8px',
											color: '#38bdf8',
											fontSize: '0.68rem',
											fontWeight: 700,
											padding: '3px 8px',
											cursor: 'pointer',
											display: 'inline-flex',
											alignItems: 'center',
											gap: '4px',
										}}
									>
										<Sparkles size={12} /> 3D Proof Card
									</button>
								)}
							</div>
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

					{/* Asset Reference & Visual DNA Identicon */}
					<motion.div
						className="asset-ref-box"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.16 }}
						style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
					>
						<VisualDnaGlyph hash={assetHash} size={36} />
						<div style={{ flex: 1 }}>
							<span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)' }}>Asset ID & Visual DNA</span>
							<code>{assetReference(asset.id)}</code>
						</div>
						<button
							className="copy-btn"
							onClick={() => navigator.clipboard.writeText(assetReference(asset.id))}
							title="Copy asset ID"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1 2-2h2" />
								<rect x="8" y="2" width="8" height="4" rx="1" />
							</svg>
						</button>
					</motion.div>

					{/* Asset Facts */}
					<motion.div className="asset-facts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
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
					<motion.p className="registered-date" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
						📅 Registered {new Date(asset.createdAt).toLocaleDateString()}
					</motion.p>
				</motion.div>

				{/* Authenticity Gauge */}
				<motion.div className="hero-gauge" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.16 }}>
					<AuthenticityGauge score={integrityScore} label="Integrity Score" />
				</motion.div>
			</div>
		</motion.section>
	);
}
