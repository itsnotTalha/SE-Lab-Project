import { ArrowLeft, CheckCircle2, Clock, Eye, FileText, KeyRound, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import GrantAccessModal from '../../components/marketplace/GrantAccessModal';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { marketplaceService } from '../../services/marketplaceService';

const statusTones = {
	pending: 'warning',
	approved: 'success',
	rejected: 'danger',
};

export default function AccessRequestsPage() {
	const [receivedRequests, setReceivedRequests] = useState([]);
	const [sentRequests, setSentRequests] = useState([]);
	const [activeTab, setActiveTab] = useState('received');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedRequestForGrant, setSelectedRequestForGrant] = useState(null);
	const [actionLoadingId, setActionLoadingId] = useState(null);

	const loadData = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const [received, sent] = await Promise.all([
				marketplaceService.getReceivedAccessRequests(),
				marketplaceService.getSentAccessRequests(),
			]);
			setReceivedRequests(received || []);
			setSentRequests(sent || []);
		} catch (err) {
			setError(err.message || 'Failed to load access requests');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	async function handleReject(requestId) {
		if (!window.confirm('Are you sure you want to reject this access request?')) return;
		setActionLoadingId(requestId);
		try {
			await marketplaceService.rejectAccessRequest(requestId);
			await loadData();
		} catch (err) {
			alert(err.message || 'Failed to reject access request');
		} finally {
			setActionLoadingId(null);
		}
	}

	async function handleRevoke(grantId) {
		if (!window.confirm('Are you sure you want to revoke this access grant? The buyer will no longer be able to view or download protected pages.')) return;
		setActionLoadingId(`revoke-${grantId}`);
		try {
			await marketplaceService.revokeAccessGrant(grantId);
			await loadData();
		} catch (err) {
			alert(err.message || 'Failed to revoke access grant');
		} finally {
			setActionLoadingId(null);
		}
	}

	if (loading) return <LoadingState label="Loading access requests" />;

	const listToDisplay = activeTab === 'received' ? receivedRequests : sentRequests;

	return (
		<>
			<PageHeader
				title="Document Access Requests"
				description="Manage and review granular access permissions for listed documents."
				action={
					<Link className="button button--secondary" to="/marketplace">
						<ArrowLeft size={15} /> Back to Marketplace
					</Link>
				}
			/>

			{error ? <div className="error-banner" style={{ marginBottom: '1.5rem' }}>{error}</div> : null}

			<div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
				<button
					type="button"
					className={`button ${activeTab === 'received' ? 'button--primary' : 'button--secondary'}`}
					onClick={() => setActiveTab('received')}
				>
					Received Requests ({receivedRequests.length})
				</button>
				<button
					type="button"
					className={`button ${activeTab === 'sent' ? 'button--primary' : 'button--secondary'}`}
					onClick={() => setActiveTab('sent')}
				>
					Sent Requests ({sentRequests.length})
				</button>
			</div>

			<SectionCard
				title={activeTab === 'received' ? 'Requests from Buyers' : 'My Sent Requests'}
				description={
					activeTab === 'received'
						? 'Review and approve page-level access or download permissions for your listings.'
						: 'Track access requests you sent to other sellers.'
				}
			>
				{listToDisplay.length === 0 ? (
					<EmptyState
						title={activeTab === 'received' ? 'No access requests received' : 'No requests sent'}
						description={
							activeTab === 'received'
								? 'When buyers request access to your password-protected documents, they will appear here.'
								: 'You have not submitted any access requests yet.'
						}
					/>
				) : (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
						{listToDisplay.map((req) => (
							<div
								key={req.id}
								style={{
									border: '1px solid var(--border-color, #e2e8f0)',
									borderRadius: '8px',
									padding: '1.25rem',
									background: 'var(--surface-color, #ffffff)',
									display: 'flex',
									flexDirection: 'column',
									gap: '0.85rem',
								}}
							>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
									<div>
										<div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
											<strong style={{ fontSize: '1.05rem' }}>{req.listingTitle || 'Document Asset'}</strong>
											<StatusBadge tone={statusTones[req.status] || 'neutral'}>
												{req.status}
											</StatusBadge>
										</div>
										<div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.25rem' }}>
											Marketplace ID: <code className="mono">{req.listingReference}</code>
										</div>
									</div>
									<div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
										<Clock size={13} /> {new Date(req.createdAt).toLocaleString()}
									</div>
								</div>

								<div style={{ background: 'var(--surface-subtle, #f8fafc)', padding: '0.85rem', borderRadius: '6px', fontSize: '0.875rem' }}>
									{activeTab === 'received' ? (
										<div>
											<strong>Buyer:</strong> {req.requesterName} ({req.requesterEmail})
										</div>
									) : (
										<div>
											<strong>Seller:</strong> {req.ownerName || 'Document Owner'}
										</div>
									)}
									{req.message ? (
										<div style={{ marginTop: '0.4rem', color: 'var(--text-secondary, #475569)' }}>
											<strong>Message:</strong> "{req.message}"
										</div>
									) : null}
								</div>

								{req.grant ? (
									<div style={{ padding: '0.75rem', borderRadius: '6px', border: '1px dashed var(--border-color, #cbd5e1)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
										<div>
											<strong>Active Grant:</strong> Scope: <span style={{ textTransform: 'capitalize' }}>{req.grant.accessType}</span>
											{req.grant.pages && req.grant.pages.length > 0 ? ` (Pages: ${req.grant.pages.join(', ')})` : ''}
											{' • '}
											{req.grant.canView ? '✓ View' : '✗ No View'}
											{' • '}
											{req.grant.canDownload ? '✓ Download' : '✗ No Download'}
											{req.grant.revokedAt ? (
												<span style={{ color: 'var(--danger-color, #ef4444)', marginLeft: '0.5rem', fontWeight: 'bold' }}>
													[Revoked {new Date(req.grant.revokedAt).toLocaleDateString()}]
												</span>
											) : null}
										</div>

										{activeTab === 'received' && !req.grant.revokedAt ? (
											<Button
												size="sm"
												variant="danger"
												disabled={actionLoadingId === `revoke-${req.grant.id}`}
												onClick={() => handleRevoke(req.grant.id)}
											>
												Revoke Access
											</Button>
										) : null}
									</div>
								) : null}

								{activeTab === 'received' && req.status === 'pending' ? (
									<div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
										<Button
											size="sm"
											variant="secondary"
											icon={XCircle}
											disabled={actionLoadingId === req.id}
											onClick={() => handleReject(req.id)}
										>
											Reject
										</Button>
										<Button
											size="sm"
											icon={ShieldCheck}
											disabled={actionLoadingId === req.id}
											onClick={() => setSelectedRequestForGrant(req)}
										>
											Grant Access
										</Button>
									</div>
								) : null}
							</div>
						))}
					</div>
				)}
			</SectionCard>

			<GrantAccessModal
				request={selectedRequestForGrant}
				onClose={() => setSelectedRequestForGrant(null)}
				onGranted={() => {
					loadData();
				}}
			/>
		</>
	);
}
