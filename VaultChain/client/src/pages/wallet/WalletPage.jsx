import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/walletService';

const pageStyles = {
	page: {
		minHeight: '100vh',
		padding: '32px 24px 48px',
		background:
			'radial-gradient(circle at top left, rgba(59, 130, 246, 0.22), transparent 30%), radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 24%), linear-gradient(135deg, #020617 0%, #0f172a 55%, #111827 100%)',
		color: '#e5e7eb',
	},
	container: {
		maxWidth: '880px',
		margin: '0 auto',
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: '16px',
		marginBottom: '24px',
		flexWrap: 'wrap',
	},
	headline: {
		margin: 0,
		fontSize: '2.35rem',
		fontWeight: 800,
		letterSpacing: '-0.03em',
	},
	subtitle: {
		margin: '10px 0 0',
		color: '#94a3b8',
		maxWidth: '560px',
		lineHeight: 1.6,
	},
	nav: {
		display: 'flex',
		gap: '10px',
		flexWrap: 'wrap',
	},
	navLink: {
		padding: '10px 14px',
		borderRadius: '999px',
		background: 'rgba(15, 23, 42, 0.72)',
		border: '1px solid rgba(148, 163, 184, 0.18)',
		color: '#e5e7eb',
		textDecoration: 'none',
		fontWeight: 600,
	},
	card: {
		background: 'rgba(15, 23, 42, 0.82)',
		border: '1px solid rgba(148, 163, 184, 0.16)',
		borderRadius: '22px',
		boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)',
		backdropFilter: 'blur(14px)',
		padding: '24px',
		marginBottom: '20px',
	},
	balanceLabel: {
		margin: 0,
		fontSize: '0.85rem',
		textTransform: 'uppercase',
		letterSpacing: '0.08em',
		color: '#94a3b8',
	},
	balanceValue: {
		margin: '8px 0 0',
		fontSize: '2.6rem',
		fontWeight: 800,
	},
	panelTitle: {
		margin: 0,
		fontSize: '1.15rem',
		fontWeight: 700,
	},
	form: {
		display: 'grid',
		gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
		gap: '14px',
		marginTop: '18px',
		alignItems: 'end',
	},
	field: {
		display: 'grid',
		gap: '8px',
	},
	label: {
		fontSize: '0.92rem',
		fontWeight: 600,
		color: '#cbd5e1',
	},
	input: {
		width: '100%',
		padding: '13px 14px',
		borderRadius: '12px',
		border: '1px solid rgba(148, 163, 184, 0.18)',
		background: '#020617',
		color: '#e5e7eb',
		fontSize: '0.98rem',
	},
	button: {
		padding: '13px 16px',
		border: 'none',
		borderRadius: '12px',
		background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
		color: '#fff',
		fontSize: '0.98rem',
		fontWeight: 700,
		cursor: 'pointer',
	},
	error: {
		gridColumn: '1 / -1',
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(220, 38, 38, 0.12)',
		border: '1px solid rgba(220, 38, 38, 0.3)',
		color: '#fca5a5',
	},
	list: {
		display: 'grid',
		gap: '12px',
		marginTop: '18px',
	},
	item: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: '12px',
		padding: '14px',
		borderRadius: '14px',
		background: 'rgba(2, 6, 23, 0.68)',
		border: '1px solid rgba(148, 163, 184, 0.12)',
	},
	itemType: {
		margin: 0,
		fontWeight: 700,
		textTransform: 'capitalize',
	},
	itemDescription: {
		margin: '4px 0 0',
		fontSize: '0.88rem',
		color: '#94a3b8',
	},
	itemDate: {
		margin: '4px 0 0',
		fontSize: '0.78rem',
		color: '#64748b',
	},
	amountCredit: {
		fontWeight: 800,
		color: '#4ade80',
		whiteSpace: 'nowrap',
	},
	amountDebit: {
		fontWeight: 800,
		color: '#f87171',
		whiteSpace: 'nowrap',
	},
	muted: {
		color: '#94a3b8',
	},
};

const CREDIT_TYPES = new Set(['deposit', 'sale']);

export default function WalletPage() {
	const navigate = useNavigate();
	const { logout } = useAuth();
	const [wallet, setWallet] = useState(null);
	const [transactions, setTransactions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [type, setType] = useState('deposit');
	const [amount, setAmount] = useState('');
	const [description, setDescription] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');

	async function loadWallet() {
		setLoading(true);
		setLoadError('');

		try {
			const [walletData, transactionsData] = await Promise.all([
				walletService.getWallet(),
				walletService.getTransactions(),
			]);
			setWallet(walletData);
			setTransactions(transactionsData);
		} catch (error) {
			setLoadError(error.message);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadWallet();
	}, []);

	function handleLogout() {
		logout();
		navigate('/login', { replace: true });
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setSubmitting(true);
		setSubmitError('');

		try {
			await walletService.addTransaction({ type, amount: Number(amount), description });
			setAmount('');
			setDescription('');
			await loadWallet();
		} catch (error) {
			setSubmitError(error.message);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div style={pageStyles.page}>
			<div style={pageStyles.container}>
				<header style={pageStyles.header}>
					<div>
						<h1 style={pageStyles.headline}>Wallet</h1>
						<p style={pageStyles.subtitle}>View your balance, record transactions, and review your transaction history.</p>
					</div>
					<nav style={pageStyles.nav}>
						<Link to="/dashboard" style={pageStyles.navLink}>
							Dashboard
						</Link>
						<Link to="/marketplace" style={pageStyles.navLink}>
							Marketplace
						</Link>
						<button type="button" onClick={handleLogout} style={{ ...pageStyles.navLink, cursor: 'pointer' }}>
							Logout
						</button>
					</nav>
				</header>

				{loadError ? <div style={{ ...pageStyles.card, ...pageStyles.error, gridColumn: 'unset' }}>{loadError}</div> : null}

				<section style={pageStyles.card}>
					<p style={pageStyles.balanceLabel}>Wallet Balance</p>
					<p style={pageStyles.balanceValue}>
						{loading ? '...' : `${wallet?.balance?.toLocaleString() ?? 0} ${wallet?.currency ?? 'Credits'}`}
					</p>
				</section>

				<section style={pageStyles.card}>
					<h2 style={pageStyles.panelTitle}>Add transaction</h2>
					<form onSubmit={handleSubmit} style={pageStyles.form}>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Type</span>
							<select value={type} onChange={(event) => setType(event.target.value)} style={pageStyles.input}>
								<option value="deposit">Deposit</option>
								<option value="withdrawal">Withdrawal</option>
								<option value="purchase">Purchase</option>
								<option value="sale">Sale</option>
							</select>
						</label>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Amount</span>
							<input
								type="number"
								min="0.01"
								step="0.01"
								value={amount}
								onChange={(event) => setAmount(event.target.value)}
								style={pageStyles.input}
								placeholder="500"
								required
							/>
						</label>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Description</span>
							<input
								type="text"
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								style={pageStyles.input}
								placeholder="Manual deposit"
							/>
						</label>
						{submitError ? <div style={pageStyles.error}>{submitError}</div> : null}
						<button type="submit" style={pageStyles.button} disabled={submitting}>
							{submitting ? 'Saving...' : 'Add transaction'}
						</button>
					</form>
				</section>

				<section style={pageStyles.card}>
					<h2 style={pageStyles.panelTitle}>Recent transactions</h2>
					<div style={pageStyles.list}>
						{loading ? (
							<p style={pageStyles.muted}>Loading...</p>
						) : transactions.length === 0 ? (
							<p style={pageStyles.muted}>No transactions yet.</p>
						) : (
							transactions.map((transaction) => (
								<div key={transaction.id} style={pageStyles.item}>
									<div>
										<p style={pageStyles.itemType}>{transaction.type}</p>
										{transaction.description ? <p style={pageStyles.itemDescription}>{transaction.description}</p> : null}
										<p style={pageStyles.itemDate}>{transaction.createdAt}</p>
									</div>
									<span style={CREDIT_TYPES.has(transaction.type) ? pageStyles.amountCredit : pageStyles.amountDebit}>
										{CREDIT_TYPES.has(transaction.type) ? '+' : '-'}
										{transaction.amount.toLocaleString()}
									</span>
								</div>
							))
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
