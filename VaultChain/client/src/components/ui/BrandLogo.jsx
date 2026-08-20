import { Link2 } from 'lucide-react';

export default function BrandLogo({ compact = false, className = '' }) {
	return (
		<span className={`brand-logo ${className}`.trim()} aria-label="VaultChain">
			<span className="brand-logo__mark" aria-hidden="true">
				<svg viewBox="0 0 40 40" role="img">
					<path d="M20 3.5 34 9v10.2c0 8.3-5.8 14.1-14 17.3-8.2-3.2-14-9-14-17.3V9l14-5.5Z" />
					<path d="m13 15 7 12 7-12" />
				</svg>
				<Link2 size={11} strokeWidth={2.4} />
			</span>
			{compact ? null : <span className="brand-logo__text">VaultChain</span>}
		</span>
	);
}
