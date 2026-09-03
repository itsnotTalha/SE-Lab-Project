export const defaultAdminRange = { range: '30d' };

export function formatInteger(value) { return Number(value || 0).toLocaleString(); }
export function formatMoney(value) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value || 0)); }
export function formatPercent(value) { return `${Number(value || 0).toFixed(1)}%`; }
export function formatChange(value) { const amount = Number(value || 0); return `${amount >= 0 ? '+' : ''}${amount.toFixed(1)}%`; }
export function formatDate(value) { return value ? new Date(value.endsWith?.('Z') ? value : `${value}Z`).toLocaleString() : '—'; }
export function mapTransaction(row) { return { id: row.transaction_id, asset: row.asset, seller: row.seller, buyer: row.buyer, amount: Number(row.sale_amount || 0), fee: Number(row.platform_fee || 0), date: formatDate(row.created_at), status: row.status ? row.status[0].toUpperCase() + row.status.slice(1) : 'Unknown' }; }
export function mapUser(row) { return { id: String(row.id), name: row.full_name, email: row.email, role: row.role, assets: Number(row.assets || 0), transactions: Number(row.transactions || 0), revenue: Number(row.revenue_generated || 0), status: row.status === 'active' ? 'Active' : row.status === 'review' ? 'Review' : 'Suspended', initials: String(row.full_name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('') }; }
