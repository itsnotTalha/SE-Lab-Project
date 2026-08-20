import { ArrowRight, FolderLock, LockKeyhole, LockOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

import AssetThumbnail from '../assets/AssetThumbnail';
import StatusBadge from '../ui/StatusBadge';

export default function VaultCard({ vault }) {
	const locked = vault.passwordProtected && vault.isLocked;
	return <article className="vault-card"><Link to={`/vault/${vault.reference}`} className="vault-card__link" aria-label={`Open ${vault.name}`}><div className="vault-card__heading"><span><FolderLock size={18}/></span><div><h2>{vault.name}</h2><p>{vault.description || 'Private asset collection'}</p></div><ArrowRight size={16}/></div><div className={`vault-card__previews ${vault.assets.length && !locked ? '' : 'is-empty'}`}>{locked ? <div className="vault-card__locked"><LockKeyhole size={25}/><strong>Locked</strong><span>Password protected</span></div> : vault.assets.length ? vault.assets.map((asset) => <span key={asset.id}><AssetThumbnail asset={asset}/></span>) : <div><FolderLock size={24}/><span>No assets added</span></div>}</div><footer><span>{vault.assetCount} {vault.assetCount === 1 ? 'asset' : 'assets'}</span>{vault.passwordProtected ? <StatusBadge tone={locked ? 'warning' : 'success'}>{locked ? <LockKeyhole size={10}/> : <LockOpen size={10}/>} {locked ? 'Locked' : 'Unlocked'}</StatusBadge> : <span>Legacy collection</span>}</footer></Link></article>;
}
