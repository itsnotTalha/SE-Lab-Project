import { motion } from 'framer-motion';

/**
 * Metadata Card component for displaying asset metadata
 * Shows metadata in a structured, visual format with icons
 */
export default function MetadataCard({ title, metadata = {}, icon: Icon = null }) {
	if (!metadata || Object.keys(metadata).filter((key) => metadata[key]).length === 0) {
		return (
			<motion.article className="metadata-card metadata-card--empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
				<div className="card-header">
					{Icon && <Icon size={20} />}
					<h3>{title}</h3>
				</div>
				<p className="empty-state">No metadata available</p>
			</motion.article>
		);
	}

	const container = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: {
				staggerChildren: 0.05,
			},
		},
	};

	const item = {
		hidden: { opacity: 0, x: -10 },
		show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
	};

	const getMetadataIcon = (key) => {
		const iconMap = {
			camera: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
					<circle cx="12" cy="13" r="4" />
				</svg>
			),
			date: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
					<line x1="16" y1="2" x2="16" y2="6" />
					<line x1="8" y1="2" x2="8" y2="6" />
					<line x1="3" y1="10" x2="21" y2="10" />
				</svg>
			),
			location: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
					<circle cx="12" cy="10" r="3" />
				</svg>
			),
			size: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M6 9l6-6 6 6M12 3v18M5.5 21h13" />
				</svg>
			),
			iso: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2" />
				</svg>
			),
			aperture: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<circle cx="12" cy="12" r="1" />
					<path d="M12 1v6m0 6v6" />
					<path d="M4.22 4.22l4.24 4.24m4.24 4.24l4.24 4.24" />
					<path d="M19.78 4.22l-4.24 4.24m-4.24 4.24l-4.24 4.24" />
				</svg>
			),
			shutter: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
				</svg>
			),
		};

		return iconMap[key] || iconMap.size;
	};

	return (
		<motion.article className="metadata-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
			<div className="card-header">
				{Icon && <Icon size={20} />}
				<h3>{title}</h3>
			</div>

			<motion.div className="metadata-grid" variants={container} initial="hidden" animate="show">
				{Object.entries(metadata)
					.filter(([, value]) => value !== null && value !== undefined && value !== '')
					.map(([key, value], idx) => (
						<motion.div key={key} className="metadata-item" variants={item}>
							<div className="metadata-icon">{getMetadataIcon(key)}</div>
							<div className="metadata-content">
								<span className="metadata-label">
									{key
										.replace(/_/g, ' ')
										.replace(/([A-Z])/g, ' $1')
										.replace(/^./, (str) => str.toUpperCase())}
								</span>
								<strong className="metadata-value">{value}</strong>
							</div>
						</motion.div>
					))}
			</motion.div>
		</motion.article>
	);
}
