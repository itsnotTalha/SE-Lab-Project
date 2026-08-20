import { ScanSearch, Trash2 } from 'lucide-react';

import AssetCard from '../assets/AssetCard';

export default function VaultAssetCard({ asset, onInspect, onPreview, onVerify, onRemove }) {
	return <div className="vault-asset-item"><AssetCard asset={asset} onInspect={onInspect} onPreview={onPreview}/><div className="vault-asset-item__actions"><button type="button" onClick={() => onVerify(asset)}><ScanSearch size={13}/> Verify</button><button type="button" onClick={() => onRemove(asset)}><Trash2 size={13}/> Remove from Vault</button></div></div>;
}
