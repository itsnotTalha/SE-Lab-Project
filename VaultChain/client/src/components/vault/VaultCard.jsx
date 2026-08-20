import { ArrowRight, FolderLock } from 'lucide-react';
import { Link } from 'react-router-dom';

import AssetThumbnail from '../assets/AssetThumbnail';

export default function VaultCard({ vault }) {
	return <article className="vault-card"><Link to={`/vault/${vault.reference}`} className="vault-card__link" aria-label={`Open ${vault.name}`}><div className="vault-card__heading"><span><FolderLock size={18}/></span><div><h2>{vault.name}</h2><p>{vault.description || 'Private asset collection'}</p></div><ArrowRight size={16}/></div><div className={`vault-card__previews ${vault.assets.length ? '' : 'is-empty'}`}>{vault.assets.length ? vault.assets.map((asset) => <span key={asset.id}><AssetThumbnail asset={asset}/></span>) : <div><FolderLock size={24}/><span>No assets added</span></div>}</div><footer><span>{vault.assetCount} {vault.assetCount === 1 ? 'asset' : 'assets'}</span><span>Updated {vault.updatedAt ? new Date(vault.updatedAt).toLocaleDateString() : 'recently'}</span></footer></Link></article>;
}
