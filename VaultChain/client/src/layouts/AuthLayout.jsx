import { CheckCircle2, Fingerprint, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import BrandLogo from '../components/ui/BrandLogo';

export default function AuthLayout({ children, mode = 'login' }) {
	return (
		<main className="auth-layout">
			<section className="auth-story" aria-label="VaultChain security overview">
				<Link to="/" className="auth-story__brand"><BrandLogo /></Link>
				<div className="auth-story__content">
					<span className="eyebrow"><Sparkles size={13} /> Digital ownership, secured</span>
					<h1>Your assets deserve<br />a verifiable identity.</h1>
					<p>Fingerprint, inspect, and protect digital work inside one focused workspace.</p>
					<div className="auth-security-card">
						<div className="auth-security-card__radar"><ShieldCheck size={44} /><span /><span /></div>
						<div className="auth-security-card__status"><CheckCircle2 size={15} /><span>Integrity systems ready</span></div>
						<div className="auth-security-card__hash"><Fingerprint size={15} /><code>6e3a9f1c···c42d18b7</code></div>
					</div>
				</div>
				<p className="auth-story__footer">SHA-256 fingerprinting · Perceptual matching · Metadata intelligence</p>
			</section>
			<section className="auth-panel">
				<Link to="/" className="auth-panel__mobile-brand"><BrandLogo /></Link>
				<div className="auth-card" data-mode={mode}>{children}</div>
			</section>
		</main>
	);
}
