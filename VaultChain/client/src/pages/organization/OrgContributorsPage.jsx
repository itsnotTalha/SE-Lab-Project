import {
	AtSign, Check, CheckCircle2, KeyRound, Mail,
	Plus, Search, ShieldCheck, Sparkles, Trash2,
	UserCheck, UserPlus, Users, X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import Toast from '../../components/ui/Toast';
import { organizationService } from '../../services/organizationService';
import '../../styles/organizations.css';

export default function OrgContributorsPage() {
	const [activeWs, setActiveWs] = useState(() => organizationService.getActiveWorkspace());
	const [org, setOrg] = useState(() => organizationService.getOrganization(activeWs?.id || 'org-1'));
	const [inviteOpen, setInviteOpen] = useState(false);
	const [toast, setToast] = useState('');

	// Modal Tabs: 'username' | 'manual'
	const [modalTab, setModalTab] = useState('username');

	// Username search states
	const [usernameQuery, setUsernameQuery] = useState('');
	const [selectedUser, setSelectedUser] = useState(null);

	// Manual form states
	const [manualName, setManualName] = useState('');
	const [manualEmail, setManualEmail] = useState('');

	// Shared role and split
	const [role, setRole] = useState('Contributor');
	const [split, setSplit] = useState(20);

	// Table search
	const [tableSearch, setTableSearch] = useState('');

	function reload() {
		const current = organizationService.getOrganization(org?.id);
		if (current) setOrg(current);
	}

	useEffect(() => {
		function onOrgUpdate() {
			reload();
		}
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

	// Live username search results
	const searchResults = useMemo(() => {
		if (!org) return [];
		return organizationService.searchUsers(usernameQuery, org.id);
	}, [usernameQuery, org]);

	function handleOpenInvite() {
		setUsernameQuery('');
		setSelectedUser(null);
		setManualName('');
		setManualEmail('');
		setRole('Contributor');
		setSplit(20);
		setModalTab('username');
		setInviteOpen(true);
	}

	function handleSelectUser(user) {
		if (user.isAlreadyMember) return;
		setSelectedUser(user);
	}

	function handleAddByUsername(e) {
		e.preventDefault();
		if (!selectedUser || !org) return;

		organizationService.inviteMember(org.id, {
			name: selectedUser.name,
			username: selectedUser.username,
			email: selectedUser.email,
			role,
			split,
			avatarColor: selectedUser.avatarColor,
			specialty: selectedUser.specialty,
		});

		reload();
		setInviteOpen(false);
		setSelectedUser(null);
		setUsernameQuery('');
		setToast(`Added @${selectedUser.username} (${selectedUser.name}) to ${org.name} with ${split}% share.`);
	}

	function handleManualInvite(e) {
		e.preventDefault();
		if (!manualEmail.trim() || !org) return;

		organizationService.inviteMember(org.id, {
			name: manualName,
			email: manualEmail,
			role,
			split,
		});

		reload();
		setInviteOpen(false);
		setManualName('');
		setManualEmail('');
		setToast(`Added ${manualEmail} to ${org.name} with a ${split}% share.`);
	}

	function handleRemove(memberId, memberName) {
		if (window.confirm(`Are you sure you want to remove ${memberName} from ${org.name}?`)) {
			organizationService.removeMember(org.id, memberId);
			reload();
			setToast(`Removed ${memberName} from organization.`);
		}
	}

	const members = org?.members || [];
	const totalSplitSum = members.reduce((sum, m) => sum + (Number(m.split) || 0), 0);

	const filteredMembers = useMemo(() => {
		const q = tableSearch.trim().toLowerCase();
		if (!q) return members;
		return members.filter((m) => {
			const nameMatch = m.name?.toLowerCase().includes(q);
			const usernameMatch = m.username?.toLowerCase().includes(q);
			const emailMatch = m.email?.toLowerCase().includes(q);
			const roleMatch = m.role?.toLowerCase().includes(q);
			return nameMatch || usernameMatch || emailMatch || roleMatch;
		});
	}, [members, tableSearch]);

	return (
		<div className="org-industry-dashboard">
			{/* Page Header */}
			<PageHeader
				eyebrow={`Team & Governance · ${org?.name || 'Organization'}`}
				title="Team & splits"
				description="Find teammates by @username, manage the contributor roster, and allocate consensus royalty shares."
				action={
					<Button icon={UserPlus} onClick={handleOpenInvite}>
						Add / Invite Contributor
					</Button>
				}
			/>

			{/* Royalty Distribution Bar Card */}
			<section className="org-section-card">
				<div className="org-section-header">
					<div>
						<h3>Live Contributor Split Allocation</h3>
						<p>Current distribution of sales revenue across verified contributors and corporate treasury.</p>
					</div>
					<span style={{ fontSize: '0.74rem', color: '#facc15', fontWeight: 700 }}>
						Company Split Rule: {org?.splitPercent || 80}% Team / {100 - (org?.splitPercent || 80)}% Treasury
					</span>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					<div className="split-visualizer" style={{ height: '42px', borderRadius: '10px' }}>
						{members.map((m, idx) => {
							const colors = ['#38bdf8', '#10b981', '#a855f7', '#ec4899', '#f97316', '#eab308'];
							const col = colors[idx % colors.length];
							return (
								<div
									key={m.id}
									className="split-chunk"
									style={{
										flex: m.split || 15,
										background: `color-mix(in srgb, ${col} 22%, transparent)`,
										borderRight: '1px solid rgba(255,255,255,0.1)',
										color: col,
									}}
								>
									<strong>{m.split || 0}%</strong>
									<span>{m.username ? `@${m.username}` : m.name.split(' ')[0]}</span>
								</div>
							);
						})}
					</div>

					<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-muted)' }}>
						<span>Allocated Team Quorum: {totalSplitSum}%</span>
						<span>Status: Verified Multi-Sig Active ({members.length} Signers)</span>
					</div>
				</div>
			</section>

			{/* Members Table */}
			<section className="org-section-card">
				<div className="org-section-header">
					<div>
						<h3>Verified User Roster ({members.length})</h3>
						<p>Active signers and authorized contributors under {org?.name}.</p>
					</div>
					<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
						<div style={{ position: 'relative', width: '240px' }}>
							<Search
								size={14}
								style={{
									position: 'absolute',
									left: '10px',
									top: '50%',
									transform: 'translateY(-50%)',
									color: 'var(--text-muted)',
								}}
							/>
							<input
								type="text"
								className="input"
								placeholder="Filter team roster..."
								value={tableSearch}
								onChange={(e) => setTableSearch(e.target.value)}
								style={{ paddingLeft: '30px', height: '34px', fontSize: '0.8rem' }}
							/>
						</div>
						<Button variant="outline" size="sm" icon={UserPlus} onClick={handleOpenInvite}>
							Find by @username
						</Button>
					</div>
				</div>

				<div className="org-table-container">
					<table className="org-data-table">
						<thead>
							<tr>
								<th>User / Handle</th>
								<th>Corporate Role</th>
								<th>Royalty Share</th>
								<th>Security & Protocol</th>
								<th>Joined Date</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{filteredMembers.length === 0 ? (
								<tr>
									<td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
										No matching team members found.
									</td>
								</tr>
							) : (
								filteredMembers.map((m) => (
									<tr key={m.id}>
										<td>
											<div className="table-member-profile">
												<div
													className="member-avatar"
													style={{
														background: m.avatarColor || 'linear-gradient(135deg, #6366f1, #8b5cf6)',
														color: '#ffffff',
													}}
												>
													{m.name.charAt(0)}
												</div>
												<div>
													<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
														<strong>{m.name}</strong>
														{m.username && (
															<span className="member-username-tag">
																@{m.username}
															</span>
														)}
													</div>
													<small>{m.email}</small>
												</div>
											</div>
										</td>
										<td>
											<span className={`role-badge role-${(m.role || 'contributor').toLowerCase().replace(/\s+/g, '-')}`}>
												{m.role}
											</span>
										</td>
										<td>
											<div className="split-progress-wrap">
												<strong>{m.split || 0}%</strong>
												<div className="split-bar-bg">
													<div
														className="split-bar-fill"
														style={{ width: `${m.split || 0}%`, background: 'var(--primary)' }}
													/>
												</div>
											</div>
										</td>
										<td>
											<span className="security-tag verified">
												<ShieldCheck size={12} /> 2FA Multi-Sig Active
											</span>
										</td>
										<td>
											<span className="table-date">{m.joinedDate || '2026'}</span>
										</td>
										<td>
											{m.role !== 'Owner' ? (
												<button
													type="button"
													className="table-delete-btn"
													onClick={() => handleRemove(m.id, m.name)}
													title="Remove contributor from organization"
												>
													<Trash2 size={14} />
												</button>
											) : (
												<span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
													Primary Owner
												</span>
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</section>

			{/* ================= MODAL: ADD / FIND CONTRIBUTOR ================= */}
			{inviteOpen && (
				<div className="org-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setInviteOpen(false)}>
					<div className="org-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
						<header className="org-modal-header">
							<div>
								<h3>Add Contributor to {org?.name}</h3>
								<p>Find registered people on VaultChain by username or invite external collaborators.</p>
							</div>
							<button type="button" className="org-modal-close" onClick={() => setInviteOpen(false)}>
								✕
							</button>
						</header>

						{/* Modal Tabs */}
						<div className="org-modal-tabs">
							<button
								type="button"
								className={`org-modal-tab-btn ${modalTab === 'username' ? 'is-active' : ''}`}
								onClick={() => setModalTab('username')}
							>
								<AtSign size={14} /> Find by Username
							</button>
							<button
								type="button"
								className={`org-modal-tab-btn ${modalTab === 'manual' ? 'is-active' : ''}`}
								onClick={() => setModalTab('manual')}
							>
								<Mail size={14} /> Manual Email Invite
							</button>
						</div>

						{/* TAB 1: FIND BY USERNAME */}
						{modalTab === 'username' && (
							<div>
								{!selectedUser ? (
									<>
										<label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
											Search Platform Users
										</label>
										<div className="org-search-input-wrap">
											<span className="org-search-prefix">@</span>
											<input
												type="text"
												autoFocus
												className="org-search-input"
												placeholder="Type username, name, or expertise (e.g. elena, marcus, vance)..."
												value={usernameQuery}
												onChange={(e) => setUsernameQuery(e.target.value)}
											/>
										</div>

										<span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
											{usernameQuery ? `Matching people for "@${usernameQuery}":` : 'Suggested Platform Cryptographers & Engineers:'}
										</span>

										<div className="org-user-results-list">
											{searchResults.length === 0 ? (
												<div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
													No users found matching "@{usernameQuery}". Try another handle or switch to manual invite.
												</div>
											) : (
												searchResults.map((user) => (
													<div
														key={user.id}
														className={`org-user-result-card ${user.isAlreadyMember ? 'is-disabled' : ''}`}
														onClick={() => handleSelectUser(user)}
														style={{ cursor: user.isAlreadyMember ? 'default' : 'pointer' }}
													>
														<div className="org-user-info-flex">
															<div
																className="org-user-avatar"
																style={{ background: user.avatarColor || 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
															>
																{user.name.charAt(0)}
															</div>
															<div className="org-user-meta">
																<div className="org-user-meta-name">
																	<span>{user.name}</span>
																	<span className="org-user-meta-handle">@{user.username}</span>
																	{user.verified && <CheckCircle2 size={13} color="#10b981" />}
																</div>
																<div className="org-user-meta-sub">
																	{user.role} • {user.specialty}
																</div>
															</div>
														</div>

														<div>
															{user.isAlreadyMember ? (
																<span
																	style={{
																		fontSize: '0.7rem',
																		fontWeight: 600,
																		color: 'var(--text-muted)',
																		background: 'rgba(255,255,255,0.06)',
																		padding: '3px 8px',
																		borderRadius: '6px',
																	}}
																>
																	Already in Team
																</span>
															) : (
																<Button
																	size="sm"
																	variant="secondary"
																	onClick={(e) => {
																		e.stopPropagation();
																		handleSelectUser(user);
																	}}
																>
																	Select
																</Button>
															)}
														</div>
													</div>
												))
											)}
										</div>
									</>
								) : (
									/* SELECTED USER FORM */
									<form onSubmit={handleAddByUsername} className="org-form">
										<div className="org-selected-person-box">
											<div className="org-selected-person-info">
												<div
													className="org-user-avatar"
													style={{
														width: '44px',
														height: '44px',
														fontSize: '1.1rem',
														background: selectedUser.avatarColor || 'linear-gradient(135deg, #6366f1, #8b5cf6)',
													}}
												>
													{selectedUser.name.charAt(0)}
												</div>
												<div>
													<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
														<strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>{selectedUser.name}</strong>
														<span className="member-username-tag">@{selectedUser.username}</span>
													</div>
													<div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
														{selectedUser.email} • {selectedUser.specialty}
													</div>
												</div>
											</div>
											<button
												type="button"
												className="org-change-person-btn"
												onClick={() => setSelectedUser(null)}
											>
												✕ Change
											</button>
										</div>

										<div className="field">
											<label>Corporate Role</label>
											<select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
												<option value="Contributor">Contributor (Upload & Mint Assets)</option>
												<option value="Lead Cryptographer">Lead Cryptographer</option>
												<option value="Security Auditor">Security Auditor (Read & Inspect Only)</option>
												<option value="Admin">Admin (Full Management & Treasury Rights)</option>
												<option value="Creative Director">Creative Director</option>
												<option value="IP Custodian">IP Custodian</option>
											</select>
										</div>

										<div className="field">
											<label>Assigned Royalty Share %</label>
											<input
												type="number"
												className="input"
												min="1"
												max="100"
												value={split}
												onChange={(e) => setSplit(Number(e.target.value))}
												required
											/>
											<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
												Current team allocation: {totalSplitSum}% · Recommended share: 15%–25%
											</span>
										</div>

										<footer className="org-modal-footer">
											<Button variant="secondary" type="button" onClick={() => setSelectedUser(null)}>
												Back to Search
											</Button>
											<Button type="submit" icon={Plus}>
												Add @{selectedUser.username} to Team
											</Button>
										</footer>
									</form>
								)}
							</div>
						)}

						{/* TAB 2: MANUAL INVITE BY EMAIL */}
						{modalTab === 'manual' && (
							<form onSubmit={handleManualInvite} className="org-form">
								<div className="field">
									<label>Full Name</label>
									<input
										type="text"
										className="input"
										placeholder="e.g. Alexander Vance"
										value={manualName}
										onChange={(e) => setManualName(e.target.value)}
										required
									/>
								</div>

								<div className="field">
									<label>Email Address</label>
									<input
										type="email"
										className="input"
										placeholder="colleague@domain.com"
										value={manualEmail}
										onChange={(e) => setManualEmail(e.target.value)}
										required
									/>
								</div>

								<div className="field">
									<label>Corporate Role</label>
									<select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
										<option value="Contributor">Contributor (Upload & Mint Assets)</option>
										<option value="Lead Cryptographer">Lead Cryptographer</option>
										<option value="Security Auditor">Security Auditor (Read & Inspect Only)</option>
										<option value="Admin">Admin (Full Management & Treasury Rights)</option>
									</select>
								</div>

								<div className="field">
									<label>Assigned Royalty Share %</label>
									<input
										type="number"
										className="input"
										min="1"
										max="100"
										value={split}
										onChange={(e) => setSplit(Number(e.target.value))}
										required
									/>
								</div>

								<footer className="org-modal-footer">
									<Button variant="secondary" type="button" onClick={() => setInviteOpen(false)}>
										Cancel
									</Button>
									<Button type="submit">Send Cryptographic Invite</Button>
								</footer>
							</form>
						)}
					</div>
				</div>
			)}

			{toast && <Toast message={toast} onClose={() => setToast('')} />}
		</div>
	);
}
