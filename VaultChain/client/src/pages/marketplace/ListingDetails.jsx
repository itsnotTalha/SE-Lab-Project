import { ArrowLeft, LockKeyhole, MessageSquare, Save, ShoppingBag, Trash2, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import PreviewRequests from '../../components/marketplace/PreviewRequests';
import MarketplaceThumbnail from '../../components/marketplace/MarketplaceThumbnail';
import PurchaseListingModal from '../../components/marketplace/PurchaseListingModal';
import NegotiationChatModal from '../../components/marketplace/NegotiationChatModal';
import Button from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { marketplaceService } from '../../services/marketplaceService';

const tones = { active: 'success', sold: 'info', cancelled: 'neutral' };

export default function ListingDetails() {
	const { id: reference } = useParams();
	const navigate = useNavigate();
	const [listing, setListing] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [price, setPrice] = useState('');
	const [isAnonymous, setIsAnonymous] = useState(false);
	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [purchaseOpen, setPurchaseOpen] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const data = await marketplaceService.getListing(reference);
			setListing(data);
			setIsAnonymous(data.seller.isAnonymous);
			setPrice(String(data.price));
		} catch (loadError) {
			setError(loadError.message);
		} finally {
			setLoading(false);
		}
	}, [reference]);

	useEffect(() => {
		load();
	}, [load]);

	async function update(event) {
		event.preventDefault();
		setSaving(true);
		setError('');
		try {
			setListing(await marketplaceService.updateListing(reference, { price: Number(price), isAnonymous }));
		} catch (actionError) {
			setError(actionError.message);
		} finally {
			setSaving(false);
		}
	}

	async function remove() {
		setRemoving(true);
		setError('');
		try {
			await marketplaceService.deleteListing(reference);
			navigate('/marketplace', { replace: true });
		} catch (actionError) {
			setError(actionError.message);
			setRemoving(false);
		}
	}

	if (loading) return <LoadingState label="Loading listing" />;
	if (error && !listing) {
		return (
			<>
				<PageHeader title="Listing unavailable" description={error} />
				<Link className="button button--secondary" to="/marketplace">
					<ArrowLeft size={15} /> Back to marketplace
				</Link>
			</>
		);
	}

	const owner = listing.seller.isCurrentUser;
	const sellerDisplayName = listing.seller.isAnonymous
		? 'Anonymous seller'
		: listing.seller.name || listing.seller.reference;

	return (
		<>
			<PageHeader
				eyebrow={listing.reference}
				title={listing.title}
				description={`Offered by ${sellerDisplayName}`}
				action={
					<Link className="button button--secondary" to="/marketplace">
						<ArrowLeft size={15} /> Back
					</Link>
				}
			/>

			{error ? <div className="error-banner">{error}</div> : null}

			<div className="dashboard-grid">
				<SectionCard>
					<MarketplaceThumbnail listing={listing} large />
					<div className="listing-hero">
						<StatusBadge tone={tones[listing.status] || 'neutral'}>{listing.status}</StatusBadge>
						<h2>{Number(listing.price).toLocaleString()}</h2>
						<p>VaultChain Credits</p>
					</div>

					<div className="listing-details">
						<div>
							<span>Asset</span>
							<strong>{listing.asset.reference}</strong>
						</div>
						<div>
							<span>Category</span>
							<strong>{listing.asset.category || 'Digital asset'}</strong>
						</div>
						<div>
							<span>Seller</span>
							<strong className="mono">
								{listing.seller.isAnonymous ? (
									'Anonymous seller'
								) : (
									<Link
										to={`/creator/${listing.seller.reference || listing.seller.name}`}
										style={{ color: 'var(--primary, #41d9ff)', textDecoration: 'underline' }}
									>
										{listing.seller.name || listing.seller.reference}
									</Link>
								)}
							</strong>
						</div>
						<div>
							<span>Created</span>
							<strong>{new Date(listing.createdAt).toLocaleDateString()}</strong>
						</div>
					</div>

					{!listing.seller.isAnonymous && (
						<div style={{ marginTop: '12px' }}>
							<Link
								to={`/creator/${listing.seller.reference || listing.seller.name}`}
								className="button button--secondary button--sm"
								style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
							>
								<User size={14} /> View Creator Profile & Portfolio
							</Link>
						</div>
					)}

					{listing.description ? <p className="listing-description">{listing.description}</p> : null}

					{listing.asset.isLocked ? (
						<div className="info-banner">
							<LockKeyhole size={15} />{' '}
							{owner
								? 'Unlock the protecting Vault to view this asset or approve requests.'
								: 'This asset requires seller approval before you can preview it.'}
						</div>
					) : null}
				</SectionCard>

				<SectionCard
					title={owner ? 'Manage listing' : listing.status === 'active' ? 'Purchase asset' : `Listing ${listing.status}`}
					description={
						owner
							? 'Update the price, seller visibility, or cancel this offer.'
							: listing.status === 'active'
							? 'Payment and ownership transfer happen together.'
							: 'This listing is no longer available for purchase.'
					}
				>
					{owner && listing.status === 'active' ? (
						<div className="form-grid">
							<form className="form-grid" onSubmit={update}>
								<div className="field">
									<label htmlFor="updated-price">Price in VaultChain Credits</label>
									<input
										id="updated-price"
										className="input"
										type="number"
										min="0.01"
										step="0.01"
										value={price}
										onChange={(event) => setPrice(event.target.value)}
									/>
								</div>
								<label className="marketplace-anonymous">
									<input
										type="checkbox"
										checked={isAnonymous}
										onChange={(event) => setIsAnonymous(event.target.checked)}
										disabled={saving}
									/>{' '}
									Post anonymously (hide my name)
								</label>
								<Button type="submit" icon={Save} disabled={saving}>
									{saving ? 'Saving…' : 'Save listing'}
								</Button>
							</form>
							<Button variant="danger" icon={Trash2} disabled={removing} onClick={remove}>
								{removing ? 'Cancelling…' : 'Cancel listing'}
							</Button>
						</div>
					) : !owner && listing.status === 'active' ? (
						<div className="purchase-action" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
							<p>Purchasing transfers the registered asset to your library without changing its file or fingerprints.</p>
							<Button icon={ShoppingBag} onClick={() => setPurchaseOpen(true)}>
								Purchase for {Number(listing.price).toLocaleString()} Credits
							</Button>
							<Button
								variant="secondary"
								icon={MessageSquare}
								onClick={() => setChatOpen(true)}
								style={{ marginTop: '4px' }}
							>
								Encrypted Negotiation Chat
							</Button>
						</div>
					) : (
						<div className="info-banner">This listing is {listing.status} and cannot be purchased.</div>
					)}
				</SectionCard>
			</div>

			{listing.status === 'active' && listing.asset.previewRequiresApproval ? (
				<PreviewRequests listing={listing} onUpdated={load} />
			) : null}

			{/* SlideToConfirm & Security Receipt Modal */}
			{purchaseOpen && <PurchaseListingModal
				listing={listing}
				onClose={() => {
					setPurchaseOpen(false);
					load();
				}}
				onPurchased={() => setListing((current) => ({ ...current, status: 'sold' }))}
			/>}

			{/* Encrypted Negotiation Modal */}
			<NegotiationChatModal
				open={chatOpen}
				listing={listing}
				onClose={() => setChatOpen(false)}
				onAcceptOffer={(offeredPrice) => {
					setChatOpen(false);
					setPurchaseOpen(true);
				}}
			/>
		</>
	);
}
