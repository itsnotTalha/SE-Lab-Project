import { ArrowRight, ChevronLeft, ChevronRight, Lock, Share2, ShieldCheck, Sparkles, Trophy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import '../../styles/vault-wrapped.css';

const SLIDES = [
	{
		title: 'Your Year in Cryptography',
		subtitle: '2026 VaultChain Security Recap',
		metric: '100%',
		caption: 'Zero security breaches or integrity leaks detected across all assets.',
		icon: ShieldCheck,
		class: 'wrapped-slide-0',
	},
	{
		title: 'Assets Under Custody',
		subtitle: 'Total Protected Footprint',
		metric: '18',
		caption: 'Digital assets immutably hashed and anchored to the ledger.',
		icon: Lock,
		class: 'wrapped-slide-1',
	},
	{
		title: 'Top Creator Tier',
		subtitle: 'Reputation & Authenticity',
		metric: 'Top 1%',
		caption: 'Earned the Verified Pioneer badge with 0 dispute flags.',
		icon: Trophy,
		class: 'wrapped-slide-2',
	},
	{
		title: 'Your Cryptographic Persona',
		subtitle: 'Based on your activity',
		metric: 'Cipher Sentinel',
		caption: 'You favor air-gapped zero-knowledge vaults and precision hash matching.',
		icon: Sparkles,
		class: 'wrapped-slide-3',
	},
];

export default function VaultChainWrappedModal({ open, onClose }) {
	const [current, setCurrent] = useState(0);

	useEffect(() => {
		if (!open) return;
		const timer = setInterval(() => {
			setCurrent((prev) => (prev < SLIDES.length - 1 ? prev + 1 : prev));
		}, 6000);
		return () => clearInterval(timer);
	}, [open, current]);

	if (!open) return null;

	const slide = SLIDES[current];
	const IconComp = slide.icon;

	return (
		<div className="wrapped-backdrop" role="dialog" aria-modal="true">
			<div className={`wrapped-container ${slide.class}`}>
				<div>
					<div className="wrapped-progress-bar-row">
						{SLIDES.map((_, idx) => (
							<div key={idx} className="wrapped-progress-track">
								<div
									className="wrapped-progress-fill"
									style={{
										width: idx < current ? '100%' : idx === current ? '100%' : '0%',
									}}
								/>
							</div>
						))}
					</div>

					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em' }}>
							<Sparkles size={15} style={{ color: '#f8bc4e' }} />
							<span>VAULTCHAIN WRAPPED</span>
						</div>
						<button
							type="button"
							onClick={onClose}
							style={{ background: 'none', border: 0, color: '#fff', cursor: 'pointer', padding: '4px' }}
						>
							<X size={20} />
						</button>
					</div>
				</div>

				<div key={current} className="wrapped-slide-content">
					<div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', marginBottom: '16px' }}>
						<IconComp size={30} />
					</div>
					<h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px' }}>{slide.title}</h2>
					<span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{slide.subtitle}</span>

					<div className="wrapped-big-number">{slide.metric}</div>

					<p style={{ fontSize: '0.85rem', opacity: 0.9, maxWidth: '280px', lineHeight: 1.5, margin: 0 }}>
						{slide.caption}
					</p>
				</div>

				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<button
						type="button"
						className="icon-button"
						style={{ color: '#fff' }}
						disabled={current === 0}
						onClick={() => setCurrent((c) => Math.max(0, c - 1))}
					>
						<ChevronLeft size={20} />
					</button>

					{current === SLIDES.length - 1 ? (
						<Button onClick={onClose} icon={Share2}>
							Close & Share
						</Button>
					) : (
						<span style={{ fontSize: '0.68rem', opacity: 0.6 }}>
							{current + 1} of {SLIDES.length}
						</span>
					)}

					<button
						type="button"
						className="icon-button"
						style={{ color: '#fff' }}
						disabled={current === SLIDES.length - 1}
						onClick={() => setCurrent((c) => Math.min(SLIDES.length - 1, c + 1))}
					>
						<ChevronRight size={20} />
					</button>
				</div>
			</div>
		</div>
	);
}
