import {
	Building2, CheckCircle2, FolderLock, FolderPlus, Images,
	KeyRound, Layers3, LockKeyhole, LockOpen, Plus, ShieldCheck
} from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import Toast from '../../components/ui/Toast';
import VaultCard from '../../components/vault/VaultCard';
import VaultFormModal from '../../components/vault/VaultFormModal';
import { vaultService } from '../../services/vaultService';
import { organizationService } from '../../services/organizationService';

export default function VaultPage() {
	const [activeWs, setActiveWs] = useState(() => organizationService.getActiveWorkspace());
	const isOrgMode = activeWs && activeWs.type === 'organization';
	const currentOrg = isOrgMode ? organizationService.getOrganization(activeWs.id) : null;

	// Personal vaults state
	const [personalVaults, setPersonalVaults] = useState([]);
	const [personalStats, setPersonalStats] = useState(null);
	const [personalLoading, setPersonalLoading] = useState(true);

	// Company vaults state
	const [companyVaults, setCompanyVaults] = useState(() => (isOrgMode ? organizationService.getCompanyVaults(currentOrg?.id) : []));

	const [error, setError] = useState('');
	const [createOpen, setCreateOpen] = useState(false);
	const [toast, setToast] = useState('');

	// Corporate Create Vault Form State
	const [corpName, setCorpName] = useState('');
	const [corpDesc, setCorpDesc] = useState('');
	const [corpMultiSig, setCorpMultiSig] = useState('2 of 4 Signatures');

	async function loadPersonalVaults() {
		setPersonalLoading(true);
		setError('');
		try {
			const data = await vaultService.getVaults();
			setPersonalVaults(data.vaults);
			setPersonalStats(data.stats);
		} catch (loadError) {
			setError(loadError.message);
		} finally {
			setPersonalLoading(false);
		}
	}

	useEffect(() => {
		if (!isOrgMode) {
			loadPersonalVaults();
		} else if (currentOrg) {
			setCompanyVaults(organizationService.getCompanyVaults(currentOrg.id));
		}
	}, [isOrgMode, currentOrg?.id]);

	useEffect(() => {
		function onWorkspaceChange(e) {
			if (e.detail) {
				setActiveWs(e.detail);
				if (e.detail.type === 'organization') {
					setCompanyVaults(organizationService.getCompanyVaults(e.detail.id));
				}
			}
		}
		function onCompanyVaultsChange(e) {
			if (isOrgMode && currentOrg) {
				setCompanyVaults(organizationService.getCompanyVaults(currentOrg.id));
			}
		}
		window.addEventListener('vaultchain:workspace_changed', onWorkspaceChange);
		window.addEventListener('vaultchain:company_vaults_changed', onCompanyVaultsChange);
		return () => {
			window.removeEventListener('vaultchain:workspace_changed', onWorkspaceChange);
			window.removeEventListener('vaultchain:company_vaults_changed', onCompanyVaultsChange);
		};
	}, [isOrgMode, currentOrg?.id]);

	// Auto-lock timer for personal vaults
	useEffect(() => {
		if (isOrgMode) return undefined;
		const expirations = personalVaults
			.filter((vault) => !vault.isLocked && vault.unlockExpiresAt)
			.map((vault) => new Date(vault.unlockExpiresAt).getTime());
		if (!expirations.length) return undefined;
		const timeout = window.setTimeout(loadPersonalVaults, Math.max(0, Math.min(...expirations) - Date.now()) + 250);
		return () => window.clearTimeout(timeout);
	}, [isOrgMode, personalVaults]);

	async function handleCreatePersonalVault(input) {
		const vault = await vaultService.createVault(input);
		setPersonalVaults((current) => [vault, ...current]);
		setPersonalStats((current) => (current ? { ...current, totalVaults: current.totalVaults + 1 } : current));
		setCreateOpen(false);
		setToast(`Personal vault "${vault.name}" created.`);
	}

	function handleCreateCompanyVault(e) {
		e.preventDefault();
		if (!corpName.trim() || !currentOrg) return;
		const created = organizationService.createCompanyVault(currentOrg.id, {
			name: corpName,
			description: corpDesc,
			multiSigRequired: corpMultiSig,
			passwordProtected: true,
		});
		setCompanyVaults(organizationService.getCompanyVaults(currentOrg.id));
		setCorpName('');
		setCorpDesc('');
		setCreateOpen(false);
		setToast(`Company vault "${created.name}" deployed with multi-sig protection.`);
	}

	function handleToggleCompanyLock(vaultRef) {
		if (!currentOrg) return;
		const updated = organizationService.toggleCompanyVaultLock(currentOrg.id, vaultRef);
		setCompanyVaults(organizationService.getCompanyVaults(currentOrg.id));
		setToast(`Vault ${vaultRef} is now ${updated?.isLocked ? '🔒 Locked' : '🔓 Unlocked'}.`);
	}

	// ==========================================
	// 1. ORGANIZATION / COMPANY VAULTS VIEW
	// ==========================================
	if (isOrgMode && currentOrg) {
		const totalCorpVaults = companyVaults.length;
		const totalCorpAssets = companyVaults.reduce((sum, v) => sum + (v.organizedAssets || v.totalAssets || 0), 0);
		const lockedCount = companyVaults.filter((v) => v.isLocked).length;

		return (
			<>
				<PageHeader
					eyebrow={`Enterprise Storage · ${currentOrg.name}`}
					title="Company Vaults"
					description="Corporate asset vaults isolated from personal storage. Protected by team multi-signature policies and role-based permissions."
					action={
						<Button icon={FolderPlus} onClick={() => setCreateOpen(true)}>
							Deploy Company Vault
						</Button>
					}
				/>

				{/* Corporate Isolation Banner */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '10px',
						background: 'rgba(234, 179, 8, 0.08)',
						border: '1px solid rgba(234, 179, 8, 0.3)',
						borderRadius: '12px',
						padding: '12px 16px',
						fontSize: '0.76rem',
						color: '#facc15',
					}}
				>
					<ShieldCheck size={18} style={{ color: '#facc15', flexShrink: 0 }} />
					<span>
						<strong>Corporate Storage Active:</strong> You are viewing vaults owned by <strong>{currentOrg.name}</strong>. Personal private vaults are strictly isolated and not accessible from this organization workspace.
					</span>
				</div>

				{/* Corporate KPI Cards */}
				<div className="vault-stats" style={{ marginTop: '16px' }}>
					<StatCard
						label="Company Vaults"
						value={totalCorpVaults}
						helper="Corporate collections"
						icon={FolderLock}
						tone="blue"
					/>
					<StatCard
						label="Corporate Assets Protected"
						value={totalCorpAssets}
						helper="Shared team assets"
						icon={Layers3}
						tone="violet"
					/>
					<StatCard
						label="Security Protocol"
						value="Multi-Sig"
						helper="3/4 Signers quorum active"
						icon={ShieldCheck}
						tone="amber"
					/>
				</div>

				{/* Company Vaults Grid */}
				{companyVaults.length === 0 ? (
					<EmptyState
						icon={FolderLock}
						title="No Company Vaults deployed"
						description={`Deploy the first corporate vault for ${currentOrg.name} to organize and protect shared team intellectual property.`}
						action={
							<Button icon={FolderPlus} onClick={() => setCreateOpen(true)}>
								Deploy First Company Vault
							</Button>
						}
					/>
				) : (
					<div className="vault-grid">
						{companyVaults.map((vault) => {
							const locked = vault.isLocked;
							return (
								<article className="vault-card" key={vault.reference}>
									<div className="vault-card__link">
										<div className="vault-card__heading">
											<span style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15' }}>
												<FolderLock size={18} />
											</span>
											<div>
												<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
													<h2>{vault.name}</h2>
												</div>
												<p>{vault.description}</p>
											</div>
										</div>

										<div className={`vault-card__previews ${locked ? 'is-empty' : ''}`}>
											{locked ? (
												<div className="vault-card__locked">
													<LockKeyhole size={25} />
													<strong>Locked (Multi-Sig)</strong>
													<span>Requires {vault.multiSigRequired || 'Signatures'}</span>
												</div>
											) : (
												<div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#38bdf8' }}>
													<CheckCircle2 size={26} />
													<span style={{ fontSize: '0.72rem', marginTop: '6px' }}>
														{vault.organizedAssets || 0} Corporate Assets Protected
													</span>
												</div>
											)}
										</div>

										<footer>
											<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
												<span>{vault.reference}</span>
												<span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
													({vault.multiSigRequired || 'Multi-Sig'})
												</span>
											</div>

											<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
												<StatusBadge tone={locked ? 'warning' : 'success'}>
													{locked ? <LockKeyhole size={10} /> : <LockOpen size={10} />}{' '}
													{locked ? 'Locked' : 'Unlocked'}
												</StatusBadge>
												<button
													type="button"
													className="text-button"
													style={{ fontSize: '0.68rem', color: '#38bdf8', cursor: 'pointer' }}
													onClick={() => handleToggleCompanyLock(vault.reference)}
												>
													{locked ? 'Unlock Multi-Sig' : 'Lock Vault'}
												</button>
											</div>
										</footer>
									</div>
								</article>
							);
						})}
					</div>
				)}

				{/* Corporate Deploy Vault Modal */}
				{createOpen && (
					<div className="org-modal-backdrop" role="dialog" aria-modal="true">
						<div className="org-modal-card">
							<header className="org-modal-header">
								<div>
									<h3>Deploy Corporate Vault</h3>
									<p>Create a shared team vault for {currentOrg.name}.</p>
								</div>
								<button type="button" className="org-modal-close" onClick={() => setCreateOpen(false)}>
									✕
								</button>
							</header>

							<form onSubmit={handleCreateCompanyVault} className="org-form">
								<div className="field">
									<label>Vault Name</label>
									<input
										type="text"
										className="input"
										placeholder="e.g. Production Firmware & Keys Vault"
										value={corpName}
										onChange={(e) => setCorpName(e.target.value)}
										required
									/>
								</div>

								<div className="field">
									<label>Corporate Description</label>
									<textarea
										className="textarea"
										placeholder="Purpose of this company vault and asset scope..."
										value={corpDesc}
										onChange={(e) => setCorpDesc(e.target.value)}
									/>
								</div>

								<div className="field">
									<label>Multi-Signature Quorum</label>
									<select
										className="input"
										value={corpMultiSig}
										onChange={(e) => setCorpMultiSig(e.target.value)}
									>
										<option value="2 of 4 Signatures">2 of 4 Signatures (Standard Team)</option>
										<option value="3 of 4 Signatures">3 of 4 Signatures (High Security)</option>
										<option value="Owner Only">Executive Owner Only</option>
									</select>
								</div>

								<footer className="org-modal-footer">
									<Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
										Cancel
									</Button>
									<Button type="submit">Deploy Vault</Button>
								</footer>
							</form>
						</div>
					</div>
				)}

				{toast && <Toast message={toast} onClose={() => setToast('')} />}
			</>
		);
	}

	// ==========================================
	// 2. PERSONAL WORKSPACE VAULTS VIEW
	// ==========================================
	const protectedVaults = personalVaults.filter((vault) => vault.passwordProtected).length;
	const securityScore = personalVaults.length
		? Math.round(70 + (protectedVaults / personalVaults.length) * 25)
		: 70;

	const statCards = [
		{ label: 'Total Vaults', value: personalStats?.totalVaults ?? 0, helper: 'Private collections', icon: FolderLock, tone: 'blue' },
		{ label: 'Assets organized', value: personalStats?.organizedAssets ?? 0, helper: 'Unique registered assets', icon: Layers3, tone: 'violet' },
		{ label: 'Unorganized assets', value: personalStats?.unorganizedAssets ?? 0, helper: 'Available to organize', icon: Images, tone: 'amber' },
	];

	return (
		<>
			<PageHeader
				eyebrow="Private collections"
				title="Personal Vaults"
				description="Organize your personal registered assets behind password controls and time-limited unlock sessions."
				action={
					<Button icon={FolderPlus} onClick={() => setCreateOpen(true)}>
						Create Vault
					</Button>
				}
			/>

			{error ? <div className="error-banner">{error}</div> : null}

			{personalLoading ? (
				<LoadingState label="Loading your personal Vaults" />
			) : (
				<>
					{personalVaults.length ? (
						<>
							<div className="vault-security-hero">
								<div>
									<span>
										<ShieldCheck size={21} />
									</span>
									<div>
										<small>Personal workspace security</small>
										<h2>{securityScore}% protected</h2>
										<p>Password controls and authenticated asset access are active for your personal files.</p>
									</div>
								</div>
								<div className="vault-security-meter">
									<span>
										<i style={{ width: `${securityScore}%` }} />
									</span>
									<small>
										{protectedVaults} of {personalVaults.length} vaults password protected
									</small>
								</div>
								<div className="vault-security-fact">
									<KeyRound size={17} />
									<span>
										<strong>Auto-lock ready</strong>
										<small>Unlocked sessions expire automatically</small>
									</span>
								</div>
							</div>

							<div className="vault-stats">
								{statCards.map((stat) => (
									<StatCard key={stat.label} {...stat} />
								))}
							</div>

							<div className="vault-grid">
								{personalVaults.map((vault) => (
									<VaultCard key={vault.reference} vault={vault} />
								))}
							</div>
						</>
					) : (
						<EmptyState
							icon={FolderLock}
							title="No Personal Vaults yet"
							description="Create private collections to organize your personal registered assets without making additional file copies."
							action={
								<Button icon={FolderPlus} onClick={() => setCreateOpen(true)}>
									Create your first Vault
								</Button>
							}
						/>
					)}
				</>
			)}

			<VaultFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreatePersonalVault} />
			{toast && <Toast message={toast} onClose={() => setToast('')} />}
		</>
	);
}
