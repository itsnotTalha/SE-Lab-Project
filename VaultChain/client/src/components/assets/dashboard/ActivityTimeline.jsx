import { motion } from 'framer-motion';

/**
 * Professional Activity Timeline component
 * Shows chronological events with icons, timestamps, and status
 */
export default function ActivityTimeline({ events = [] }) {
	if (!events || events.length === 0) {
		return (
			<div className="timeline-empty">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
					<path d="M12 6v6l4 2" />
				</svg>
				<p>No activity yet</p>
			</div>
		);
	}

	const container = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: {
				staggerChildren: 0.08,
				delayChildren: 0.1,
			},
		},
	};

	const item = {
		hidden: { opacity: 0, x: -20 },
		show: { opacity: 1, x: 0, transition: { duration: 0.5 } },
	};

	const getEventIcon = (type) => {
		switch (type) {
			case 'upload':
				return (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="17 8 12 3 7 8" />
						<line x1="12" y1="3" x2="12" y2="15" />
					</svg>
				);
			case 'verification':
				return (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
				);
			case 'blockchain':
				return (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<rect x="3" y="3" width="7" height="7" />
						<rect x="14" y="3" width="7" height="7" />
						<rect x="14" y="14" width="7" height="7" />
						<rect x="3" y="14" width="7" height="7" />
					</svg>
				);
			case 'transfer':
				return (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<circle cx="12" cy="12" r="1" />
						<path d="M12 1v6m0 6v6" />
						<path d="M4.22 4.22l4.24 4.24m4.24 4.24l4.24 4.24" />
						<path d="M19.78 4.22l-4.24 4.24m-4.24 4.24l-4.24 4.24" />
					</svg>
				);
			default:
				return (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<circle cx="12" cy="12" r="1" />
					</svg>
				);
		}
	};

	const getEventColor = (type) => {
		switch (type) {
			case 'upload':
				return '#41d9ff';
			case 'verification':
				return '#42d69d';
			case 'blockchain':
				return '#8b9dff';
			case 'transfer':
				return '#fbbf24';
			default:
				return '#818da1';
		}
	};

	return (
		<motion.div className="activity-timeline" variants={container} initial="hidden" animate="show">
			{events.map((event, index) => (
				<motion.div key={`${event.title}-${event.date}`} className="timeline-item" variants={item}>
					{/* Timeline Connector */}
					{index < events.length - 1 && <div className="timeline-connector" style={{ borderLeftColor: getEventColor(event.type) }} />}

					{/* Event Dot */}
					<div className="timeline-dot" style={{ backgroundColor: getEventColor(event.type) }}>
						{getEventIcon(event.type)}
					</div>

					{/* Event Content */}
					<div className="timeline-content">
						<div className="event-header">
							<h4>{event.title}</h4>
							<time>{new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>
						</div>
						{event.detail && <p className="event-detail">{event.detail}</p>}
						{event.timestamp && <small className="event-time">{new Date(event.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</small>}
						{event.status && <span className={`event-status status-${event.status}`}>{event.status}</span>}
					</div>
				</motion.div>
			))}
		</motion.div>
	);
}
