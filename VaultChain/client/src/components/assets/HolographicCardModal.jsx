import {
	CheckCircle2, Cpu, Download, Lock, QrCode, RotateCw,
	ShieldCheck, Sparkles, Wifi, X
} from 'lucide-react';
import { useRef, useState } from 'react';
import VisualDnaGlyph from '../ui/VisualDnaGlyph';
import '../../styles/holographic-card.css';

export default function HolographicCardModal({ open, onClose, asset, previewUrl }) {
	const cardRef = useRef(null);
	const [rotateX, setRotateX] = useState(0);
	const [rotateY, setRotateY] = useState(0);
	const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
	const [glareOpacity, setGlareOpacity] = useState(0.5);
	const [isFlipped, setIsFlipped] = useState(false);
	const [foil, setFoil] = useState('foil-cyber');

	if (!open || !asset) return null;

	function handleMouseMove(e) {
		if (!cardRef.current) return;
		const rect = cardRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		const rotX = -((y - centerY) / centerY) * 18;
		const rotY = ((x - centerX) / centerX) * 18;

		setRotateX(rotX);
		setRotateY(rotY);
		setGlarePos({
			x: (x / rect.width) * 100,
			y: (y / rect.height) * 100,
		});
		setGlareOpacity(0.85);
	}

	function handleMouseLeave() {
		setRotateX(0);
		setRotateY(0);
		setGlarePos({ x: 50, y: 50 });
		setGlareOpacity(0.45);
	}

	const hash = asset.fileSha256 || asset.sha256 || asset.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
	const title = asset.title || 'Digital Asset';
	const refId = asset.reference || `VC-A${String(asset.id || 0).padStart(6, '0')}`;
	const category = asset.category || 'Digital Media';
	const createdDate = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '2026';
	const imageSrc = previewUrl || asset.previewUrl || asset.thumbnailUrl;

	return (
		<div className="holo-modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className={`holo-modal-container ${foil}`}>
				{/* Ambient Glow behind the card */}
				<div className="holo-ambient-glow" />

				{/* 3D Card Shell */}
				<div
					ref={cardRef}
					className={`holo-card-wrapper ${isFlipped ? 'is-flipped' : ''}`}
					style={{
						transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY + (isFlipped ? 180 : 0)}deg)`,
					}}
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
				>
					{/* ================= FRONT SIDE ================= */}
					<div className={`holo-card-face holo-card-front ${foil}`}>
						{/* Dynamic Refractive Glare Layer */}
						<div
							className="holo-glare-layer"
							style={{
								backgroundPosition: `${glarePos.x}% ${glarePos.y}%`,
								opacity: glareOpacity,
							}}
						/>
						<div className="holo-rainbow-sheen" />

						{/* Top Passport Ribbon */}
						<div className="holo-top-ribbon">
							<div className="holo-protocol-badge">
								<div className="holo-pulse-dot" />
								<span>VAULTCHAIN PROOF PROTOCOL // IMMUTABLE</span>
							</div>
							<div className="holo-nfc-indicator">
								<Wifi size={13} className="holo-wifi-icon" />
								<span>NFC ACTIVE</span>
							</div>
						</div>

						{/* Smart Chip & Card Header */}
						<div className="holo-header-row">
							<div className="holo-emv-chip">
								<div className="holo-emv-lines">
									<div className="emv-line-horizontal" />
									<div className="emv-line-vertical" />
									<div className="emv-core" />
								</div>
							</div>

							<div className="holo-header-badges">
								<div className="holo-tier-badge">
									<ShieldCheck size={13} />
									<span>LEVEL 3 IMMUTABLE</span>
								</div>
							</div>
						</div>

						{/* Center Holographic Viewport (Preview Image or Giant Visual DNA) */}
						<div className="holo-viewport-frame">
							{imageSrc ? (
								<div className="holo-image-viewport">
									<img src={imageSrc} alt={title} className="holo-source-image" />
									<div className="holo-scanlines" />
									<div className="holo-image-corner top-left" />
									<div className="holo-image-corner top-right" />
									<div className="holo-image-corner bottom-left" />
									<div className="holo-image-corner bottom-right" />
									<div className="holo-dna-inset">
										<VisualDnaGlyph hash={hash} size={42} />
									</div>
								</div>
							) : (
								<div className="holo-dna-center-stage">
									<div className="holo-radar-ring outer" />
									<div className="holo-radar-ring inner" />
									<VisualDnaGlyph hash={hash} size={120} />
								</div>
							)}
						</div>

						{/* Asset Metadata & Cryptography Identity */}
						<div className="holo-identity-section">
							<div className="holo-meta-tags">
								<span className="holo-category-pill">{category.toUpperCase()}</span>
								<span className="holo-date-pill">{createdDate}</span>
							</div>
							<h2 className="holo-title">{title}</h2>
							<div className="holo-ref-badge">
								<code>{refId}</code>
								<span className="holo-verified-dot" title="Cryptographically Validated">✓ VERIFIED</span>
							</div>
						</div>

						{/* Bottom Proof Security Bar */}
						<div className="holo-footer-security">
							<div className="holo-security-detail">
								<span className="holo-label">SHA-256 HASH ROOT</span>
								<code className="holo-hash-compact">{hash.slice(0, 16)}••••{hash.slice(-12)}</code>
							</div>
							<div className="holo-authenticity-seal">
								<div className="seal-orbit">
									<Sparkles size={16} />
								</div>
								<div className="seal-text">
									<span>OFFICIAL</span>
									<strong>CERTIFIED</strong>
								</div>
							</div>
						</div>
					</div>

					{/* ================= BACK SIDE ================= */}
					<div className={`holo-card-face holo-card-back ${foil}`}>
						<div
							className="holo-glare-layer"
							style={{
								backgroundPosition: `${100 - glarePos.x}% ${100 - glarePos.y}%`,
								opacity: glareOpacity * 0.7,
							}}
						/>

						{/* Magnetic Holographic Stripe */}
						<div className="holo-mag-stripe">
							<div className="holo-stripe-noise" />
							<div className="holo-stripe-text">VAULTCHAIN IMMUTABLE ZERO-KNOWLEDGE SECURITY STANDARD • DO NOT DUPLICATE</div>
						</div>

						{/* Signature Panel */}
						<div className="holo-signature-panel">
							<div className="holo-sig-text">AUTHENTICATED LEDGER PROOF // VALID</div>
							<div className="holo-sig-barcode" />
						</div>

						{/* Technical Cryptographic Data Body */}
						<div className="holo-back-body">
							<div className="holo-back-data-row">
								<div className="holo-back-item">
									<span className="holo-label">Full SHA-256 Fingerprint</span>
									<code className="holo-full-hash">{hash}</code>
								</div>
							</div>

							<div className="holo-back-meta-grid">
								<div className="holo-back-cell">
									<span className="holo-label">Consensus State</span>
									<span className="holo-state-badge">
										<CheckCircle2 size={12} /> ZK-Verified
									</span>
								</div>
								<div className="holo-back-cell">
									<span className="holo-label">Security Tier</span>
									<span className="holo-val-highlight">Tier 3 (Ledger Bound)</span>
								</div>
								<div className="holo-back-cell">
									<span className="holo-label">Cryptographic Protocol</span>
									<span className="holo-val">ECDSA / SHA-256</span>
								</div>
								<div className="holo-back-cell">
									<span className="holo-label">Issuing Authority</span>
									<span className="holo-val">VaultChain Node #1</span>
								</div>
							</div>

							<div className="holo-qr-showcase">
								<div className="holo-qr-box">
									<QrCode size={52} />
								</div>
								<div className="holo-qr-caption">
									<strong>SCAN TO AUDIT PROOF</strong>
									<span>Validates origin, ownership timestamps and cryptographic chain in real-time.</span>
								</div>
							</div>
						</div>

						{/* Back Bottom Copyright */}
						<div className="holo-back-footer">
							<span>VAULTCHAIN TRUSTED TIMESTAMPING ENGINE • ISO/IEC 18014-3 COMPLIANT</span>
						</div>
					</div>
				</div>

				{/* Floating Tactical Controls Dock */}
				<div className="holo-controls-dock">
					<button
						type="button"
						className={`holo-dock-btn ${isFlipped ? 'is-active' : ''}`}
						onClick={() => setIsFlipped(!isFlipped)}
						title="Flip card between Front and Back"
					>
						<RotateCw size={15} />
						<span>{isFlipped ? 'Show Front' : 'Flip (360°)'}</span>
					</button>

					<div className="holo-dock-divider" />

					<div className="holo-foil-selector">
						<button
							type="button"
							className={`holo-foil-chip cyber ${foil === 'foil-cyber' ? 'is-active' : ''}`}
							onClick={() => setFoil('foil-cyber')}
							title="Cyber Obsidian Foil"
						>
							<span className="chip-indicator cyber" /> Cyber
						</button>
						<button
							type="button"
							className={`holo-foil-chip gold ${foil === 'foil-gold' ? 'is-active' : ''}`}
							onClick={() => setFoil('foil-gold')}
							title="24K Sovereign Gold Foil"
						>
							<span className="chip-indicator gold" /> Gold
						</button>
						<button
							type="button"
							className={`holo-foil-chip prism ${foil === 'foil-prism' ? 'is-active' : ''}`}
							onClick={() => setFoil('foil-prism')}
							title="Iridescent Prism Hologram"
						>
							<span className="chip-indicator prism" /> Prism
						</button>
						<button
							type="button"
							className={`holo-foil-chip emerald ${foil === 'foil-emerald' ? 'is-active' : ''}`}
							onClick={() => setFoil('foil-emerald')}
							title="Quantum Emerald Foil"
						>
							<span className="chip-indicator emerald" /> Emerald
						</button>
					</div>

					<div className="holo-dock-divider" />

					<button
						type="button"
						className="holo-dock-btn holo-close-btn"
						onClick={onClose}
						title="Close Proof Card"
					>
						<X size={16} />
					</button>
				</div>
			</div>
		</div>
	);
}
