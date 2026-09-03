import { MoreHorizontal } from 'lucide-react';
import { formatMoney } from '../../admin/adminUtils';

const tone = { Completed: 'success', Pending: 'warning', Refunded: 'danger', Failed: 'danger' };

export default function TransactionTable({ rows, compact = false }) {
	return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Transaction ID</th><th>Asset</th><th>Seller</th><th>Buyer</th><th>Amount</th><th>Commission</th><th>Date</th><th>Status</th><th/></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><code>{row.id}</code></td><td><strong>{row.asset}</strong></td><td>{row.seller}</td><td>{row.buyer}</td><td className="admin-table__money">{formatMoney(row.amount)}</td><td className="admin-table__fee">{formatMoney(row.fee)}</td><td>{row.date}</td><td><span className={`admin-status is-${tone[row.status] || 'neutral'}`}>{row.status}</span></td><td><button type="button" className="admin-table__more"><MoreHorizontal size={16}/></button></td></tr>)}</tbody></table>{!compact ? <footer className="admin-table-footer"><span>Showing {rows.length} transaction{rows.length === 1 ? '' : 's'} for the selected period</span></footer> : null}</div>;
}
