import { FolderLock, FolderPlus, Images, Layers3 } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import VaultCard from '../../components/vault/VaultCard';
import VaultFormModal from '../../components/vault/VaultFormModal';
import { vaultService } from '../../services/vaultService';

export default function VaultPage() {
	const [vaults, setVaults] = useState([]);
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [createOpen, setCreateOpen] = useState(false);
	async function load() {
		setLoading(true); setError('');
		try { const data = await vaultService.getVaults(); setVaults(data.vaults); setStats(data.stats); }
		catch (loadError) { setError(loadError.message); }
		finally { setLoading(false); }
	}
	useEffect(() => { load(); }, []);
	useEffect(() => {
		const expirations = vaults.filter((vault) => !vault.isLocked && vault.unlockExpiresAt).map((vault) => new Date(vault.unlockExpiresAt).getTime());
		if (!expirations.length) return undefined;
		const timeout = window.setTimeout(load, Math.max(0, Math.min(...expirations) - Date.now()) + 250);
		return () => window.clearTimeout(timeout);
	}, [vaults]);
	async function create(input) { const vault = await vaultService.createVault(input); setVaults((current) => [vault, ...current]); setStats((current) => current ? { ...current, totalVaults: current.totalVaults + 1 } : current); }
	const statCards = [
		{ label: 'Total Vaults', value: stats?.totalVaults ?? 0, helper: 'Private collections', icon: FolderLock, tone: 'blue' },
		{ label: 'Assets organized', value: stats?.organizedAssets ?? 0, helper: 'Unique registered assets', icon: Layers3, tone: 'violet' },
		{ label: 'Unorganized assets', value: stats?.unorganizedAssets ?? 0, helper: 'Available to organize', icon: Images, tone: 'amber' },
	];
	return <><PageHeader eyebrow="Private collections" title="Vault" description="Organize your registered assets into private collections." action={<Button icon={FolderPlus} onClick={() => setCreateOpen(true)}>Create Vault</Button>}/>{error ? <div className="error-banner">{error}</div> : null}{loading ? <LoadingState label="Loading your Vaults"/> : <>{vaults.length ? <><div className="vault-stats">{statCards.map((stat) => <StatCard key={stat.label} {...stat}/>)}</div><div className="vault-grid">{vaults.map((vault) => <VaultCard key={vault.reference} vault={vault}/>)}</div></> : <EmptyState icon={FolderLock} title="No Vaults yet" description="Create private collections to organize your registered VaultChain assets without making additional file copies." action={<Button icon={FolderPlus} onClick={() => setCreateOpen(true)}>Create your first Vault</Button>}/>}</>}<VaultFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={create}/></>;
}
