import { motion } from 'framer-motion';

/**
 * Enhanced Transaction Table for marketplace transfers
 * Shows transaction history with styled rows and status indicators
 */
export default function TransactionTable({ transactions = [] }) {
	if (!transactions || transactions.length === 0) {
		return (
			<div className="transaction-empty">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
					<line x1="12" y1="8" x2="12" y2="16" />
					<line x1="8" y1="12" x2="16" y2="12" />
				</svg>
				<p>No transaction history</p>
			</div>
		);
	}

	const container = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: {
				staggerChildren: 0.05,
				delayChildren: 0.05,
			},
		},
	};

	const item = {
		hidden: { opacity: 0, x: -10 },
		show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
	};

	const getTransactionIcon = (type) => {
		if (type?.toLowerCase().includes('sale')) {
			return (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M12 1v22m0 0l-7-7m7 7l7-7" />
				</svg>
			);
		}
		if (type?.toLowerCase().includes('purchase')) {
			return (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M12 23V1m0 0l7 7m-7-7L5 8" />
				</svg>
			);
		}
		return (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
				<path d="M21 3v5h-5" />
			</svg>
		);
	};

	return (
		<motion.div className="transaction-table" variants={container} initial="hidden" animate="show">
			<div className="table-header">
				<div className="col col-date">Date</div>
				<div className="col col-type">Type</div>
				<div className="col col-parties">Transfer</div>
				<div className="col col-amount">Value</div>
				<div className="col col-status">Status</div>
			</div>

			<motion.div className="table-body">
				{transactions.map((tx, idx) => (
					<motion.div key={`${tx.transactionReference || idx}`} className="table-row" variants={item} whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
						<div className="col col-date">
							<span className="mobile-label">Date</span>
							<time>{new Date(tx.transferredAt).toLocaleDateString()}</time>
						</div>
						<div className="col col-type">
							<span className="mobile-label">Type</span>
							<div className="type-badge">
								{getTransactionIcon(tx.transferType)}
								<span>{tx.transferType || 'Transfer'}</span>
							</div>
						</div>
						<div className="col col-parties">
							<span className="mobile-label">Transfer</span>
							<div className="parties">
								<code>{tx.previousOwner || 'Origin'}</code>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<path d="M5 12h14M12 5l7 7-7 7" />
								</svg>
								<code>{tx.newOwner}</code>
							</div>
						</div>
						<div className="col col-amount">
							<span className="mobile-label">Value</span>
							<strong>{Number(tx.price || 0).toLocaleString()} credits</strong>
						</div>
						<div className="col col-status">
							<span className="mobile-label">Status</span>
							<motion.span className="status-badge" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
								✓ Completed
							</motion.span>
						</div>
					</motion.div>
				))}
			</motion.div>
		</motion.div>
	);
}
