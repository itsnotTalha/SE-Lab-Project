import {
	ArrowDownRight, CheckCircle2, Copy, Download,
	DollarSign, FileSpreadsheet, Percent, PieChart,
	Send, Sparkles, TrendingUp, Users, Wallet
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Toast from '../../components/ui/Toast';
import { organizationService } from '../../services/organizationService';
import '../../styles/organizations.css';
import '../../styles/organization-finance.css';

export default function OrgRevenuePage() {
	const [activeWs, setActiveWs] = useState(() => organizationService.getActiveWorkspace());
	const [org, setOrg] = useState(() => organizationService.getOrganization(activeWs?.id || 'org-1'));
	const [toast, setToast] = useState('');
	const actionTimer = useRef(null);
	useEffect(() => () => window.clearTimeout(actionTimer.current), []);
	const [disburseOpen, setDisburseOpen] = useState(false);
	const [disburseAmount, setDisburseAmount] = useState('5000');
	const [isExecuting, setIsExecuting] = useState(false);

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

	// Export financial audit CSV
	function handleExportCSV() {
		const sales = org?.sales || [];
		if (sales.length === 0) {
			setToast('No sales records to export.');
			return;
		}

		const headers = ['Tx ID', 'Date', 'Asset Title', 'Buyer', 'Gross Amount ($)', 'Treasury Cut ($)', 'Creator Payout ($)', 'Tx Hash'];
		const rows = sales.map((s) => [
			s.id,
			`"${s.date}"`,
			`"${s.assetTitle.replace(/"/g, '""')}"`,
			`"${s.buyer}"`,
			s.grossAmount,
			s.treasuryCut,
			s.creatorPayout,
			s.txHash,
		]);

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `${org?.slug || 'organization'}_financial_ledger_${new Date().toISOString().split('T')[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		setToast('Financial ledger CSV downloaded successfully!');
	}

	function handleDisburseDividends(e) {
		e.preventDefault();
		const amt = Number(disburseAmount);
		if (!amt || amt <= 0) {
			setToast('Please enter a valid disbursement amount.');
			return;
		}
		if (amt > (org?.treasuryBalance || 0)) {
			setToast('Disbursement amount exceeds current available treasury balance.');
			return;
		}

		setIsExecuting(true);
		actionTimer.current = window.setTimeout(() => {
			organizationService.batchDisburseDividends(org.id, amt);
			reload();
			setIsExecuting(false);
			setDisburseOpen(false);
			setToast(`Successfully disbursed $${amt.toLocaleString()} dividends across ${org.members?.length || 0} active contributors!`);
		}, 900);
	}

	const sales = org?.sales || [];
	const members = org?.members || [];
	const grossTotal = sales.reduce((sum, s) => sum + (s.grossAmount || 0), 0);
	const treasuryTotal = sales.reduce((sum, s) => sum + (s.treasuryCut || 0), 0);
	const contributorTotal = sales.reduce((sum, s) => sum + (s.creatorPayout || 0), 0);
	const treasuryBalance = org?.treasuryBalance || 0;

	// Calculate breakdown for disburse modal preview
	const totalSplitSum = members.reduce((sum, m) => sum + (m.split || 0), 0) || 100;
	const parsedDisburse = Number(disburseAmount) || 0;

	return (
		<div className="org-page org-hub-container org-finance">
			{toast && <Toast message={toast} onClose={() => setToast('')} />}

			<PageHeader
				title="Revenue & payouts"
				description={`Demo sales and contributor allocations for ${org?.name || 'Organization'}.`}
				action={
					<div style={{ display: 'flex', gap: '10px' }}>
						<Button
							variant="secondary"
							onClick={handleExportCSV}

						>
							<Download size={16} style={{ marginRight: '6px' }} />
							Export Audit (CSV)
						</Button>
						<Button
							variant="primary"
							onClick={() => setDisburseOpen(true)}

						>
							<Sparkles size={16} style={{ marginRight: '6px' }} />
							Batch Disburse Dividends
						</Button>
					</div>
				}
			/>

			{/* KPI Summary Cards */}
			<div className="org-stats-grid" style={{ marginBottom: '24px' }}>
				<div className="org-stat-card" style={{ '--stat-accent': 'var(--finance-gold)', '--stat-accent-soft': 'var(--finance-gold-soft)' }}>
					<div className="org-stat-card__icon" style={{ background: 'var(--finance-gold-soft)', color: 'var(--finance-gold)' }}>
						<DollarSign size={24} />
					</div>
					<div className="org-stat-card__content">
						<span className="org-stat-card__label">Total Gross Sales</span>
						<span className="org-stat-card__value" style={{ color: 'var(--finance-gold)' }}>
							${grossTotal.toLocaleString()}
						</span>
						<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
							{sales.length} Settled On-Chain Invoices
						</span>
					</div>
				</div>

				<div className="org-stat-card" style={{ '--stat-accent': 'var(--finance-positive)', '--stat-accent-soft': 'var(--finance-positive-soft)' }}>
					<div className="org-stat-card__icon" style={{ background: 'var(--finance-positive-soft)', color: 'var(--finance-positive)' }}>
						<TrendingUp size={24} />
					</div>
					<div className="org-stat-card__content">
						<span className="org-stat-card__label">Contributor Payouts</span>
						<span className="org-stat-card__value" style={{ color: 'var(--finance-positive)' }}>
							${contributorTotal.toLocaleString()}
						</span>
						<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
							Direct Disbursals to Creators
						</span>
					</div>
				</div>

				<div className="org-stat-card" style={{ '--stat-accent': 'var(--finance-cyan)', '--stat-accent-soft': 'var(--finance-cyan-soft)' }}>
					<div className="org-stat-card__icon" style={{ background: 'var(--finance-cyan-soft)', color: 'var(--finance-cyan)' }}>
						<Wallet size={24} />
					</div>
					<div className="org-stat-card__content">
						<span className="org-stat-card__label">Corporate Retention</span>
						<span className="org-stat-card__value" style={{ color: 'var(--finance-cyan)' }}>
							${treasuryTotal.toLocaleString()}
						</span>
						<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
							{100 - (org?.splitPercent || 80)}% Corporate Treasury Cut
						</span>
					</div>
				</div>

				<div className="org-stat-card" style={{ '--stat-accent': 'var(--finance-violet)', '--stat-accent-soft': 'var(--finance-violet-soft)' }}>
					<div className="org-stat-card__icon" style={{ background: 'var(--finance-violet-soft)', color: 'var(--finance-violet)' }}>
						<PieChart size={24} />
					</div>
					<div className="org-stat-card__content">
						<span className="org-stat-card__label">Royalty Split Share</span>
						<span className="org-stat-card__value" style={{ color: 'var(--finance-violet)' }}>
							{org?.splitPercent || 80}% / {100 - (org?.splitPercent || 80)}%
						</span>
						<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
							Creators / Corporate Treasury
						</span>
					</div>
				</div>
			</div>

			{/* Contributor Dividend Pool */}
			<div className="org-vaults-section" style={{ marginBottom: '28px' }}>
				<div className="org-section-header">
					<div>
						<h2 className="org-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<Users size={20} color="var(--primary)" />
							Contributor Royalty Pool & Dividend Allocations
						</h2>
						<p className="org-section-subtitle">
							Individual contributor equity splits programmed into smart-contract automated distribution.
						</p>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
							Available Treasury Reserve: <strong style={{ color: 'var(--finance-gold)' }}>${treasuryBalance.toLocaleString()}</strong>
						</span>
					</div>
				</div>

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
						gap: '16px',
						marginTop: '16px',
					}}
				>
					{members.map((member) => {
						const memberEarnings = Math.round((contributorTotal * (member.split || 0)) / 100);
						return (
							<div
								key={member.id}
								style={{
									background: 'var(--surface)',
									border: '1px solid var(--border)',
									borderRadius: '12px',
									padding: '16px',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
										<div
											style={{
												width: '38px',
												height: '38px',
												borderRadius: '10px',
												background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(16, 185, 129, 0.2))',
												color: 'var(--text)',
												border: '1px solid rgba(139, 92, 246, 0.35)',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												fontWeight: 700,
												fontSize: '0.88rem',
											}}
										>
											{member.name.charAt(0)}
										</div>
										<div>
											<strong style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{member.name}</strong>
											<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.role}</div>
										</div>
									</div>
									<span
										style={{
											fontSize: '0.78rem',
											fontWeight: 700,
											color: 'var(--finance-gold)',
											background: 'var(--finance-gold-soft)',
											border: '1px solid var(--finance-gold-border)',
											padding: '3px 8px',
											borderRadius: '6px',
										}}
									>
										{member.split}% Split
									</span>
								</div>

								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										background: 'var(--surface)',
										padding: '8px 12px',
										borderRadius: '8px',
										marginTop: '12px',
									}}
								>
									<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cumulative Earned:</span>
									<span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--finance-positive)' }}>
										${memberEarnings.toLocaleString()}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Settled Marketplace Sales Table */}
			<div className="org-listings-section">
				<div className="org-section-header">
					<div>
						<h2 className="org-section-title">Settled Marketplace Transactions & Escrow Cleared</h2>
						<p className="org-section-subtitle">
							Cryptographically reconciled sales with automated corporate retention and contributor disbursals.
						</p>
					</div>
					<span
						style={{
							fontSize: '0.8rem',
							color: 'var(--finance-positive)',
							display: 'inline-flex',
							alignItems: 'center',
							gap: '6px',
						}}
					>
						<CheckCircle2 size={15} /> All Invoices Cleared
					</span>
				</div>

				<div className="org-finance-table-wrapper">
					<table className="org-finance-table">
						<thead>
							<tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
								<th style={{ padding: '14px 16px' }}>Invoice ID</th>
								<th style={{ padding: '14px 16px' }}>Date</th>
								<th style={{ padding: '14px 16px' }}>Asset / Description</th>
								<th style={{ padding: '14px 16px' }}>Purchaser / Entity</th>
								<th style={{ padding: '14px 16px' }}>Gross ($)</th>
								<th style={{ padding: '14px 16px' }}>Treasury Cut ($)</th>
								<th style={{ padding: '14px 16px' }}>Creator Payout ($)</th>
								<th style={{ padding: '14px 16px' }}>Tx Hash</th>
							</tr>
						</thead>
						<tbody>
							{sales.length === 0 ? (
								<tr>
									<td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
										No sales transactions recorded yet.
									</td>
								</tr>
							) : (
								sales.map((sale) => (
									<tr
										key={sale.id}
										style={{
											borderBottom: '1px solid var(--surface)',
											transition: 'background 0.2s',
										}}
									>
										<td style={{ padding: '14px 16px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
											{sale.id}
										</td>
										<td style={{ padding: '14px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
											{sale.date}
										</td>
										<td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>
											{sale.assetTitle}
										</td>
										<td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
											{sale.buyer}
										</td>
										<td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>
											${sale.grossAmount.toLocaleString()}
										</td>
										<td style={{ padding: '14px 16px', color: 'var(--primary)' }}>
											${sale.treasuryCut.toLocaleString()}
										</td>
										<td style={{ padding: '14px 16px', color: 'var(--finance-positive)', fontWeight: 600 }}>
											${sale.creatorPayout.toLocaleString()}
										</td>
										<td style={{ padding: '14px 16px' }}>
											<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
												<span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
													{sale.txHash ? `${sale.txHash.slice(0, 8)}...${sale.txHash.slice(-6)}` : '0x9fa4...1a89'}
												</span>
												<Copy
													size={12}
													style={{ cursor: 'pointer', opacity: 0.6 }}
													onClick={() => handleCopy(sale.txHash || '0x9fa481e6a0d2fbc193b2a543881ef108d4b31a89', 'Transaction Hash')}
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

			{/* ================= MODAL: BATCH DISBURSE DIVIDENDS ================= */}
			{disburseOpen && (
				<div className="org-modal-overlay" onClick={() => !isExecuting && setDisburseOpen(false)}>
					<div className="org-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
						<div className="org-modal-header">
							<h3 className="org-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<Sparkles size={18} color="var(--primary)" />
								Batch Disburse Contributor Dividends
							</h3>
							<button type="button" className="org-modal-close" onClick={() => setDisburseOpen(false)}>
								✕
							</button>
						</div>

						<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
							Distribute liquid corporate treasury funds directly to all active contributors in accordance with their designated equity split.
						</p>

						<form onSubmit={handleDisburseDividends}>
							<div className="org-form-group">
								<label className="org-form-label">Total Disbursement Pool (USD)</label>
								<input
									type="number"
									className="org-form-input"
									value={disburseAmount}
									onChange={(e) => setDisburseAmount(e.target.value)}
									required
									min="1"
									max={treasuryBalance}
								/>
								<span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
									Available Treasury Reserves: ${treasuryBalance.toLocaleString()}
								</span>
							</div>

							<div style={{ marginTop: '16px', marginBottom: '20px' }}>
								<label className="org-form-label" style={{ marginBottom: '8px' }}>
									Calculated Contributor Allocations Preview:
								</label>
								<div
									style={{
										background: 'var(--surface)',
										border: '1px solid var(--border)',
										borderRadius: '8px',
										padding: '12px',
										display: 'flex',
										flexDirection: 'column',
										gap: '8px',
									}}
								>
									{members.map((m) => {
										const share = Math.round((parsedDisburse * (m.split || 0)) / totalSplitSum);
										return (
											<div
												key={m.id}
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													fontSize: '0.85rem',
												}}
											>
												<span style={{ color: 'var(--text)' }}>
													{m.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({m.split}%)</span>
												</span>
												<strong style={{ color: 'var(--finance-positive)' }}>${share.toLocaleString()}</strong>
											</div>
										);
									})}
								</div>
							</div>

							<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
								<Button type="button" variant="secondary" onClick={() => setDisburseOpen(false)}>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="primary"
									disabled={isExecuting}

								>
									{isExecuting ? 'Executing Consensus Disbursal...' : 'Authorize Batch Disbursal'}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
