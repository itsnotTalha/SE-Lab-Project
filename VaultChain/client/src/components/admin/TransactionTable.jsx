import { ChevronLeft, ChevronRight, Download, MoreHorizontal } from 'lucide-react';

const tone = { Completed: 'success', Pending: 'warning', Refunded: 'danger', Failed: 'danger' };

export default function TransactionTable({ rows, compact = false }) {
	return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Transaction ID</th><th>Asset</th><th>Seller</th><th>Buyer</th><th>Amount</th><th>Commission</th><th>Date</th><th>Status</th><th/></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><code>{row.id}</code></td><td><strong>{row.asset}</strong></td><td>{row.seller}</td><td>{row.buyer}</td><td className="admin-table__money">${row.amount.toLocaleString()}</td><td className="admin-table__fee">${row.fee.toLocaleString()}</td><td>{row.date}</td><td><span className={`admin-status is-${tone[row.status]}`}>{row.status}</span></td><td><button type="button" className="admin-table__more"><MoreHorizontal size={16}/></button></td></tr>)}</tbody></table>{!compact ? <footer className="admin-table-footer"><span>Showing 1–{rows.length} of 8,920 transactions</span><div><button type="button"><Download size={14}/> Export</button><button type="button" aria-label="Previous"><ChevronLeft size={15}/></button><button type="button" className="is-current">1</button><button type="button">2</button><button type="button">3</button><button type="button" aria-label="Next"><ChevronRight size={15}/></button></div></footer> : null}</div>;
}

