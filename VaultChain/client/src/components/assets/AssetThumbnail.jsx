import { FileImage } from 'lucide-react';
import { useEffect, useState } from 'react';

import { assetService } from '../../services/assetService';

export default function AssetThumbnail({ asset, large = false }) {
	const [url, setUrl] = useState('');

	useEffect(() => {
		let active = true;
		let objectUrl = '';

		if (!asset?.id || !asset.mimeType?.startsWith('image/')) return undefined;

		assetService.getContentObjectUrl(asset.id)
			.then((nextUrl) => {
				objectUrl = nextUrl;
				if (active) setUrl(nextUrl);
				else URL.revokeObjectURL(nextUrl);
			})
			.catch(() => {
				if (active) setUrl('');
			});

		return () => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [asset?.id, asset?.mimeType]);

	return (
		<div className={`asset-thumbnail ${large ? 'asset-thumbnail--large' : ''}`}>
			{url ? <img src={url} alt={`Preview of ${asset.title}`} /> : <><div className="asset-card__pattern" /><FileImage size={large ? 42 : 32} aria-hidden="true" /></>}
		</div>
	);
}
