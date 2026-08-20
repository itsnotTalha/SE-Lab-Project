import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus, WalletCards } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatCard from '../../components/ui/StatCard';
import { walletService } from '../../services/walletService';

const CREDIT_TYPES = new Set(['deposit', 'sale']);

export default function WalletPage() {
	const [wallet, setWallet] = useState(null);
	const [transactions, setTransactions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [type, setType] = useState('deposit');
	const [amount, setAmount] = useState('');
	const [description, setDescription] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const loadWallet = useCallback(async () => {
		setError(''); setLoading(true);
		try { const [walletData, transactionData] = await Promise.all([walletService.getWallet(), walletService.getTransactions()]); setWallet(walletData); setTransactions(transactionData); }
		catch (loadError) { setError(loadError.message); }
		finally { setLoading(false); }
	}, []);
	useEffect(() => { loadWallet(); }, [loadWallet]);

	async function handleSubmit(event) {
		event.preventDefault(); setError(''); setSubmitting(true);
		try { await walletService.addTransaction({ type, amount: Number(amount), description }); setAmount(''); setDescription(''); await loadWallet(); }
		catch (submitError) { setError(submitError.message); }
		finally { setSubmitting(false); }
	}

	return (
		<>
			<PageHeader eyebrow="Account wallet" title="Wallet" description="Review your credit balance and account transaction history." />
			{error ? <div className="error-banner">{error}</div> : null}
			<div className="dashboard-stats"><StatCard label="Available balance" value={`${(wallet?.balance || 0).toLocaleString()} credits`} helper="Current account balance" icon={WalletCards} tone="green" pending={loading}/><StatCard label="Transactions" value={transactions.length} helper="Recorded wallet entries" icon={CreditCard} tone="blue" pending={loading}/></div>
			<div className="dashboard-grid">
				<SectionCard title="Transaction history" description="Entries returned by the authenticated wallet API.">{transactions.length === 0 && !loading ? <EmptyState icon={WalletCards} title="No transactions yet" description="New deposits and withdrawals will appear here."/> : <div className="transaction-list">{transactions.map((item)=>{const credit=CREDIT_TYPES.has(item.type);return <div className="transaction-item" key={item.id}><span className={credit?'is-credit':'is-debit'}>{credit?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>}</span><div><strong>{item.description || item.type}</strong><small>{item.type} · {new Date(item.createdAt).toLocaleDateString()}</small></div><b className={credit?'is-credit':'is-debit'}>{credit?'+':'−'}{Number(item.amount).toLocaleString()} credits</b></div>})}</div>}</SectionCard>
				<SectionCard title="Record transaction" description="Add a wallet entry using the existing wallet API."><form className="form-grid" onSubmit={handleSubmit}><div className="field"><label htmlFor="transaction-type">Type</label><select id="transaction-type" className="select" value={type} onChange={(e)=>setType(e.target.value)}><option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option></select></div><div className="field"><label htmlFor="transaction-amount">Amount</label><input id="transaction-amount" className="input" type="number" min="0.01" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="0.00" required/></div><div className="field"><label htmlFor="transaction-description">Description</label><input id="transaction-description" className="input" value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Optional note"/></div><Button type="submit" icon={Plus} disabled={submitting}>{submitting?'Recording…':'Add transaction'}</Button></form></SectionCard>
			</div>
		</>
	);
}
