import { CircleDollarSign, Gem, TrendingUp, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import ChartCard from '../../components/ui/ChartCard';
import DataTable from '../../components/ui/DataTable';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { getDashboardSummary } from '../../services/dashboardService';
import { walletService } from '../../services/walletService';

const credits = new Set(['deposit', 'sale']);

function monthlyTransactions(items) {
	return Array.from({ length: 6 }, (_, offset) => { const date = new Date(); date.setMonth(date.getMonth() - (5 - offset)); const entries = items.filter((item) => { const itemDate = new Date(item.createdAt); return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear(); }); return { month: date.toLocaleDateString(undefined, { month: 'short' }), income: entries.filter((item) => credits.has(item.type)).reduce((sum, item) => sum + Number(item.amount), 0), outflow: entries.filter((item) => !credits.has(item.type)).reduce((sum, item) => sum + Number(item.amount), 0) }; });
}

export default function EarningsPage() {
	const [wallet, setWallet] = useState(null);
	const [transactions, setTransactions] = useState([]);
	const [summary, setSummary] = useState(null);
	const [error, setError] = useState('');
	useEffect(() => { Promise.all([walletService.getWallet(), walletService.getTransactions(), getDashboardSummary()]).then(([nextWallet, nextTransactions, nextSummary]) => { setWallet(nextWallet); setTransactions(nextTransactions); setSummary(nextSummary); }).catch((loadError) => setError(loadError.message)); }, []);
	const chart = useMemo(() => monthlyTransactions(transactions), [transactions]);
	const revenue = transactions.filter((item) => credits.has(item.type)).reduce((sum, item) => sum + Number(item.amount), 0);
	const sales = transactions.filter((item) => item.type === 'sale');
	const currentMonthIncome = chart.at(-1)?.income || 0;
	const averageAssetValue = summary?.totalAssets ? Math.round((wallet?.balance || 0) / summary.totalAssets) : 0;
	const sources = [{ source: 'Asset sales', value: sales.reduce((sum, item) => sum + Number(item.amount), 0) }, { source: 'Wallet deposits', value: transactions.filter((item) => item.type === 'deposit').reduce((sum, item) => sum + Number(item.amount), 0) }, { source: 'Marketplace listings', value: summary?.activeListings || 0 }];
	const columns = [{ key: 'description', label: 'Transaction', render: (item) => <div className="table-primary"><strong>{item.description || item.type}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></div> }, { key: 'type', label: 'Source', render: (item) => <StatusBadge tone={credits.has(item.type) ? 'success' : 'neutral'}>{item.type}</StatusBadge> }, { key: 'amount', label: 'Amount', render: (item) => <strong className={credits.has(item.type) ? 'amount-positive' : ''}>{credits.has(item.type) ? '+' : '−'}{Number(item.amount).toLocaleString()} cr</strong> }];
	return <><PageHeader eyebrow="Ownership economics" title="Earnings" description="Track realized income, wallet movement, and the value carried by your registered assets."/>{error ? <div className="error-banner">{error}</div> : null}<div className="dashboard-stats"><StatCard label="Total inflow" value={`${revenue.toLocaleString()} cr`} helper="Deposits and completed sales" icon={CircleDollarSign} tone="green"/><StatCard label="Monthly income" value={`${currentMonthIncome.toLocaleString()} cr`} helper="Current calendar month" icon={TrendingUp}/><StatCard label="Average asset value" value={`${averageAssetValue.toLocaleString()} cr`} helper="Wallet value per asset" icon={Gem} tone="violet"/><StatCard label="Available balance" value={`${(wallet?.balance || 0).toLocaleString()} cr`} helper="Ready in your wallet" icon={WalletCards} tone="amber"/></div><div className="earnings-grid"><ChartCard title="Earnings timeline" description="Income growth over the last six months" className="earnings-grid__wide"><ResponsiveContainer width="100%" height={290}><AreaChart data={chart} margin={{ top: 10, right: 8, left: -10 }}><defs><linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--success)" stopOpacity={.3}/><stop offset="1" stopColor="var(--success)" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--chart-grid)" vertical={false}/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip/><Area type="monotone" dataKey="income" stroke="var(--success)" strokeWidth={2.5} fill="url(#income)"/></AreaChart></ResponsiveContainer></ChartCard><ChartCard title="Revenue sources" description="Where value entered your account"><ResponsiveContainer width="100%" height={220}><BarChart data={sources} layout="vertical" margin={{ left: 18 }}><XAxis type="number" hide/><YAxis type="category" dataKey="source" axisLine={false} tickLine={false} width={110}/><Tooltip/><Bar dataKey="value" fill="var(--primary)" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></ChartCard><ChartCard title="Recent transactions" description="Authenticated wallet history" className="earnings-grid__full"><DataTable columns={columns} rows={transactions.slice(0, 8)}/></ChartCard></div></>;
}
