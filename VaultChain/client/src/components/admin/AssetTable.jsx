import { FileImage, MoreHorizontal } from 'lucide-react';

const statusTone = { Verified: 'success', Review: 'warning', Suspicious: 'danger' };

export default function AssetTable({ rows }) {
	return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Asset</th><th>Owner</th><th>Category</th><th>Verification score</th><th>Marketplace</th><th>Status</th><th/></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><div className="admin-asset-cell"><span style={{ '--asset-color': row.color }}><FileImage size={17}/></span><div><strong>{row.title}</strong><small>{row.id}</small></div></div></td><td>{row.owner}</td><td>{row.category}</td><td><div className="admin-score"><strong>{row.score}%</strong><span><i style={{ width: `${row.score}%` }}/></span></div></td><td><span className="admin-role-pill">{row.market}</span></td><td><span className={`admin-status is-${statusTone[row.status]}`}>{row.status}</span></td><td><button type="button" className="admin-table__more"><MoreHorizontal size={16}/></button></td></tr>)}</tbody></table></div>;
}

