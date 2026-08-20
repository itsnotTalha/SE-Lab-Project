import { CalendarDays, Eye, Fingerprint, LockKeyhole, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import AssetThumbnail from '../assets/AssetThumbnail';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';

function dimensions(asset) {
	return asset.width && asset.height ? `${asset.width} × ${asset.height}` : 'Dimensions unavailable';
}

export default function AssetSelector({ assets, selected, onSelect, onPreview }) {
	const [query, setQuery] = useState('');
	const filtered = useMemo(() => {
		const value = query.trim().toLowerCase();
		return assets.filter((asset) => !value || [asset.title, asset.fileName, asset.id]
			.some((field) => String(field || '').toLowerCase().includes(value)));
	}, [assets, query]);

	if (selected && !selected.vaultProtection?.isLocked) {
		return <div className="verification-selected-asset"><div className="verification-selected-asset__preview"><AssetThumbnail asset={selected}/></div><div className="verification-selected-asset__body"><span className="verification-kicker">Registered asset</span><h3>{selected.title}</h3><p>Asset #{selected.id} · {dimensions(selected)}</p><div className="verification-selected-asset__meta"><span><CalendarDays size={13}/>{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : 'Date unavailable'}</span><StatusBadge tone="info"><Fingerprint size={10}/> Recorded</StatusBadge></div><div className="verification-inline-actions"><Button type="button" size="sm" variant="secondary" icon={Eye} onClick={() => onPreview(selected)}>Preview</Button><Button type="button" size="sm" variant="ghost" onClick={() => onSelect(null)}>Change asset</Button></div></div></div>;
	}

	return <div className="verification-asset-selector"><label className="search-field"><Search size={15}/><span className="sr-only">Search registered assets</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your assets"/></label><div className="verification-asset-options" role="listbox" aria-label="Registered assets">{filtered.map((asset) => { const locked = asset.vaultProtection?.isLocked; return <button type="button" role="option" aria-selected="false" aria-disabled={locked} disabled={locked} className={`verification-asset-option ${locked ? 'is-locked' : ''}`} key={asset.id} onClick={() => onSelect(asset)}><span><AssetThumbnail asset={asset}/></span><div><strong>{asset.title}</strong><small>Asset #{asset.id} · {locked ? 'Protected by Vault' : dimensions(asset)}</small><small>{locked ? 'Unlock every protecting Vault to verify' : asset.createdAt ? `Registered ${new Date(asset.createdAt).toLocaleDateString()}` : 'Registration date unavailable'}</small></div>{locked ? <LockKeyhole size={15}/> : asset.hasHash ? <Fingerprint size={15}/> : null}</button>; })}</div>{filtered.length === 0 ? <p className="verification-selector-empty">{assets.length ? 'No assets match your search.' : 'Upload an asset before running verification.'}</p> : null}</div>;
}
