import { AlertCircle, LockKeyhole, Store, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { assetService } from '../../services/assetService';
import { marketplaceService } from '../../services/marketplaceService';
import AssetThumbnail from '../assets/AssetThumbnail';
import Button from '../ui/Button';
import LoadingState from '../ui/LoadingState';

export default function CreateListingModal({ open, onClose, onCreated }) {
	const [assets, setAssets] = useState([]);
	const [assetId, setAssetId] = useState(null);
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [price, setPrice] = useState('');
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!open) return;
		setAssetId(null); setTitle(''); setDescription(''); setPrice(''); setError(''); setLoading(true);
		assetService.getAssets().then(setAssets).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
	}, [open]);
	if (!open) return null;

	function choose(asset) {
		if (asset.vaultProtection?.isLocked) return;
		setAssetId(asset.id);
		if (!title) setTitle(asset.title);
	}

	async function submit(event) {
		event.preventDefault(); setError(''); setSubmitting(true);
		try {
			const listing = await marketplaceService.createListing({ assetId, title, description, price: Number(price) });
			onCreated(listing);
		} catch (submitError) { setError(submitError.message); }
		finally { setSubmitting(false); }
	}

	return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-listing-title"><button className="modal__backdrop" aria-label="Close" onClick={onClose}/><section className="modal__card marketplace-form-modal"><header className="modal__header"><div><span className="modal__icon"><Store size={19}/></span><div><h2 id="create-listing-title">Create marketplace listing</h2><p>Offer one of your assets for VaultChain Credits.</p></div></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={18}/></button></header><form className="form-grid modal__form" onSubmit={submit}>
		<div className="field"><label>Select an asset</label>{loading?<LoadingState label="Loading your assets"/>:<div className="listing-asset-picker">{assets.map((asset)=>{const locked=asset.vaultProtection?.isLocked;return <button key={asset.id} type="button" className={assetId===asset.id?'is-selected':''} disabled={locked} onClick={()=>choose(asset)}><span><AssetThumbnail asset={asset}/></span><div><strong>{asset.title}</strong><small>{locked?<><LockKeyhole size={11}/> Protected by Vault — unlock to list</>:`VC-A${String(asset.id).padStart(6,'0')}`}</small></div></button>;})}{assets.length===0?<p>No owned assets are available to list.</p>:null}</div>}</div>
		<div className="field"><label htmlFor="listing-title">Listing title</label><input id="listing-title" className="input" maxLength="120" value={title} onChange={(event)=>setTitle(event.target.value)} required/></div>
		<div className="field"><label htmlFor="listing-description">Description <span className="field-hint">(optional)</span></label><textarea id="listing-description" className="textarea" maxLength="1000" value={description} onChange={(event)=>setDescription(event.target.value)}/></div>
		<div className="field"><label htmlFor="listing-price">Price in VaultChain Credits</label><input id="listing-price" className="input" type="number" min="0.01" max="1000000000" step="0.01" value={price} onChange={(event)=>setPrice(event.target.value)} required/></div>
		{error?<div className="error-banner" role="alert"><AlertCircle size={16}/>{error}</div>:null}<footer className="modal__footer"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" icon={Store} disabled={submitting||!assetId}>{submitting?'Creating…':'Create listing'}</Button></footer>
	</form></section></div>;
}
