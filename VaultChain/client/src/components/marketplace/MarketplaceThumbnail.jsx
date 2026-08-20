import { Image, LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';

import { marketplaceService } from '../../services/marketplaceService';

export default function MarketplaceThumbnail({ listing, large = false }) {
	const [source, setSource] = useState('');
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let active = true;
		let objectUrl = '';
		setSource('');
		setFailed(false);
		if (!listing.asset.previewAvailable) return () => {};
		marketplaceService.getContentObjectUrl(listing.reference).then((url) => {
			objectUrl = url;
			if (active) setSource(url);
		}).catch(() => { if (active) setFailed(true); });
		return () => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [listing.reference, listing.asset.previewAvailable]);

	const className = `marketplace-thumbnail${large ? ' marketplace-thumbnail--large' : ''}`;
	if (listing.asset.isLocked) return <div className={className}><LockKeyhole size={large ? 34 : 24}/><span>Password Protected</span></div>;
	if (!listing.asset.previewAvailable || failed) return <div className={className}><Image size={large ? 34 : 24}/><span>Preview unavailable</span></div>;
	if (!source) return <div className={`${className} is-loading`} aria-label="Loading asset preview" />;
	return <div className={className}><img src={source} alt={`Preview of ${listing.asset.title}`} /></div>;
}
