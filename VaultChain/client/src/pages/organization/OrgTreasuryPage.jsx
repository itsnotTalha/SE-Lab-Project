import {
	AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2,
	Clock, Copy, ExternalLink, KeyRound, Lock,
	Plus, RefreshCw, Send, ShieldCheck, Wallet
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Toast from '../../components/ui/Toast';
import { organizationService } from '../../services/organizationService';
import '../../styles/organizations.css';
import '../../styles/organization-finance.css';

export default function OrgTreasuryPage() {
	const [activeWs, setActiveWs] = useState(() => organizationService.getActiveWorkspace());
	const [org, setOrg] = useState(() => organizationService.getOrganization(activeWs?.id || 'org-1'));
	const [toast, setToast] = useState('');
	const actionTimer = useRef(null);
	useEffect(() => () => window.clearTimeout(actionTimer.current), []);
	const [filter, setFilter] = useState('ALL');

	// Modals
	const [withdrawOpen, setWithdrawOpen] = useState(false);
	const [depositOpen, setDepositOpen] = useState(false);

	// Withdraw form
	const [withdrawAmount, setWithdrawAmount] = useState('');
	const [recipient, setRecipient] = useState('');
	const [withdrawNote, setWithdrawNote] = useState('');
	const [signingStep, setSigningStep] = useState(false);

	// Deposit form
	const [depositAmount, setDepositAmount] = useState('');
	const [depositNote, setDepositNote] = useState('Enterprise Capital Infusion');

	function reload() {
		const current = organizationService.getOrganization(org?.id);
		if (current) setOrg(current);
	}

	useEffect(() => {
		function onOrgUpdate() { reload(); }
		function onWorkspaceChange(e) {
			if (e.detail?.id) {
				const target = organizationService.getOrganization(e.detail.id);
				if (target) setOrg(target);
			}
		}
		window.addEventListener('vaultchain:org_updated', onOrgUpdate);
		window.addEventListener('vaultchain:workspace_changed', onWorkspaceChange);
		return () => {
			window.removeEventListener('vaultchain:org_updated', onOrgUpdate);
			window.removeEventListener('vaultchain:workspace_changed', onWorkspaceChange);
		};
	}, [org?.id]);

	function handleCopy(text, label) {
		navigator.clipboard.writeText(text);
		setToast(`Copied ${label} to clipboard!`);
	}

	function handleWithdrawSubmit(e) {
		e.preventDefault();
		const amt = Number(withdrawAmount);
		if (!amt || amt <= 0) {
			setToast('Please enter a valid transfer amount.');
			return;
		}
		if (amt > (org?.treasuryBalance || 0)) {
			setToast('Insufficient treasury funds for this transfer.');
			return;
		}

		setSigningStep(true);
		actionTimer.current = window.setTimeout(() => {
			organizationService.withdrawTreasury(
				org.id,
				amt,
				recipient || 'Corporate Disbursal',
				withdrawNote || 'Authorized Multi-Sig Payout'
			);
			reload();
			setSigningStep(false);
			setWithdrawOpen(false);
			setWithdrawAmount('');
			setRecipient('');
			setWithdrawNote('');
			setToast(`Transferred $${amt.toLocaleString()} authorized with 3 of 4 multi-sig signatures.`);
		}, 1000);
	}

	function handleDepositSubmit(e) {
		e.preventDefault();
		const amt = Number(depositAmount);
		if (!amt || amt <= 0) {
			setToast('Please enter a valid deposit amount.');
			return;
		}

		organizationService.depositTreasury(org.id, amt, depositNote);
		reload();
		setDepositOpen(false);
		setDepositAmount('');
		setDepositNote('Enterprise Capital Infusion');
		setToast(`Deposited $${amt.toLocaleString()} to shared multi-sig treasury.`);
	}

	const balance = org?.treasuryBalance || 0;
	const transactions = org?.treasuryTransactions || [
		{
			id: 'tt-101',
			type: 'Inflow',
			category: 'Marketplace Royalties',
			amount: 8540,
			recipient: 'Shared Treasury',
			date: '2026-03-28 09:15',
			note: 'Automated 20% platform retention cut from genesis sales',
			status: 'Executed',
			txHash: '0x3a4b91f08a9c2d3e4b5c6d7e8f9a0b1c2d3e4f5a',
		},
		{
			id: 'tt-102',
			type: 'Outflow',
			category: 'Multi-Sig Infrastructure',
			amount: 2500,
			recipient: 'Consensus Gas Reserve',
			date: '2026-03-22 14:30',
			note: 'Pre-funded gas station relayer for zero-knowledge verify contracts',
			status: 'Executed',
			txHash: '0x88fca02b11cd89e23fa710928bcf9a01e3b561c2',
		},
	];

	const filteredTxs = transactions.filter((tx) => {
		if (filter === 'INFLOW') return tx.type === 'Inflow';
		if (filter === 'OUTFLOW') return tx.type === 'Outflow';
		return true;
	});

	const ethEquivalent = (balance / 3200).toFixed(2);
	const signers = org?.members || [];
	const requiredSigs = Math.min(3, Math.max(1, signers.length));

	return (
		<div className="org-page org-hub-container org-finance">
			{toast && <Toast message={toast} onClose={() => setToast('')} />}

			<PageHeader
				title="Treasury"
				description={`Demo balances and transactions for ${org?.name || 'Organization'}.`}
				action={
					<div style={{ display: 'flex', gap: '10px' }}>
						<Button
							variant="secondary"
							onClick={() => setDepositOpen(true)}

						>
							<Plus size={16} style={{ marginRight: '6px' }} />
							Deposit Capital
						</Button>
						<Button
							variant="primary"
							onClick={() => setWithdrawOpen(true)}

						>
							<Send size={16} style={{ marginRight: '6px' }} />
							Propose Transfer / Withdrawal
						</Button>
					</div>
				}
			/>

			{/* KPI Summary Cards */}
			<div className="org-stats-grid" style={{ marginBottom: '24px' }}>
				<div className="org-stat-card" style={{ '--stat-accent': 'var(--finance-gold)', '--stat-accent-soft': 'var(--finance-gold-soft)' }}>
					<div className="org-stat-card__icon" style={{ background: 'var(--finance-gold-soft)', color: 'var(--finance-gold)' }}>
						<Wallet size={24} />
					</div>
					<div className="org-stat-card__content">
						<span className="org-stat-card__label">Available Treasury Balance</span>
						<span className="org-stat-card__value" style={{ color: 'var(--finance-gold)' }}>
							${balance.toLocaleString()}
						</span>
						<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
							≈ {ethEquivalent} ETH in Smart Contract Vault
						</span>
					</div>
				</div>

				<div className="org-stat-card" style={{ '--stat-accent': 'var(--finance-cyan)', '--stat-accent-soft': 'var(--finance-cyan-soft)' }}>
					<div className="org-stat-card__icon" style={{ background: 'var(--finance-cyan-soft)', color: 'var(--finance-cyan)' }}>
						<ShieldCheck size={24} />
					</div>
					<div className="org-stat-card__content">
						<span className="org-stat-card__label">Multi-Sig Consensus Quorum</span>
						<span className="org-stat-card__value">
							{requiredSigs} of {signers.length} Signers
						</span>
						<span style={{ fontSize: '0.75rem', color: 'var(--finance-positive)', fontWeight: 600 }}>
							● Quorum Threshold Active (75%)
						</span>
					</div>
				</div>

				<div className="org-stat-card" style={{ '--stat-accent': 'var(--finance-violet)', '--stat-accent-soft': 'var(--finance-violet-soft)' }}>
					<div className="org-stat-card__icon" style={{ background: 'var(--finance-violet-soft)', color: 'var(--finance-violet)' }}>
						<Clock size={24} />
					</div>
					<div className="org-stat-card__content">
						<span className="org-stat-card__label">Timelock Settlement Policy</span>
						<span className="org-stat-card__value">24 Hours</span>
						<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
							Hardware M-of-N Timelocked Vault
						</span>
					</div>
				</div>

				<div className="org-stat-card" style={{ '--stat-accent': 'var(--finance-positive)', '--stat-accent-soft': 'var(--finance-positive-soft)' }}>
					<div className="org-stat-card__icon" style={{ background: 'var(--finance-positive-soft)', color: 'var(--finance-positive)' }}>
						<ArrowUpRight size={24} />
					</div>
					<div className="org-stat-card__content">
						<span className="org-stat-card__label">Total Sales Retention</span>
						<span className="org-stat-card__value" style={{ color: 'var(--finance-positive)' }}>
							${(org?.sales?.reduce((sum, s) => sum + (s.treasuryCut || 0), 0) || 8540).toLocaleString()}
						</span>
						<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
							Corporate Platform Dividend Retention
						</span>
					</div>
				</div>
			</div>

			{/* Multi-Sig Custody Status & Signers */}
			<div className="org-vaults-section" style={{ marginBottom: '28px' }}>
				<div className="org-section-header">
					<div>
						<h2 className="org-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<KeyRound size={20} color="var(--primary)" />
							Multi-Sig Key Signers & Escrow Custody
						</h2>
						<p className="org-section-subtitle">
							Every treasury expenditure requires cryptographic multi-party authorization prior to on-chain execution.
						</p>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
						<code
							style={{
								background: 'var(--surface)',
								padding: '6px 12px',
								borderRadius: '6px',
								border: '1px solid var(--border)',
								fontSize: '0.8rem',
								fontFamily: 'monospace',
								color: 'var(--primary)',
								display: 'flex',
								alignItems: 'center',
								gap: '6px',
							}}
						>
							0x71C8...B824
							<Copy
								size={13}
								style={{ cursor: 'pointer', opacity: 0.8 }}
								onClick={() => handleCopy('0x71C8240019284fa98124801824bba9182390b824', 'Treasury Contract Address')}
							/>
						</code>
					</div>
				</div>

				<div className="org-signers-grid">
					{signers.map((member, idx) => (
						<div key={member.id} className="org-signer-card">
							<div
								className="org-signer-avatar"
								style={{
									background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(139, 92, 246, 0.2))',
									color: 'var(--text)',
									border: '1px solid rgba(245, 158, 11, 0.35)',
								}}
							>
								{member.name.charAt(0)}
							</div>
							<div style={{ flex: 1, minWidth: 0 }}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
									<strong style={{ fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
										{member.name}
									</strong>
									<span
										className="org-signer-badge"
										style={{
											background: 'var(--finance-positive-soft)',
											color: 'var(--finance-positive)',
											border: '1px solid var(--finance-positive-border)',
										}}
									>
										KEY ACTIVE
									</span>
								</div>
								<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
									{member.role} • <strong style={{ color: 'var(--finance-gold)' }}>{member.split}%</strong> Split
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Treasury Transactions Ledger */}
			<div className="org-listings-section">
				<div className="org-section-header">
					<div>
						<h2 className="org-section-title">Treasury Flow & Settlement Audit Ledger</h2>
						<p className="org-section-subtitle">
							Immutable transaction ledger recording inflows, outflows, and verified multi-sig approvals.
						</p>
					</div>
					<div style={{ display: 'flex', gap: '8px' }}>
						{['ALL', 'INFLOW', 'OUTFLOW'].map((f) => (
							<button
								key={f}
								type="button"
								onClick={() => setFilter(f)}
								style={{
									padding: '6px 14px',
									borderRadius: '8px',
									fontSize: '0.8rem',
									fontWeight: 600,
									border: filter === f ? '1px solid var(--primary)' : '1px solid var(--border)',
									background: filter === f ? 'var(--primary-soft)' : 'var(--surface)',
									color: filter === f ? 'var(--primary)' : 'var(--text-secondary)',
									cursor: 'pointer',
								}}
							>
								{f}
							</button>
						))}
					</div>
				</div>

				<div className="org-finance-table-wrapper">
					<table className="org-finance-table">
						<thead>
							<tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
								<th style={{ padding: '14px 16px' }}>Type & ID</th>
								<th style={{ padding: '14px 16px' }}>Date</th>
								<th style={{ padding: '14px 16px' }}>Category & Note</th>
								<th style={{ padding: '14px 16px' }}>Recipient / Target</th>
								<th style={{ padding: '14px 16px' }}>Amount</th>
								<th style={{ padding: '14px 16px' }}>Status</th>
								<th style={{ padding: '14px 16px' }}>Tx Hash</th>
							</tr>
						</thead>
						<tbody>
							{filteredTxs.length === 0 ? (
								<tr>
									<td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
										No transactions found for the selected filter.
									</td>
								</tr>
							) : (
								filteredTxs.map((tx) => (
									<tr
										key={tx.id}
										style={{
											borderBottom: '1px solid var(--surface)',
											transition: 'background 0.2s',
										}}
									>
										<td style={{ padding: '14px 16px' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
												{tx.type === 'Inflow' ? (
													<span
														style={{
															display: 'inline-flex',
															alignItems: 'center',
															gap: '4px',
															padding: '2px 8px',
															borderRadius: '4px',
															background: 'var(--success-soft)',
															color: 'var(--finance-positive)',
															fontWeight: 600,
															fontSize: '0.75rem',
														}}
													>
														<ArrowDownRight size={14} /> INFLOW
													</span>
												) : (
													<span
														style={{
															display: 'inline-flex',
															alignItems: 'center',
															gap: '4px',
															padding: '2px 8px',
															borderRadius: '4px',
															background: 'var(--danger-soft)',
															color: 'var(--finance-negative)',
															fontWeight: 600,
															fontSize: '0.75rem',
														}}
													>
														<ArrowUpRight size={14} /> OUTFLOW
													</span>
												)}
												<span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
													{tx.id}
												</span>
											</div>
										</td>
										<td style={{ padding: '14px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
											{tx.date}
										</td>
										<td style={{ padding: '14px 16px' }}>
											<div style={{ fontWeight: 600, color: 'var(--text)' }}>{tx.category}</div>
											<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
												{tx.note}
											</div>
										</td>
										<td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
											{tx.recipient || 'Corporate Treasury'}
										</td>
										<td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.95rem' }}>
											<span style={{ color: tx.type === 'Inflow' ? 'var(--finance-positive)' : 'var(--finance-negative)' }}>
												{tx.type === 'Inflow' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
											</span>
										</td>
										<td style={{ padding: '14px 16px' }}>
											<span
												style={{
													display: 'inline-flex',
													alignItems: 'center',
													gap: '4px',
													padding: '2px 8px',
													borderRadius: '4px',
													background: 'var(--primary-soft)',
													color: 'var(--primary)',
													fontSize: '0.75rem',
													fontWeight: 600,
												}}
											>
												<CheckCircle2 size={12} /> {tx.status || 'Executed'}
											</span>
										</td>
										<td style={{ padding: '14px 16px' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
												<span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
													{tx.txHash ? `${tx.txHash.slice(0, 8)}...${tx.txHash.slice(-6)}` : '0x3a4b...f5a'}
												</span>
												<Copy
													size={12}
													style={{ cursor: 'pointer', opacity: 0.6 }}
													onClick={() => handleCopy(tx.txHash || '0x3a4b91f08a9c2d3e4b5c6d7e8f9a0b1c2d3e4f5a', 'Transaction Hash')}
												/>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* ================= MODAL: PROPOSE WITHDRAWAL ================= */}
			{withdrawOpen && (
				<div className="org-modal-overlay" onClick={() => !signingStep && setWithdrawOpen(false)}>
					<div className="org-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
						<div className="org-modal-header">
							<h3 className="org-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<Send size={18} color="var(--primary)" />
								Propose Multi-Sig Transfer
							</h3>
							<button type="button" className="org-modal-close" onClick={() => setWithdrawOpen(false)}>
								✕
							</button>
						</div>

						<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
							Transfers are governed by the {requiredSigs}-of-{signers.length} multi-signature consensus threshold.
						</p>

						<form onSubmit={handleWithdrawSubmit}>
							<div className="org-form-group">
								<label className="org-form-label">Transfer Amount (USD)</label>
								<input
									type="number"
									className="org-form-input"
									placeholder="e.g. 5000"
									value={withdrawAmount}
									onChange={(e) => setWithdrawAmount(e.target.value)}
									required
									min="1"
									max={balance}
								/>
								<span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
									Current available treasury balance: ${balance.toLocaleString()}
								</span>
							</div>

							<div className="org-form-group">
								<label className="org-form-label">Recipient Address or Department</label>
								<input
									type="text"
									className="org-form-input"
									placeholder="e.g. 0x82aF...902 or Cryptographic R&D Ops"
									value={recipient}
									onChange={(e) => setRecipient(e.target.value)}
									required
								/>
							</div>

							<div className="org-form-group">
								<label className="org-form-label">Purpose Note / Memo</label>
								<input
									type="text"
									className="org-form-input"
									placeholder="e.g. External Penetration Audit & Security Bug Bounty"
									value={withdrawNote}
									onChange={(e) => setWithdrawNote(e.target.value)}
									required
								/>
							</div>

							<div
								style={{
									background: 'var(--primary-soft)',
									border: '1px solid var(--primary-soft)',
									borderRadius: '8px',
									padding: '12px',
									marginBottom: '20px',
									fontSize: '0.8rem',
									color: 'var(--text-secondary)',
								}}
							>
								<strong>Required Multi-Sig Quorum:</strong> {requiredSigs} valid signatures required before blockchain dispatch.
							</div>

							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
								<Button type="button" variant="secondary" onClick={() => setWithdrawOpen(false)}>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="primary"
									disabled={signingStep}

								>
									{signingStep ? 'Signing with Hardware Key...' : 'Sign & Dispatch Proposal'}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ================= MODAL: DEPOSIT CAPITAL ================= */}
			{depositOpen && (
				<div className="org-modal-overlay" onClick={() => setDepositOpen(false)}>
					<div className="org-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
						<div className="org-modal-header">
							<h3 className="org-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<Plus size={18} color="var(--finance-positive)" />
								Deposit Capital to Treasury
							</h3>
							<button type="button" className="org-modal-close" onClick={() => setDepositOpen(false)}>
								✕
							</button>
						</div>

						<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
							Infuse operating capital into the {org?.name} multi-sig treasury smart contract.
						</p>

						<form onSubmit={handleDepositSubmit}>
							<div className="org-form-group">
								<label className="org-form-label">Deposit Amount (USD)</label>
								<input
									type="number"
									className="org-form-input"
									placeholder="e.g. 10000"
									value={depositAmount}
									onChange={(e) => setDepositAmount(e.target.value)}
									required
									min="10"
								/>
							</div>

							<div className="org-form-group">
								<label className="org-form-label">Deposit Note / Memo</label>
								<input
									type="text"
									className="org-form-input"
									placeholder="e.g. Series Seed Escrow Injection"
									value={depositNote}
									onChange={(e) => setDepositNote(e.target.value)}
								/>
							</div>

							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
								<Button type="button" variant="secondary" onClick={() => setDepositOpen(false)}>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="primary"

								>
									Confirm Deposit
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
