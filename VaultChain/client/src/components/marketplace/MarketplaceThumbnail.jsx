import { Image, LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';

import { documentService } from '../../services/documentService';
import { marketplaceService } from '../../services/marketplaceService';

export default function MarketplaceThumbnail({ listing, large = false }) {
	const [source, setSource] = useState('');
	const [failed, setFailed] = useState(false);

	const hasViewGrant = Boolean(listing?.userAccess?.grant?.canView && listing?.documentId);
	const permittedPage = listing?.userAccess?.grant?.pages?.[0] || 1;

	useEffect(() => {
		let active = true;
		let objectUrl = '';
		setSource('');
		setFailed(false);

		if (hasViewGrant) {
			documentService.getPageContentObjectUrl(listing.documentId, permittedPage)
				.then((url) => {
					objectUrl = url;
					if (active) setSource(url);
				})
				.catch(() => { if (active) setFailed(true); });
		} else if (listing.asset?.previewAvailable && !listing.asset?.isLocked) {
			marketplaceService.getContentObjectUrl(listing.reference)
				.then((url) => {
					objectUrl = url;
					if (active) setSource(url);
				})
				.catch(() => { if (active) setFailed(true); });
		}

		return () => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [listing.reference, listing.asset?.previewAvailable, listing.asset?.isLocked, hasViewGrant, listing.documentId, permittedPage]);

	const className = `marketplace-thumbnail${large ? ' marketplace-thumbnail--large' : ''}`;
	if (listing.asset?.isLocked && !hasViewGrant) return <div className={className}><LockKeyhole size={large ? 34 : 24}/><span>Password Protected</span></div>;
	if (failed || (!source && !listing.asset?.previewAvailable && !hasViewGrant)) return <div className={className}><Image size={large ? 34 : 24}/><span>Preview unavailable</span></div>;
	if (!source) return <div className={`${className} is-loading`} aria-label="Loading asset preview" />;

	const isPdf = listing.asset?.mimeType === 'application/pdf' || listing.asset?.category === 'pdf' || (hasViewGrant && !listing.asset?.mimeType?.startsWith('image/'));
	if (isPdf) {
		return (
			<div className={className}>
				<iframe
					src={`${source}#page=${permittedPage}&toolbar=0&navpanes=0`}
					title={`Preview of ${listing.asset?.title || listing.title}`}
					style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
				/>
			</div>
		);
	}

	return <div className={className}><img src={source} alt={`Preview of ${listing.asset?.title || listing.title}`} /></div>;
}
