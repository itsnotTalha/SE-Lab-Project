const amount = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const monthOf = (value) => /^\d{4}-(0[1-9]|1[0-2])/.test(String(value)) ? String(value).slice(0, 7) : null;

export function organizationAnalytics(org, months = 6) {
 const sales = (org.sales || []).filter((sale) => !String(sale.id).startsWith('tx-payout-'));
 const transactions = org.treasuryTransactions || [];
 const dates = [...sales, ...transactions].map((row) => monthOf(row.date)).filter(Boolean).sort();
 const last = dates.at(-1) || new Date().toISOString().slice(0, 7);
 const [year, month] = last.split('-').map(Number);
 const timeline = Array.from({ length: months }, (_, index) => {
  const date = new Date(Date.UTC(year, month - months + index, 1));
  return { month: date.toISOString().slice(0, 7), revenue: 0, contributors: 0, retained: 0, inflow: 0, outflow: 0 };
 });
 const buckets = new Map(timeline.map((row) => [row.month, row]));
 for (const sale of sales) {
  const bucket = buckets.get(monthOf(sale.date));
  if (bucket) { bucket.revenue += amount(sale.grossAmount); bucket.contributors += amount(sale.creatorPayout); bucket.retained += amount(sale.treasuryCut); }
 }
 for (const tx of transactions) {
  const bucket = buckets.get(monthOf(tx.date));
  if (bucket && tx.type === 'Inflow') bucket.inflow += amount(tx.amount);
  if (bucket && tx.type === 'Outflow') bucket.outflow += amount(tx.amount);
 }
 const status = new Map();
 for (const listing of org.listings || []) status.set(listing.status || 'Unknown', (status.get(listing.status || 'Unknown') || 0) + 1);
 return {
  timeline, last, hasSales: sales.some((sale) => buckets.has(monthOf(sale.date))),
  hasTransactions: transactions.some((tx) => buckets.has(monthOf(tx.date))),
  gross: timeline.reduce((sum, row) => sum + row.revenue, 0),
  net: timeline.reduce((sum, row) => sum + row.inflow - row.outflow, 0),
  inventory: [...status].map(([name, value]) => ({ name, value })),
  members: (org.members || []).map((member) => ({ name: member.name, share: amount(member.split) })),
  vaults: (org.companyVaults || []).map((vault) => ({ name: vault.name, assets: amount(vault.totalAssets), state: vault.isLocked ? 'Locked' : 'Unlocked' })),
 };
}
