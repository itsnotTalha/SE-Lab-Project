import {
	ArrowRight, Building2, CheckCircle2, DollarSign, ExternalLink,
	Eye, Filter, Plus, Search, Store, Tag, TrendingUp
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import Toast from '../../components/ui/Toast';
import { organizationService } from '../../services/organizationService';
import '../../styles/organizations.css';

function getCategoryBadgeStyle(cat = '') {
	const c = String(cat).toLowerCase();
	if (c.includes('security')) return { background: 'rgba(14, 165, 233, 0.14)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: '6px', padding: '3px 8px', fontWeight: 600 };
	if (c.includes('contract')) return { background: 'rgba(16, 185, 129, 0.14)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '3px 8px', fontWeight: 600 };
	if (c.includes('genesis') || c.includes('media')) return { background: 'rgba(168, 85, 247, 0.14)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', padding: '3px 8px', fontWeight: 600 };
	if (c.includes('3d')) return { background: 'rgba(236, 72, 153, 0.14)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '6px', padding: '3px 8px', fontWeight: 600 };
	return { background: 'rgba(245, 158, 11, 0.14)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '3px 8px', fontWeight: 600 };
}

export default function OrgInventoryPage() {
	const navigate = useNavigate();
	const [activeWs, setActiveWs] = useState(() => organizationService.getActiveWorkspace());
	const [org, setOrg] = useState(() => organizationService.getOrganization(activeWs?.id || 'org-1'));
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'sold'
	const [listModalOpen, setListModalOpen] = useState(false);
	const [toast, setToast] = useState('');

	// Add listing form state
	const [itemTitle, setItemTitle] = useState('');
	const [itemCategory, setItemCategory] = useState('Security Architecture');
	const [itemPrice, setItemPrice] = useState('4500');
	const [itemCreator, setItemCreator] = useState(org?.members?.[0]?.name || 'Contributor');

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

	function handleAddListing(e) {
		e.preventDefault();
		if (!itemTitle.trim()) return;
		organizationService.addListing(org.id, {
			title: itemTitle,
			category: itemCategory,
			price: itemPrice,
			creator: itemCreator,
		});
		reload();
		setItemTitle('');
		setListModalOpen(false);
		setToast(`Listed "${itemTitle}" in this organization’s demo inventory.`);
	}

	const listings = org?.listings || [];

	const filteredListings = useMemo(() => {
		const q = search.trim().toLowerCase();
		return listings.filter((l) => {
			const matchesFilter = filter === 'all' || l.status.toLowerCase() === filter;
			const matchesQuery = !q || [l.title, l.reference, l.category, l.creator].some((val) =>
				String(val || '').toLowerCase().includes(q)
			);
			return matchesFilter && matchesQuery;
		});
	}, [listings, search, filter]);

	const totalCatalogValue = listings.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
	const totalViews = listings.reduce((sum, l) => sum + (Number(l.views) || 0), 0);
	const activeCount = listings.filter((l) => l.status === 'Active').length;

	return (
		<div className="org-industry-dashboard">
			{/* Page Header */}
			<PageHeader
				eyebrow={`Marketplace Catalog · ${org.name}`}
				title="Inventory"
				description="Manage this organization’s demo listings and review catalog activity."
				action={
					<Button icon={Plus} onClick={() => setListModalOpen(true)}>
						Add demo listing
					</Button>
				}
			/>

			{/* Catalog KPI Metrics Bar */}
			<div className="org-kpi-grid">
				<div className="org-kpi-card">
					<div className="kpi-header">
						<span className="kpi-label">Active Market Offers</span>
						<span className="kpi-icon-wrap" style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.12)' }}>
							<Store size={16} />
						</span>
					</div>
					<div className="kpi-value">{activeCount} <small>Live</small></div>
					<div className="kpi-meta">{listings.length} total products in catalog</div>
				</div>

				<div className="org-kpi-card">
					<div className="kpi-header">
						<span className="kpi-label">Total Catalog Value</span>
						<span className="kpi-icon-wrap" style={{ color: '#eab308', background: 'rgba(234,179,8,0.12)' }}>
							<DollarSign size={16} />
						</span>
					</div>
					<div className="kpi-value">{totalCatalogValue.toLocaleString()} <small>Credits</small></div>
					<div className="kpi-meta">Aggregate value of all active and sold listings</div>
				</div>

				<div className="org-kpi-card">
					<div className="kpi-header">
						<span className="kpi-label">Market Impressions / Views</span>
						<span className="kpi-icon-wrap" style={{ color: '#a855f7', background: 'rgba(168,85,247,0.12)' }}>
							<Eye size={16} />
						</span>
					</div>
					<div className="kpi-value">{totalViews.toLocaleString()} <small>Views</small></div>
					<div className="kpi-meta">High liquidity interest from verified collectors</div>
				</div>

				<div className="org-kpi-card">
					<div className="kpi-header">
						<span className="kpi-label">Revenue Split Rule</span>
						<span className="kpi-icon-wrap" style={{ color: '#10b981', background: 'rgba(16,185,129,0.12)' }}>
							<TrendingUp size={16} />
						</span>
					</div>
					<div className="kpi-value">{org.splitPercent}% <small>Contributor</small></div>
					<div className="kpi-meta">{100 - org.splitPercent}% auto-routed to Company Treasury</div>
				</div>
			</div>

			{/* Search & Filter Bar */}
			<div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
				<div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
					<Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
					<input
						type="text"
						className="input"
						style={{ paddingLeft: '34px', width: '100%' }}
						placeholder="Search organization assets by title, reference, or creator..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>

				<div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border)' }}>
					<button
						type="button"
						className={`filter-chip ${filter === 'all' ? 'is-active' : ''}`}
						onClick={() => setFilter('all')}
					>
						All ({listings.length})
					</button>
					<button
						type="button"
						className={`filter-chip ${filter === 'active' ? 'is-active' : ''}`}
						onClick={() => setFilter('active')}
					>
						Active ({activeCount})
					</button>
					<button
						type="button"
						className={`filter-chip ${filter === 'sold' ? 'is-active' : ''}`}
						onClick={() => setFilter('sold')}
					>
						Sold ({listings.length - activeCount})
					</button>
				</div>
			</div>

			{/* Inventory Table */}
			<section className="org-section-card">
				{filteredListings.length === 0 ? (
					<div className="org-empty-state">
						<Store size={36} />
						<h4>No matching marketplace listings</h4>
						<p>No corporate assets match your filter or search query.</p>
					</div>
				) : (
					<div className="org-table-container">
						<table className="org-data-table">
							<thead>
								<tr>
									<th>Asset Title & Reference</th>
									<th>Category</th>
									<th>Assigned Contributor</th>
									<th>Listing Price</th>
									<th>Buyer Views</th>
									<th>Listing Status</th>
									<th>Marketplace Action</th>
								</tr>
							</thead>
							<tbody>
								{filteredListings.map((item) => (
									<tr key={item.id}>
										<td>
											<div className="table-asset-info">
												<strong>{item.title}</strong>
												<code>{item.reference}</code>
											</div>
										</td>
										<td>
											<span style={getCategoryBadgeStyle(item.category)}>{item.category}</span>
										</td>
										<td>
											<span className="table-contributor">{item.creator}</span>
										</td>
										<td>
											<strong className="table-price" style={{ color: '#f59e0b', fontWeight: 800 }}>${item.price.toLocaleString()}</strong>
										</td>
										<td>
											<span className="table-views">{item.views?.toLocaleString()}</span>
										</td>
										<td>
											<StatusBadge tone={item.status === 'Active' ? 'success' : 'info'}>
												{item.status}
											</StatusBadge>
										</td>
										<td>
											<span className="table-tag">Demo listing</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{/* ================= MODAL: LIST CORPORATE ASSET ================= */}
			{listModalOpen && (
				<div className="org-modal-backdrop" role="dialog" aria-modal="true">
					<div className="org-modal-card">
						<header className="org-modal-header">
							<div>
								<h3>Publish Corporate Asset to Market</h3>
								<p>List an intellectual property asset under {org.name}.</p>
							</div>
							<button type="button" className="org-modal-close" onClick={() => setListModalOpen(false)}>✕</button>
						</header>

						<form onSubmit={handleAddListing} className="org-form">
							<div className="field">
								<label>Asset Title</label>
								<input
									type="text"
									className="input"
									placeholder="e.g. Zero-Knowledge Cryptographic Matrix v2"
									value={itemTitle}
									onChange={(e) => setItemTitle(e.target.value)}
									required
								/>
							</div>

							<div className="field">
								<label>Asset Category</label>
								<select
									className="input"
									value={itemCategory}
									onChange={(e) => setItemCategory(e.target.value)}
								>
									<option value="Security Architecture">Security Architecture</option>
									<option value="Algorithm">Algorithm & Formula</option>
									<option value="Smart Contract">Smart Contract Core</option>
									<option value="Genesis Media">Genesis Media / Artwork</option>
									<option value="3D Volumetric Mesh">3D Volumetric Mesh</option>
								</select>
							</div>

							<div className="field">
								<label>Listing Price (VaultChain Credits)</label>
								<input
									type="number"
									className="input"
									min="1"
									step="1"
									value={itemPrice}
									onChange={(e) => setItemPrice(e.target.value)}
									required
								/>
							</div>

							<div className="field">
								<label>Assigned Contributor</label>
								<select
									className="input"
									value={itemCreator}
									onChange={(e) => setItemCreator(e.target.value)}
								>
									{org.members?.map((m) => (
										<option key={m.id} value={m.name}>
											{m.name} ({m.role})
										</option>
									))}
								</select>
							</div>

							<footer className="org-modal-footer">
								<Button variant="secondary" type="button" onClick={() => setListModalOpen(false)}>
									Cancel
								</Button>
								<Button type="submit">Publish to Market</Button>
							</footer>
						</form>
					</div>
				</div>
			)}

			{toast && <Toast message={toast} onClose={() => setToast('')} />}
		</div>
	);
}
