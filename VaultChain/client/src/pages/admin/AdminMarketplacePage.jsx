import { CircleDollarSign, Search, ShoppingBag, Store, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';

import { listings } from '../../admin/adminData';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AnalyticsCard from '../../components/admin/AnalyticsCard';
import StatCard from '../../components/admin/StatCard';

export default function AdminMarketplacePage() {
	const [query, setQuery] = useState(''); const [filter, setFilter] = useState('All');
	const rows = useMemo(() => listings.filter((row) => (filter === 'All' || row.status === filter) && `${row.asset} ${row.owner}`.toLowerCase().includes(query.toLowerCase())), [query, filter]);
	return <><AdminPageHeader eyebrow="Commerce" title="Marketplace management" description="Monitor listings, sales, pricing, and commission performance." exportName="vaultchain-marketplace"/><div className="admin-stats-grid"><StatCard label="Total listings" value="45,200" change="8.6%" detail="12,840 currently active" icon={Store}/><StatCard label="Sold assets" value="18,450" change="14.2%" detail="40.8% sell-through rate" icon={ShoppingBag} tone="green"/><StatCard label="Average selling price" value="$340" change="3.8%" detail="Across all categories" icon={Tag} tone="blue"/><StatCard label="Commission earned" value="$85,400" change="17.1%" detail="From completed sales" icon={CircleDollarSign} tone="amber"/></div><AnalyticsCard title="Active listings" description="Review and manage assets offered on the VaultChain marketplace" action={<div className="admin-table-tools"><label><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search listings"/></label><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All</option><option>Active</option><option>Sold</option><option>Review</option></select></div>}><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Asset</th><th>Owner</th><th>Price</th><th>Listed</th><th>Platform fee</th><th>Status</th><th/></tr></thead><tbody>{rows.map((row, index) => <tr key={row.asset}><td><div className="admin-listing-cell"><span>{String(index + 1).padStart(2, '0')}</span><strong>{row.asset}</strong></div></td><td>{row.owner}</td><td className="admin-table__money">${row.price.toLocaleString()}</td><td>{row.listed}</td><td className="admin-table__fee">${(row.price * .05).toFixed(2)}</td><td><span className={`admin-status is-${row.status === 'Active' ? 'success' : row.status === 'Sold' ? 'info' : 'warning'}`}>{row.status}</span></td><td><button className="admin-button is-quiet" type="button">Review</button></td></tr>)}</tbody></table></div></AnalyticsCard></>;
}

