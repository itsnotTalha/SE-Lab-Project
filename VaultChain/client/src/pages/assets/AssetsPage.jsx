import { AlertCircle, FileImage, Grid2X2, Image, List, Plus, RefreshCw, Search, UploadCloud } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import AssetCard from '../../components/assets/AssetCard';
import AssetInspector from '../../components/assets/AssetInspector';
import AssetPreviewModal from '../../components/assets/AssetPreviewModal';
import OwnershipCheckPanel from '../../components/assets/OwnershipCheckPanel';
import UploadAssetModal from '../../components/assets/UploadAssetModal';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import { assetService } from '../../services/assetService';

function AssetSkeletons() {
	return <div className="asset-grid" aria-label="Loading assets">{[1, 2, 3, 4, 5, 6].map((item) => <div className="asset-skeleton" key={item}><span className="skeleton asset-skeleton__visual"/><div><span className="skeleton asset-skeleton__title"/><span className="skeleton asset-skeleton__line"/><span className="skeleton asset-skeleton__line asset-skeleton__line--short"/></div></div>)}</div>;
}

export default function AssetsPage() {
	const [assets, setAssets] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [filter, setFilter] = useState('all');
	const [view, setView] = useState('grid');
	const [uploadOpen, setUploadOpen] = useState(false);
	const [selected, setSelected] = useState(null);
	const [previewAsset, setPreviewAsset] = useState(null);
	const [pendingUpload, setPendingUpload] = useState(null);
	const [ownershipResetKey, setOwnershipResetKey] = useState(0);

	const loadAssets = useCallback(async () => {
		setLoading(true);
		setError('');
		try { setAssets(await assetService.getAssets()); }
		catch (loadError) { setError(loadError.message); }
		finally { setLoading(false); }
	}, []);

	useEffect(() => { loadAssets(); }, [loadAssets]);

	const filteredAssets = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		return assets.filter((asset) => {
			const matchesType = filter === 'all' || asset.mimeType?.startsWith('image/');
			const matchesQuery = !normalizedQuery || [asset.title, asset.fileName, asset.category, String(asset.id)]
				.some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
			return matchesType && matchesQuery;
		});
	}, [assets, filter, query]);

	async function handleUploaded(response) {
		await loadAssets();
		setSelected(response.asset);
		setPendingUpload(null);
		setOwnershipResetKey((key) => key + 1);
	}

	async function handleViewAsset(assetId) {
		const existingAsset = assets.find((asset) => asset.id === assetId);
		if (existingAsset) { setSelected(existingAsset); return; }
		try { setSelected(await assetService.getAsset(assetId)); }
		catch (viewError) { setError(viewError.message); }
	}

	function openStandardUpload() {
		setPendingUpload(null);
		setUploadOpen(true);
	}

	return (
		<>
			<PageHeader eyebrow="Asset library" title="Digital assets" description="Create and inspect verifiable identities for your files." action={<Button icon={Plus} onClick={openStandardUpload}>Upload asset</Button>} />
			<div className="assets-section-heading"><div><span>My assets</span><p>Your registered images and their stored fingerprints.</p></div><strong>{assets.length} {assets.length === 1 ? 'asset' : 'assets'}</strong></div>
			<div className="assets-toolbar">
				<label className="search-field"><Search size={15}/><span className="sr-only">Search assets</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets by title, filename, or ID" /></label>
				<div className="assets-toolbar__filters" aria-label="Asset filters"><button type="button" className={`filter-chip ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>All assets</button><button type="button" className={`filter-chip ${filter === 'image' ? 'is-active' : ''}`} onClick={() => setFilter('image')}><Image size={13}/> Images</button></div>
				<div className="view-switch" aria-label="Asset view"><button type="button" className={view === 'grid' ? 'is-active' : ''} onClick={() => setView('grid')} aria-label="Grid view"><Grid2X2 size={15}/></button><button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-label="List view"><List size={16}/></button></div>
			</div>

			{loading ? <AssetSkeletons /> : error ? (
				<div className="assets-error"><span><AlertCircle size={22}/></span><h2>Unable to load your assets</h2><p>{error}</p><Button variant="secondary" icon={RefreshCw} onClick={loadAssets}>Try again</Button></div>
			) : filteredAssets.length === 0 ? (
				<EmptyState icon={FileImage} title={assets.length ? 'No matching assets' : 'Your asset library is empty'} description={assets.length ? 'Try a different search term or filter.' : 'Upload a JPG, PNG, or WebP image to create its cryptographic fingerprint.'} action={!assets.length ? <Button icon={UploadCloud} onClick={openStandardUpload}>Upload first asset</Button> : null}/>
			) : (
				<div className={view === 'grid' ? 'asset-grid' : 'assets-list'}>{filteredAssets.map((asset) => <AssetCard key={asset.id} asset={asset} view={view} onInspect={setSelected} onPreview={setPreviewAsset}/>)}</div>
			)}

			<div className="assets-ownership-section"><OwnershipCheckPanel key={ownershipResetKey} onAddToAssets={(file) => { setPendingUpload(file); setUploadOpen(true); }} onViewAsset={handleViewAsset}/></div>
			{selected ? <AssetInspector asset={selected} onClose={() => setSelected(null)} onPreview={(asset) => { setSelected(null); setPreviewAsset(asset); }} /> : null}
			{previewAsset ? <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} /> : null}
			<UploadAssetModal open={uploadOpen} initialFile={pendingUpload} onClose={() => { setUploadOpen(false); setPendingUpload(null); }} onUploaded={handleUploaded} />
		</>
	);
}
