import { ArrowLeft, FolderOpen, KeyRound, LockKeyhole, LockOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AssetInspector from '../../components/assets/AssetInspector';
import AssetPreviewModal from '../../components/assets/AssetPreviewModal';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import AddAssetsModal from '../../components/vault/AddAssetsModal';
import UnlockVaultModal from '../../components/vault/UnlockVaultModal';
import VaultPasswordModal from '../../components/vault/VaultPasswordModal';
import VaultAssetCard from '../../components/vault/VaultAssetCard';
import VaultConfirmModal from '../../components/vault/VaultConfirmModal';
import VaultFormModal from '../../components/vault/VaultFormModal';
import { assetService } from '../../services/assetService';
import { vaultService } from '../../services/vaultService';

export default function VaultDetailPage() {
	const { reference } = useParams();
	const navigate = useNavigate();
	const [vault, setVault] = useState(null);
	const [allAssets, setAllAssets] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [unlockOpen, setUnlockOpen] = useState(false);
	const [passwordMode, setPasswordMode] = useState(null);
	const [addOpen, setAddOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [removeAsset, setRemoveAsset] = useState(null);
	const [inspectAsset, setInspectAsset] = useState(null);
	const [previewAsset, setPreviewAsset] = useState(null);

	const load = useCallback(async (showLoading = true) => {
		if (showLoading) setLoading(true);
		setError('');
		try {
			const [nextVault, assets] = await Promise.all([vaultService.getVault(reference), assetService.getAssets()]);
			setVault(nextVault);
			setAllAssets(assets);
		} catch (loadError) {
			setError(loadError.message);
		} finally {
			if (showLoading) setLoading(false);
		}
	}, [reference]);

	useEffect(() => { load(); }, [load]);
	useEffect(() => {
		if (!vault?.unlockExpiresAt || vault.isLocked) return undefined;
		const remaining = new Date(vault.unlockExpiresAt).getTime() - Date.now();
		const timeout = window.setTimeout(() => load(false), Math.max(0, remaining) + 250);
		return () => window.clearTimeout(timeout);
	}, [load, vault?.isLocked, vault?.unlockExpiresAt]);

	if (loading) return <LoadingState label="Opening Vault"/>;
	if (!vault) return <><PageHeader eyebrow="Private collection" title="Vault unavailable" description={error || 'This Vault could not be found.'}/><Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/vault')}>Back to Vaults</Button></>;

	async function unlock(password) {
		setVault(await vaultService.unlockVault(vault.reference, password));
		setAllAssets(await assetService.getAssets());
	}
	async function lock() {
		setVault(await vaultService.lockVault(vault.reference));
		setAllAssets(await assetService.getAssets());
		setInspectAsset(null);
		setPreviewAsset(null);
	}
	async function updatePassword(input) {
		const nextVault = passwordMode === 'reset'
			? await vaultService.resetPassword(vault.reference, input)
			: await vaultService.changePassword(vault.reference, input);
		setVault(nextVault);
		setAllAssets(await assetService.getAssets());
		setInspectAsset(null);
		setPreviewAsset(null);
	}
	async function addAssets(ids) { setVault(await vaultService.addAssets(vault.reference, ids)); }
	async function edit(input) { setVault(await vaultService.updateVault(vault.reference, input)); }
	async function confirmRemove() { setVault(await vaultService.removeAsset(vault.reference, removeAsset.id)); }
	async function confirmDelete() { await vaultService.deleteVault(vault.reference); navigate('/vault', { replace: true }); }

	const locked = vault.passwordProtected && vault.isLocked;
	const actions = locked ? <Button icon={LockOpen} onClick={() => setUnlockOpen(true)}>Unlock Vault</Button> : <div className="vault-detail-actions"><Button icon={Plus} onClick={() => setAddOpen(true)}>Add assets</Button>{vault.passwordProtected ? <><Button variant="secondary" icon={KeyRound} onClick={() => setPasswordMode('change')}>Change password</Button><Button variant="secondary" icon={LockKeyhole} onClick={lock}>Lock Vault</Button></> : null}<Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button><Button variant="ghost" icon={Trash2} onClick={() => setDeleteOpen(true)}>Delete</Button></div>;

	return <><button type="button" className="vault-back" onClick={() => navigate('/vault')}><ArrowLeft size={14}/> All Vaults</button><PageHeader eyebrow={vault.reference} title={vault.name} description={vault.description || 'Password-protected collection of registered assets.'} action={actions}/>{error ? <div className="error-banner" role="alert">{error}</div> : null}<div className="vault-detail-summary"><div><span>Assets</span><strong>{vault.assetCount}</strong></div><div><span>Password Protected</span><strong>{locked ? 'Locked' : vault.passwordProtected ? `Unlocked · ${vault.autoLockMinutes || 10} min auto-lock` : 'Setup required'}</strong></div><div><span>Last updated</span><strong>{new Date(vault.updatedAt).toLocaleDateString()}</strong></div></div>{locked ? <EmptyState icon={LockKeyhole} title="This Vault is locked" description="Enter the Vault password to view its assets, previews, metadata, and verification tools." action={<Button icon={LockOpen} onClick={() => setUnlockOpen(true)}>Unlock Vault</Button>}/> : vault.assets.length ? <div className="asset-grid vault-asset-grid">{vault.assets.map((asset) => <VaultAssetCard key={asset.id} asset={asset} onInspect={setInspectAsset} onPreview={setPreviewAsset} onVerify={(item) => navigate('/verification', { state: { assetId: item.id } })} onRemove={setRemoveAsset}/>)}</div> : <EmptyState icon={FolderOpen} title="This Vault is empty" description="Add registered assets to organize them here without creating additional copies." action={<Button icon={Plus} onClick={() => setAddOpen(true)}>Add assets</Button>}/>}<UnlockVaultModal open={unlockOpen} vault={vault} onClose={() => setUnlockOpen(false)} onUnlock={unlock} onReset={() => setPasswordMode('reset')}/><VaultPasswordModal open={Boolean(passwordMode)} mode={passwordMode || 'change'} vault={vault} onClose={() => setPasswordMode(null)} onSubmit={updatePassword}/><AddAssetsModal open={addOpen && !locked} vault={vault} assets={allAssets} onClose={() => setAddOpen(false)} onAdd={addAssets}/><VaultFormModal open={editOpen && !locked} vault={vault} onClose={() => setEditOpen(false)} onSubmit={edit}/><VaultConfirmModal open={Boolean(removeAsset) && !locked} title="Remove from Vault?" description={removeAsset ? `${removeAsset.title} will be removed from ${vault.name}. The registered asset will remain in your Asset Library.` : ''} confirmLabel="Remove" onClose={() => setRemoveAsset(null)} onConfirm={confirmRemove}/><VaultConfirmModal open={deleteOpen && !locked} title={`Delete “${vault.name}”?`} description={`This Vault will be permanently removed. Its ${vault.assetCount} registered ${vault.assetCount === 1 ? 'asset' : 'assets'} will not be deleted from VaultChain.`} confirmLabel="Delete Vault" onClose={() => setDeleteOpen(false)} onConfirm={confirmDelete}/>{inspectAsset ? <AssetInspector asset={inspectAsset} onClose={() => setInspectAsset(null)} onPreview={(asset) => { setInspectAsset(null); setPreviewAsset(asset); }}/>: null}{previewAsset ? <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)}/>: null}</>;
}
