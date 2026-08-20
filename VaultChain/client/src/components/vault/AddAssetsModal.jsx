import { Check, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import AssetThumbnail from '../assets/AssetThumbnail';
import Button from '../ui/Button';

export default function AddAssetsModal({ open, vault, assets, onClose, onAdd }) {
	const [query, setQuery] = useState('');
	const [selected, setSelected] = useState(new Set());
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	useEffect(() => {
		if (open) { setQuery(''); setSelected(new Set()); setError(''); setLoading(false); }
	}, [open]);
	const existing = useMemo(() => new Set(vault?.assets.map((asset) => asset.id) || []), [vault]);
	const filtered = useMemo(() => {
		const value = query.trim().toLowerCase();
		return assets.filter((asset) => !value || [asset.title, asset.fileName, asset.mimeType, `VC-A${String(asset.id).padStart(6, '0')}`]
			.some((field) => String(field || '').toLowerCase().includes(value)));
	}, [assets, query]);
	if (!open) return null;
	function toggle(id) {
		if (existing.has(id)) return;
		setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
	}
	async function add() {
		setLoading(true); setError('');
		try { await onAdd([...selected]); setSelected(new Set()); setQuery(''); onClose(); }
		catch (addError) { setError(addError.message); }
		finally { setLoading(false); }
	}
	return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-assets-title"><button type="button" className="modal__backdrop" onClick={onClose} aria-label="Close asset selector"/><div className="modal__card add-assets-modal"><header className="modal__header"><div><span className="modal__icon"><Plus size={18}/></span><div><h2 id="add-assets-title">Add assets to {vault.name}</h2><p>Select registered assets without creating additional copies.</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={17}/></button></header><div className="add-assets-modal__body"><label className="search-field"><Search size={15}/><span className="sr-only">Search my assets</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search my assets"/></label><div className="add-assets-list">{filtered.map((asset) => { const added = existing.has(asset.id); const checked = selected.has(asset.id); return <button type="button" className={`add-assets-item ${checked ? 'is-selected' : ''}`} disabled={added} onClick={() => toggle(asset.id)} key={asset.id}><span className="add-assets-item__check">{added || checked ? <Check size={14}/> : null}</span><span className="add-assets-item__thumb"><AssetThumbnail asset={asset}/></span><div><strong>{asset.title}</strong><small>VC-A{String(asset.id).padStart(6, '0')} · {asset.width && asset.height ? `${asset.width} × ${asset.height}` : asset.mimeType}</small></div><em>{added ? 'Already added' : checked ? 'Selected' : 'Select'}</em></button>; })}</div>{!filtered.length ? <p className="verification-selector-empty">No matching assets found.</p> : null}{error ? <div className="error-banner">{error}</div> : null}</div><footer className="add-assets-modal__footer"><span>{selected.size} selected</span><div><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="button" icon={Plus} disabled={!selected.size || loading} onClick={add}>{loading ? 'Adding…' : `Add ${selected.size || ''} ${selected.size === 1 ? 'asset' : 'assets'}`}</Button></div></footer></div></div>;
}
