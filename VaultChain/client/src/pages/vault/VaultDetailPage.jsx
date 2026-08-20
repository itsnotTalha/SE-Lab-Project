import { ArrowLeft, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AssetInspector from '../../components/assets/AssetInspector';
import AssetPreviewModal from '../../components/assets/AssetPreviewModal';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import AddAssetsModal from '../../components/vault/AddAssetsModal';
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
	const [addOpen, setAddOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [removeAsset, setRemoveAsset] = useState(null);
	const [inspectAsset, setInspectAsset] = useState(null);
	const [previewAsset, setPreviewAsset] = useState(null);

	async function load() {
		setLoading(true); setError('');
		try { const [nextVault, assets] = await Promise.all([vaultService.getVault(reference), assetService.getAssets()]); setVault(nextVault); setAllAssets(assets); }
		catch (loadError) { setError(loadError.message); }
		finally { setLoading(false); }
	}
	useEffect(() => { load(); }, [reference]);
	if (loading) return <LoadingState label="Opening Vault"/>;
	if (!vault) return <><PageHeader eyebrow="Private collection" title="Vault unavailable" description={error || 'This Vault could not be found.'}/><Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/vault')}>Back to Vaults</Button></>;

	async function addAssets(ids) { setVault(await vaultService.addAssets(vault.reference, ids)); }
	async function edit(input) { setVault(await vaultService.updateVault(vault.reference, input)); }
	async function confirmRemove() { setVault(await vaultService.removeAsset(vault.reference, removeAsset.id)); }
	async function confirmDelete() { await vaultService.deleteVault(vault.reference); navigate('/vault', { replace: true }); }

	return <><button type="button" className="vault-back" onClick={() => navigate('/vault')}><ArrowLeft size={14}/> All Vaults</button><PageHeader eyebrow={vault.reference} title={vault.name} description={vault.description || 'Private collection of registered assets.'} action={<div className="vault-detail-actions"><Button icon={Plus} onClick={() => setAddOpen(true)}>Add assets</Button><Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button><Button variant="ghost" icon={Trash2} onClick={() => setDeleteOpen(true)}>Delete</Button></div>}/>{error ? <div className="error-banner">{error}</div> : null}<div className="vault-detail-summary"><div><span>Assets</span><strong>{vault.assetCount}</strong></div><div><span>Created</span><strong>{new Date(vault.createdAt).toLocaleDateString()}</strong></div><div><span>Last updated</span><strong>{new Date(vault.updatedAt).toLocaleDateString()}</strong></div></div>{vault.assets.length ? <div className="asset-grid vault-asset-grid">{vault.assets.map((asset) => <VaultAssetCard key={asset.id} asset={asset} onInspect={setInspectAsset} onPreview={setPreviewAsset} onVerify={(item) => navigate('/verification', { state: { assetId: item.id } })} onRemove={setRemoveAsset}/>)}</div> : <EmptyState icon={FolderOpen} title="This Vault is empty" description="Add registered assets to organize them here without creating additional copies." action={<Button icon={Plus} onClick={() => setAddOpen(true)}>Add assets</Button>}/>}<AddAssetsModal open={addOpen} vault={vault} assets={allAssets} onClose={() => setAddOpen(false)} onAdd={addAssets}/><VaultFormModal open={editOpen} vault={vault} onClose={() => setEditOpen(false)} onSubmit={edit}/><VaultConfirmModal open={Boolean(removeAsset)} title="Remove from Vault?" description={removeAsset ? `${removeAsset.title} will be removed from ${vault.name}. The registered asset will remain in your Asset Library.` : ''} confirmLabel="Remove" onClose={() => setRemoveAsset(null)} onConfirm={confirmRemove}/><VaultConfirmModal open={deleteOpen} title={`Delete “${vault.name}”?`} description={`This Vault will be permanently removed. Its ${vault.assetCount} registered ${vault.assetCount === 1 ? 'asset' : 'assets'} will not be deleted from VaultChain.`} confirmLabel="Delete Vault" onClose={() => setDeleteOpen(false)} onConfirm={confirmDelete}/>{inspectAsset ? <AssetInspector asset={inspectAsset} onClose={() => setInspectAsset(null)} onPreview={(asset) => { setInspectAsset(null); setPreviewAsset(asset); }}/>: null}{previewAsset ? <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)}/>: null}</>;
}
