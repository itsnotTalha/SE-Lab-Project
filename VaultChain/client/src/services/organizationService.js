const STORAGE_KEY = 'vaultchain_organizations';
const ACTIVE_WORKSPACE_KEY = 'vaultchain_active_workspace';
let accountId = 'signed-out';
const storageKey = (key) => `${key}:${accountId}`;
export const PERSONAL_WORKSPACE = Object.freeze({ id: 'personal', name: 'Personal workspace', type: 'personal' });
export const organizationPath = (id, section = 'overview') => `/organizations/${encodeURIComponent(id)}/${section}`;
function saveOrganizations(organizations) {
 localStorage.setItem(storageKey(STORAGE_KEY), JSON.stringify(organizations));
 window.dispatchEvent(new CustomEvent('vaultchain:organizations_changed'));
}



export const PLATFORM_USERS = [
	{
		id: 'u-1',
		name: 'Talha Jubayer',
		username: 'talha',
		email: 'talhajubayer737@gmail.com',
		role: 'Founder & Protocol Architect',
		avatarColor: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
		specialty: 'Distributed Vaults & Consensus',
		verified: true,
	},
	{
		id: 'u-2',
		name: 'Dr. Elena Rostova',
		username: 'elena_crypto',
		email: 'elena@cybershield.io',
		role: 'Lead Cryptographer',
		avatarColor: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
		specialty: 'Post-Quantum Lattice Proofs',
		verified: true,
	},
	{
		id: 'u-3',
		name: 'Marcus Chen',
		username: 'marcus_audit',
		email: 'chen@apexaudit.org',
		role: 'Security Auditor',
		avatarColor: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
		specialty: 'Smart Contract Formal Verification',
		verified: true,
	},
	{
		id: 'u-4',
		name: 'Sarah Jenkins',
		username: 'sarah_j',
		email: 'sarah@designblock.co',
		role: 'Creative Director',
		avatarColor: 'linear-gradient(135deg, #ec4899, #f43f5e)',
		specialty: 'Volumetric Proofs & UI Systems',
		verified: true,
	},
	{
		id: 'u-5',
		name: 'Oliver Vance',
		username: 'vance_3d',
		email: 'vance@apexstudios.art',
		role: 'Lead 3D Artist',
		avatarColor: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
		specialty: 'Holographic Meshes & Textures',
		verified: true,
	},
	{
		id: 'u-6',
		name: 'Alexander Vance',
		username: 'alex_vance',
		email: 'alex@vance.io',
		role: 'Smart Contract Engineer',
		avatarColor: 'linear-gradient(135deg, #10b981, #06b6d4)',
		specialty: 'Multi-Sig Safe Architectures',
		verified: true,
	},
	{
		id: 'u-7',
		name: 'Sophia Thorne',
		username: 'sophia_zk',
		email: 'sophia@starlightnodes.io',
		role: 'Zero-Knowledge Specialist',
		avatarColor: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
		specialty: 'zk-SNARK Circuit Synthesis',
		verified: true,
	},
	{
		id: 'u-8',
		name: 'David Miller',
		username: 'dmiller_sec',
		email: 'david@nexussec.org',
		role: 'Threat Intelligence Analyst',
		avatarColor: 'linear-gradient(135deg, #ef4444, #f97316)',
		specialty: 'Zero-Day Vulnerability Research',
		verified: true,
	},
	{
		id: 'u-9',
		name: 'Satoshi Nakamoto',
		username: 'satoshin',
		email: 'satoshi@gmx.com',
		role: 'Genesis Contributor',
		avatarColor: 'linear-gradient(135deg, #f59e0b, #eab308)',
		specialty: 'Proof of Work & P2P Ledger',
		verified: true,
	},
	{
		id: 'u-10',
		name: 'Alice Chen',
		username: 'alice_zk',
		email: 'alice@chainresearch.net',
		role: 'Consensus Researcher',
		avatarColor: 'linear-gradient(135deg, #14b8a6, #10b981)',
		specialty: 'Byzantine Fault Tolerance',
		verified: true,
	},
	{
		id: 'u-11',
		name: 'Victor Hughes',
		username: 'victor_audit',
		email: 'victor@hughessecurity.com',
		role: 'Penetration Tester',
		avatarColor: 'linear-gradient(135deg, #64748b, #475569)',
		specialty: 'Cryptographic Red Teaming',
		verified: true,
	},
];

const DEFAULT_ORGS = [
	{
		id: 'org-1',
		name: 'CyberShield Security Labs',
		slug: 'cybershield',
		verified: true,
		entityId: 'VC-ENT-00824',
		jurisdiction: 'Delaware / Cryptographic Registry',
		multiSigPolicy: {
			requiredSignatures: 3,
			totalSigners: 4,
			timelockHours: 24,
			vaultContract: '0x71C...B824',
			quorumPercent: 75,
		},
		treasuryTransactions: [
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
			{
				id: 'tt-103',
				type: 'Inflow',
				category: 'Seed Allocation',
				amount: 32410,
				recipient: 'Shared Treasury',
				date: '2026-02-14 10:00',
				note: 'Initial cryptographic enterprise treasury capital deposit',
				status: 'Executed',
				txHash: '0x991cae7801dfb003291847cbb0293817456bc910',
			},
		],
		treasuryBalance: 38450,
		totalSales: 142800,
		splitPercent: 80,
		logoColor: 'linear-gradient(135deg, #0284c7, #38bdf8)',
		members: [
			{ id: 'm-1', name: 'Talha (You)', username: 'talha', email: 'talha@vaultchain.io', role: 'Owner', split: 40, status: 'Active', joinedDate: 'Jan 2026', avatarColor: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
			{ id: 'm-2', name: 'Dr. Elena Rostova', username: 'elena_crypto', email: 'elena@cybershield.io', role: 'Lead Cryptographer', split: 30, status: 'Active', joinedDate: 'Feb 2026', avatarColor: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
			{ id: 'm-3', name: 'Marcus Chen', username: 'marcus_audit', email: 'chen@apexaudit.org', role: 'Security Auditor', split: 10, status: 'Active', joinedDate: 'Feb 2026', avatarColor: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
			{ id: 'm-4', name: 'Sarah Jenkins', username: 'sarah_j', email: 'sarah@designblock.co', role: 'Creative Director', split: 20, status: 'Active', joinedDate: 'Mar 2026', avatarColor: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
		],
		companyVaults: [
			{
				reference: 'VC-CV001',
				name: 'Multi-Sig Firmware & Smart Contracts Vault',
				description: 'Enterprise multi-signature protected storage for production cryptographic keys and release binaries.',
				isLocked: false,
				passwordProtected: true,
				multiSigRequired: '3 of 4 Signatures',
				organizedAssets: 8,
				totalAssets: 8,
				createdAt: '2026-02-14',
				color: '#38bdf8',
			},
			{
				reference: 'VC-CV002',
				name: 'Confidential Client Deliverables & Proofs',
				description: 'Time-locked vault containing zero-knowledge proof datasets for enterprise auditing partners.',
				isLocked: true,
				passwordProtected: true,
				multiSigRequired: '2 of 4 Signatures',
				organizedAssets: 14,
				totalAssets: 14,
				createdAt: '2026-03-01',
				color: '#eab308',
			},
			{
				reference: 'VC-CV003',
				name: 'Genesis Master IP Archive',
				description: 'Immutable corporate cold storage repository for registered intellectual property assets.',
				isLocked: true,
				passwordProtected: true,
				multiSigRequired: 'Owner Only',
				organizedAssets: 5,
				totalAssets: 5,
				createdAt: '2026-03-10',
				color: '#a855f7',
			},
		],
		listings: [
			{
				id: 'list-101',
				reference: 'VC-L000101',
				title: 'Zero-Day Exploit Defense Architecture Diagram',
				category: 'Security Architecture',
				price: 4500,
				creator: 'Dr. Elena Rostova',
				status: 'Active',
				views: 1240,
				listedAt: '2026-03-12',
			},
			{
				id: 'list-102',
				reference: 'VC-L000102',
				title: 'Quantum-Resistant Hash Fingerprint Model v4',
				category: 'Algorithm',
				price: 8200,
				creator: 'Talha (You)',
				status: 'Active',
				views: 3410,
				listedAt: '2026-03-18',
			},
			{
				id: 'list-103',
				reference: 'VC-L000103',
				title: 'Confidential Multi-Party Computation Core (C-MPC)',
				category: 'Smart Contract',
				price: 12500,
				creator: 'Marcus Chen',
				status: 'Active',
				views: 2890,
				listedAt: '2026-03-24',
			},
			{
				id: 'list-104',
				reference: 'VC-L000104',
				title: 'Post-Quantum Verification Genesis Card #001',
				category: 'Genesis Media',
				price: 15000,
				creator: 'Sarah Jenkins',
				status: 'Sold',
				views: 5120,
				listedAt: '2026-02-28',
			},
		],
		sales: [
			{
				id: 'tx-801',
				date: '2026-03-28 09:14',
				assetTitle: 'Post-Quantum Verification Genesis Card #001',
				buyer: 'Nexus Capital Syndicate',
				grossAmount: 15000,
				treasuryCut: 3000,
				creatorPayout: 12000,
				txHash: '0x9fa481e6a0d2fbc193b2a543881ef108d4b31a89',
			},
			{
				id: 'tx-802',
				date: '2026-03-21 16:42',
				assetTitle: 'Enterprise Threat Vector Classification matrix',
				buyer: 'Aegis Sentinel Inc.',
				grossAmount: 9500,
				treasuryCut: 1900,
				creatorPayout: 7600,
				txHash: '0x43bc9281a8bfe1902ddf827419bc749102c91823',
			},
			{
				id: 'tx-803',
				date: '2026-03-15 11:20',
				assetTitle: 'Zero-Knowledge Circuit Verification Package',
				buyer: 'Starlight Nodes Consortium',
				grossAmount: 18200,
				treasuryCut: 3640,
				creatorPayout: 14560,
				txHash: '0x71fa8820c8be019a3b984716bca9283719bde901',
			},
		],
	},
	{
		id: 'org-2',
		name: 'Apex Cryptographic Studios',
		slug: 'apex-studios',
		verified: true,
		entityId: 'VC-ENT-00912',
		jurisdiction: 'Zug / Swiss Crypto Valley',
		treasuryBalance: 19200,
		totalSales: 68400,
		splitPercent: 85,
		logoColor: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
		members: [
			{ id: 'm-21', name: 'Talha (You)', username: 'talha', email: 'talha@vaultchain.io', role: 'Owner', split: 50, status: 'Active', joinedDate: 'Feb 2026', avatarColor: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
			{ id: 'm-22', name: 'Oliver Vance', username: 'vance_3d', email: 'vance@apexstudios.art', role: 'Lead 3D Artist', split: 50, status: 'Active', joinedDate: 'Feb 2026', avatarColor: 'linear-gradient(135deg, #8b5cf6, #d946ef)' },
		],
		companyVaults: [
			{
				reference: 'VC-CV004',
				name: 'Apex Volumetric 3D Master Vault',
				description: 'High-resolution light-field meshes and proprietary textures under multi-contributor escrow.',
				isLocked: false,
				passwordProtected: true,
				multiSigRequired: '2 of 2 Signatures',
				organizedAssets: 6,
				totalAssets: 6,
				createdAt: '2026-03-05',
				color: '#ec4899',
			},
		],
		listings: [
			{
				id: 'list-201',
				reference: 'VC-L000201',
				title: 'Volumetric Holographic Light-Field Render #04',
				category: '3D Asset',
				price: 3800,
				creator: 'Oliver Vance',
				status: 'Active',
				views: 1850,
				listedAt: '2026-03-20',
			},
		],
		sales: [
			{
				id: 'tx-901',
				date: '2026-03-26 14:02',
				assetTitle: 'Holographic Proof Card 3D Mesh & Textures',
				buyer: 'MetaArchive Guild',
				grossAmount: 6400,
				treasuryCut: 960,
				creatorPayout: 5440,
				txHash: '0x22be88a109fe8293bca88172901cbe2891fa8192',
			},
		],
	},
];

export const organizationService = {
	getPlatformUsers() {
		try {
			const saved = localStorage.getItem('vaultchain_platform_users');
			if (saved) return JSON.parse(saved);
		} catch (e) {}
		return PLATFORM_USERS;
	},

	searchUsers(query = '', excludeOrgId = null) {
		const q = (query || '').trim().toLowerCase().replace(/^@/, '');
		const org = excludeOrgId ? this.getOrganization(excludeOrgId) : null;
		const existingEmails = new Set((org?.members || []).map((m) => m.email?.toLowerCase()));
		const existingUsernames = new Set((org?.members || []).map((m) => (m.username || m.email?.split('@')[0])?.toLowerCase()));

		const users = this.getPlatformUsers();
		const results = users.filter((u) => {
			if (!q) return true;
			return (
				u.username.toLowerCase().includes(q) ||
				u.name.toLowerCase().includes(q) ||
				u.email.toLowerCase().includes(q) ||
				(u.specialty && u.specialty.toLowerCase().includes(q))
			);
		});

		return results.map((u) => ({
			...u,
			isAlreadyMember: existingEmails.has(u.email.toLowerCase()) || existingUsernames.has(u.username.toLowerCase()),
		}));
	},

	getOrganizations() {
		try {
			const saved = localStorage.getItem(storageKey(STORAGE_KEY));
			const parsed = saved ? JSON.parse(saved) : DEFAULT_ORGS;
			return Array.isArray(parsed) ? parsed.filter((org) => org && typeof org.id === 'string' && typeof org.name === 'string') : DEFAULT_ORGS;
		} catch {
			return DEFAULT_ORGS;
		}
	},

	getOrganization(id) {
		const orgs = this.getOrganizations();
		return orgs.find((o) => o.id === id) || null;
	},

 setAccount(userId) {
  accountId = String(userId ?? 'signed-out');
 },

 getActiveWorkspace() {
  try {
   const saved = JSON.parse(sessionStorage.getItem(storageKey(ACTIVE_WORKSPACE_KEY)) || 'null');
   const org = saved?.type === 'organization' && this.getOrganization(saved.id);
   if (org) return { id: org.id, name: org.name, type: 'organization' };
  } catch {}
  return PERSONAL_WORKSPACE;
 },

 setActiveWorkspace(workspace) {
  const org = workspace?.type === 'organization' && this.getOrganization(workspace.id);
  const next = org ? { id: org.id, name: org.name, type: 'organization' } : PERSONAL_WORKSPACE;
  sessionStorage.setItem(storageKey(ACTIVE_WORKSPACE_KEY), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('vaultchain:workspace_changed', { detail: next }));
  return next;
 },

	getCompanyVaults(orgId) {
		const org = this.getOrganization(orgId);
		return org?.companyVaults || [];
	},

	createCompanyVault(orgId, { name, description, passwordProtected = true, multiSigRequired = '2 of 4 Signatures' }) {
		const orgs = this.getOrganizations();
		const refNum = Math.floor(100 + Math.random() * 900);
		const newVault = {
			reference: `VC-CV${refNum}`,
			name,
			description: description || 'Corporate asset vault with shared multi-contributor access control.',
			isLocked: false,
			passwordProtected: Boolean(passwordProtected),
			multiSigRequired,
			organizedAssets: 0,
			totalAssets: 0,
			createdAt: new Date().toISOString().split('T')[0],
			color: '#38bdf8',
		};

		const updated = orgs.map((org) => {
			if (org.id === orgId) {
				return {
					...org,
					companyVaults: [newVault, ...(org.companyVaults || [])],
				};
			}
			return org;
		});

		saveOrganizations(updated);
		window.dispatchEvent(new CustomEvent('vaultchain:company_vaults_changed', { detail: { orgId } }));
		return newVault;
	},

	toggleCompanyVaultLock(orgId, vaultRef) {
		const orgs = this.getOrganizations();
		let targetVault = null;
		const updated = orgs.map((org) => {
			if (org.id === orgId) {
				const vaults = (org.companyVaults || []).map((v) => {
					if (v.reference === vaultRef) {
						targetVault = { ...v, isLocked: !v.isLocked };
						return targetVault;
					}
					return v;
				});
				return { ...org, companyVaults: vaults };
			}
			return org;
		});
		saveOrganizations(updated);
		window.dispatchEvent(new CustomEvent('vaultchain:company_vaults_changed', { detail: { orgId } }));
		return targetVault;
	},

	createOrganization({ name, splitPercent = 80, jurisdiction = 'Delaware C-Corp' }) {
		if (!name?.trim() || name.trim().length > 80) throw new Error('Enter an organization name of 1–80 characters.');
		if (!Number.isFinite(Number(splitPercent)) || Number(splitPercent) < 0 || Number(splitPercent) > 100) throw new Error('Split must be between 0 and 100.');
		const orgs = this.getOrganizations();
		const randomNum = Math.floor(1000 + Math.random() * 9000);
		const newOrg = {
			id: `org-${crypto.randomUUID()}`,
			name: name.trim(),
			slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
			verified: false,
			entityId: `VC-ENT-${randomNum}`,
			jurisdiction,
			treasuryBalance: 0,
			totalSales: 0,
			splitPercent: Number(splitPercent),
			logoColor: 'linear-gradient(135deg, #10b981, #06b6d4)',
			members: [
				{ id: `m-${Date.now()}`, name: 'Organization Admin (You)', email: 'admin@workspace.local', role: 'Owner', split: 100, status: 'Active', joinedDate: 'Today' },
			],
			companyVaults: [
				{
					reference: `VC-CV${Math.floor(100 + Math.random() * 900)}`,
					name: `${name} Primary Corporate Vault`,
					description: 'Default team collection with multi-sig security.',
					isLocked: false,
					passwordProtected: true,
					multiSigRequired: 'Owner Only',
					organizedAssets: 0,
					totalAssets: 0,
					createdAt: new Date().toISOString().split('T')[0],
					color: '#10b981',
				},
			],
			listings: [],
			sales: [],
		};
		const updated = [newOrg, ...orgs];
		saveOrganizations(updated);
		return newOrg;
	},

	inviteMember(orgId, { name, username, email, role = 'Contributor', split = 20, avatarColor, specialty }) {
		const orgs = this.getOrganizations();
		const userHandle = (username || (email ? email.split('@')[0] : (name || 'member'))).toLowerCase().replace(/^@/, '').replace(/\s+/g, '_');
		const userEmail = email || `${userHandle}@vaultchain.io`;
		const userName = name || userHandle;
		const updated = orgs.map((org) => {
			if (org.id === orgId) {
				return {
					...org,
					members: [
						...org.members,
						{
							id: `m-${Date.now()}-${Math.floor(Math.random()*1000)}`,
							name: userName,
							username: userHandle,
							email: userEmail,
							role: role || 'Contributor',
							split: Number(split) || 0,
							status: 'Active',
							joinedDate: 'Today',
							avatarColor: avatarColor || 'linear-gradient(135deg, #8b5cf6, #38bdf8)',
							specialty: specialty || 'Verified Contributor',
						},
					],
				};
			}
			return org;
		});
		saveOrganizations(updated);
		window.dispatchEvent(new CustomEvent('vaultchain:org_updated', { detail: { orgId } }));
		return updated.find((o) => o.id === orgId);
	},

	removeMember(orgId, memberId) {
		const orgs = this.getOrganizations();
		const updated = orgs.map((org) => {
			if (org.id === orgId) {
				return {
					...org,
					members: org.members.filter((m) => m.id !== memberId),
				};
			}
			return org;
		});
		saveOrganizations(updated);
		return updated.find((o) => o.id === orgId);
	},

	updateSplit(orgId, newSplit) {
		const orgs = this.getOrganizations();
		const updated = orgs.map((org) => {
			if (org.id === orgId) {
				return { ...org, splitPercent: Number(newSplit) };
			}
			return org;
		});
		saveOrganizations(updated);
		return updated.find((o) => o.id === orgId);
	},

	depositTreasury(orgId, amount, note = 'Reserve Capital Infusion') {
		const orgs = this.getOrganizations();
		const updated = orgs.map((org) => {
			if (org.id === orgId) {
				const current = org.treasuryBalance || 0;
				const depositAmt = Number(amount);
				const newTx = {
					id: `tt-${Date.now()}`,
					type: 'Inflow',
					category: 'Capital Deposit',
					amount: depositAmt,
					recipient: 'Shared Treasury',
					date: new Date().toISOString().replace('T', ' ').slice(0, 16),
					note,
					status: 'Executed',
					txHash: '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''),
				};
				return {
					...org,
					treasuryBalance: current + depositAmt,
					treasuryTransactions: [newTx, ...(org.treasuryTransactions || [])],
				};
			}
			return org;
		});
		saveOrganizations(updated);
		window.dispatchEvent(new CustomEvent('vaultchain:org_updated', { detail: { orgId } }));
		return updated.find((o) => o.id === orgId);
	},

	withdrawTreasury(orgId, amount, recipient = 'Corporate Operations', note = 'Working Capital Disbursal') {
		const orgs = this.getOrganizations();
		const updated = orgs.map((org) => {
			if (org.id === orgId) {
				const current = org.treasuryBalance || 0;
				const toWithdraw = Math.min(current, Number(amount));
				const newTx = {
					id: `tt-${Date.now()}`,
					type: 'Outflow',
					category: 'Withdrawal / Transfer',
					amount: toWithdraw,
					recipient,
					date: new Date().toISOString().replace('T', ' ').slice(0, 16),
					note,
					status: 'Executed',
					txHash: '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''),
				};
				return {
					...org,
					treasuryBalance: current - toWithdraw,
					treasuryTransactions: [newTx, ...(org.treasuryTransactions || [])],
				};
			}
			return org;
		});
		saveOrganizations(updated);
		window.dispatchEvent(new CustomEvent('vaultchain:org_updated', { detail: { orgId } }));
		return updated.find((o) => o.id === orgId);
	},

	batchDisburseDividends(orgId, totalAmount) {
		const orgs = this.getOrganizations();
		const updated = orgs.map((org) => {
			if (org.id === orgId) {
				const current = org.treasuryBalance || 0;
				const disburseAmt = Math.min(current, Number(totalAmount));
				const members = org.members || [];
				const totalSplit = members.reduce((sum, m) => sum + (m.split || 0), 0) || 100;
				
				const newSales = members.map((m) => {
					const payoutVal = Math.round((disburseAmt * (m.split || 0)) / totalSplit);
					return {
						id: `tx-payout-${Date.now()}-${m.id}`,
						date: new Date().toISOString().replace('T', ' ').slice(0, 16),
						assetTitle: `Corporate Dividend Disbursal (${m.split}%)`,
						buyer: org.name,
						grossAmount: payoutVal,
						treasuryCut: 0,
						creatorPayout: payoutVal,
						contributorName: m.name,
						txHash: '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''),
					};
				});

				const newTx = {
					id: `tt-${Date.now()}`,
					type: 'Outflow',
					category: 'Dividend Distribution',
					amount: disburseAmt,
					recipient: `${members.length} Active Contributors`,
					date: new Date().toISOString().replace('T', ' ').slice(0, 16),
					note: `Automated Split Disbursal (${members.map(m => `${m.name.split(' ')[0]}: ${m.split}%`).join(', ')})`,
					status: 'Executed',
					txHash: '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''),
				};

				return {
					...org,
					treasuryBalance: current - disburseAmt,
					treasuryTransactions: [newTx, ...(org.treasuryTransactions || [])],
					sales: [...newSales, ...(org.sales || [])],
				};
			}
			return org;
		});
		saveOrganizations(updated);
		window.dispatchEvent(new CustomEvent('vaultchain:org_updated', { detail: { orgId } }));
		return updated.find((o) => o.id === orgId);
	},

	addListing(orgId, { title, category, price, creator }) {
		const orgs = this.getOrganizations();
		const refNum = Math.floor(100 + Math.random() * 900);
		const newListing = {
			id: `list-${Date.now()}`,
			reference: `VC-L000${refNum}`,
			title,
			category: category || 'Digital Asset',
			price: Number(price) || 1000,
			creator: creator || 'Organization Contributor',
			status: 'Active',
			views: 1,
			listedAt: new Date().toISOString().split('T')[0],
		};

		const updated = orgs.map((org) => {
			if (org.id === orgId) {
				return {
					...org,
					listings: [newListing, ...(org.listings || [])],
				};
			}
			return org;
		});

		saveOrganizations(updated);
		window.dispatchEvent(new CustomEvent('vaultchain:org_updated', { detail: { orgId } }));
		return newListing;
	},

	updateListingPrice(orgId, listingId, newPrice) {
		const orgs = this.getOrganizations();
		const updated = orgs.map((org) => {
			if (org.id === orgId) {
				return {
					...org,
					listings: (org.listings || []).map((l) => (l.id === listingId ? { ...l, price: Number(newPrice) } : l)),
				};
			}
			return org;
		});
		saveOrganizations(updated);
		window.dispatchEvent(new CustomEvent('vaultchain:org_updated', { detail: { orgId } }));
	},
};
