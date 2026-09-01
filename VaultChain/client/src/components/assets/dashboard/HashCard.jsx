import { motion } from 'framer-motion';
import { useState } from 'react';

/**
 * Hash Card component for displaying cryptographic hashes
 * Shows hash values with copy functionality and descriptions
 */
export default function HashCard({ title, description, hash, type = 'sha256' }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		if (hash) {
			navigator.clipboard.writeText(hash);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const getHashDescription = (hashType) => {
		switch (hashType) {
			case 'sha256':
				return 'Byte-for-byte cryptographic identity. Any change produces a different value.';
			case 'phash':
				return 'Visual similarity fingerprint. Remains close after resizing or recompression.';
			case 'average':
				return 'Average color hash for quick visual comparison.';
			default:
				return description;
		}
	};

	const getIcon = (hashType) => {
		if (hashType === 'sha256') {
			return (
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2" />
					<path d="M12 6v6l4 2" />
				</svg>
			);
		}
		if (hashType === 'phash') {
			return (
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<rect x="3" y="3" width="7" height="7" />
					<rect x="14" y="3" width="7" height="7" />
					<rect x="14" y="14" width="7" height="7" />
					<rect x="3" y="14" width="7" height="7" />
				</svg>
			);
		}
		return (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			</svg>
		);
	};

	return (
		<motion.article className="hash-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
			<div className="card-header">
				<span className="card-icon">{getIcon(type)}</span>
				<div>
					<h3>{title}</h3>
					<p>{getHashDescription(type)}</p>
				</div>
			</div>

			{hash ? (
				<>
					<code className="hash-value">{hash}</code>
					<motion.button className="copy-button" onClick={handleCopy} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
							<rect x="8" y="2" width="8" height="4" rx="1" />
						</svg>
						{copied ? 'Copied!' : 'Copy hash'}
					</motion.button>
				</>
			) : (
				<div className="hash-unavailable">
					<p>Hash unavailable</p>
					<small>This value is locked or not yet generated</small>
				</div>
			)}
		</motion.article>
	);
}
