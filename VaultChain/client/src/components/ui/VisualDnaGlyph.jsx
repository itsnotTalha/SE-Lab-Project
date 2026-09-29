import { useMemo } from 'react';

export default function VisualDnaGlyph({
	hash = '00000000000000000000000000000000',
	size = 48,
	interactive = true,
	className = '',
}) {
	const data = useMemo(() => {
		const clean = (hash || '0').replace(/[^a-fA-F0-9]/g, '').padEnd(32, 'a');
		const num = (idx) => parseInt(clean.slice(idx * 2, idx * 2 + 2) || '0', 16);

		const hue1 = (num(0) * 360) / 255;
		const hue2 = (hue1 + 45 + (num(1) % 90)) % 360;
		const primary = `hsl(${hue1}, 85%, 60%)`;
		const secondary = `hsl(${hue2}, 90%, 55%)`;

		const sides = 3 + (num(2) % 6);
		const innerRing = 20 + (num(3) % 25);
		const outerRing = 60 + (num(4) % 25);
		const rotation = num(5) % 360;
		const coreShape = num(6) % 3;
		const density = 4 + (num(7) % 5);

		const points = [];
		for (let i = 0; i < sides * 2; i++) {
			const angle = (i * Math.PI) / sides;
			const r = i % 2 === 0 ? outerRing : innerRing;
			const x = 100 + r * Math.cos(angle);
			const y = 100 + r * Math.sin(angle);
			points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
		}

		return {
			primary,
			secondary,
			pointsStr: points.join(' '),
			rotation,
			coreShape,
			density,
			innerRing,
		};
	}, [hash]);

	return (
		<div
			className={`visual-dna-glyph ${className}`}
			style={{
				width: `${size}px`,
				height: `${size}px`,
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				filter: 'drop-shadow(0 0 8px rgba(65, 217, 255, 0.25))',
				transition: interactive ? 'transform 0.25s ease' : 'none',
				cursor: interactive ? 'pointer' : 'default',
			}}
			title={`Cryptographic Visual DNA: ${hash ? hash.slice(0, 16) : ''}...`}
		>
			<svg
				viewBox="0 0 200 200"
				width="100%"
				height="100%"
				style={{ overflow: 'visible' }}
			>
				<defs>
					<linearGradient id={`dna-grad-${hash.slice(0, 8)}`} x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stopColor={data.primary} />
						<stop offset="100%" stopColor={data.secondary} />
					</linearGradient>
					<filter id="dna-glow" x="-20%" y="-20%" width="140%" height="140%">
						<feGaussianBlur stdDeviation="3" result="blur" />
						<feComposite in="SourceGraphic" in2="blur" operator="over" />
					</filter>
				</defs>

				<circle
					cx="100"
					cy="100"
					r="92"
					fill="rgba(8, 14, 26, 0.75)"
					stroke={data.primary}
					strokeWidth="2"
					strokeDasharray="4 6"
					opacity="0.6"
				/>

				<g transform={`rotate(${data.rotation} 100 100)`}>
					<polygon
						points={data.pointsStr}
						fill="none"
						stroke={`url(#dna-grad-${hash.slice(0, 8)})`}
						strokeWidth="3.5"
						strokeLinejoin="round"
						filter="url(#dna-glow)"
					/>

					{Array.from({ length: data.density }).map((_, idx) => {
						const angle = (idx * 360) / data.density;
						return (
							<line
								key={idx}
								x1="100"
								y1="100"
								x2={100 + data.innerRing * Math.cos((angle * Math.PI) / 180)}
								y2={100 + data.innerRing * Math.sin((angle * Math.PI) / 180)}
								stroke={data.secondary}
								strokeWidth="2"
								strokeLinecap="round"
								opacity="0.8"
							/>
						);
					})}
				</g>

				{data.coreShape === 0 ? (
					<circle cx="100" cy="100" r="14" fill={data.primary} opacity="0.9" />
				) : data.coreShape === 1 ? (
					<polygon
						points="100,82 118,100 100,118 82,100"
						fill={data.secondary}
						opacity="0.95"
					/>
				) : (
					<circle
						cx="100"
						cy="100"
						r="12"
						fill="none"
						stroke={data.primary}
						strokeWidth="4"
					/>
				)}

				<circle cx="100" cy="100" r="4" fill="#ffffff" />
			</svg>
		</div>
	);
}
