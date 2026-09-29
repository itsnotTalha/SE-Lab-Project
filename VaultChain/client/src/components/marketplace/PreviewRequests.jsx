import { useCallback, useEffect, useState } from 'react';
import { marketplaceService } from '../../services/marketplaceService';
import Button from '../ui/Button';
import SectionCard from '../ui/SectionCard';

const messages = {
	pending: 'Your request is waiting for the seller’s approval.',
	approved: 'The seller approved your preview. You can now view it above.',
	denied: 'The seller declined your preview request.',
	revoked: 'The seller revoked your preview access.',
};

export default function PreviewRequests({ listing, onUpdated }) {
	const owner = listing.seller.isCurrentUser;
	const [requests, setRequests] = useState([]);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const [loading, setLoading] = useState(owner);
	const load = useCallback(async () => {
		if (!owner) return;
		setLoading(true);
		try { setRequests(await marketplaceService.getPreviewRequests(listing.reference)); }
		catch (err) { setError(err.message); }
		finally { setLoading(false); }
	}, [listing.reference, owner]);
	useEffect(() => { load(); }, [load]);
	async function action(id, status) {
		setBusy(true); setError('');
		try {
			if (owner) await marketplaceService.decidePreviewRequest(listing.reference, id, status);
			else await marketplaceService.requestPreview(listing.reference);
			await onUpdated();
		} catch (err) { setError(err.message); }
		finally { setBusy(false); }
	}
	return <SectionCard title={owner ? 'Preview requests' : 'Request preview'} description={owner ? 'Approve access for individual buyers. Unlock the protecting Vault before approving. You can revoke future access at any time.' : 'The preview stays hidden until the seller approves your request.'}>
		{error ? <div className="error-banner" role="alert">{error}</div> : null}
		{owner ? loading ? <p>Loading requests…</p> : requests.length ? <ul className="preview-request-list">{requests.map((request) => <li key={request.id}>
			<div><strong>{request.buyerName}</strong><span>Request #{request.id} · {request.status} · {new Date(request.createdAt).toLocaleString()}</span></div>
			<div className="preview-request-actions">
				{request.status !== 'approved' ? <Button size="sm" disabled={busy} onClick={() => action(request.id, 'approved')}>Approve</Button> : <Button size="sm" variant="secondary" disabled={busy} onClick={() => action(request.id, 'revoked')}>Revoke access</Button>}
				{request.status === 'pending' ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => action(request.id, 'denied')}>Decline</Button> : null}
			</div>
		</li>)}</ul> : <p>No preview requests yet.</p> : <>
			{listing.previewRequest ? <p role="status">{messages[listing.previewRequest.status]}</p> : <Button disabled={busy} onClick={() => action()}>{busy ? 'Sending…' : 'Request preview'}</Button>}
		</>}
		<Button size="sm" variant="ghost" disabled={busy} onClick={onUpdated}>Refresh status</Button>
	</SectionCard>;
}
