import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { authService } from '../../services/authService';
import { marketplaceService } from '../../services/marketplaceService';
import { walletService } from '../../services/walletService';

const pageStyles = {
	page: {
		minHeight: '100vh',
		display: 'flex',
		alignItems: 'flex-start',
		justifyContent: 'center',
		padding: '48px 24px',
		background:
			'radial-gradient(circle at top left, rgba(59, 130, 246, 0.22), transparent 30%), radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 24%), linear-gradient(135deg, #020617 0%, #0f172a 55%, #111827 100%)',
		color: '#e5e7eb',
	},
	card: {
		width: '100%',
		maxWidth: '640px',
		padding: '32px',
		borderRadius: '22px',
		background: 'rgba(15, 23, 42, 0.82)',
		border: '1px solid rgba(148, 163, 184, 0.16)',
		boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)',
	},
	backLink: {
		display: 'inline-block',
		marginBottom: '18px',
		color: '#94a3b8',
		textDecoration: 'none',
		fontWeight: 600,
	},
	title: {
		margin: 0,
		fontSize: '1.9rem',
		fontWeight: 800,
	},
	badge: {
		display: 'inline-block',
		marginTop: '10px',
		padding: '4px 10px',
		borderRadius: '999px',
		fontSize: '0.75rem',
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: '0.04em',
		background: 'rgba(34, 197, 94, 0.16)',
		color: '#4ade80',
	},
	neutralBadge: {
		display: 'inline-block',
		marginTop: '10px',
		padding: '4px 10px',
		borderRadius: '999px',
		fontSize: '0.75rem',
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: '0.04em',
		background: 'rgba(148, 163, 184, 0.16)',
		color: '#cbd5e1',
	},
	price: {
		margin: '18px 0 0',
		fontSize: '2.4rem',
		fontWeight: 800,
	},
	meta: {
		margin: '18px 0 0',
		display: 'grid',
		gap: '10px',
	},
	metaRow: {
		display: 'flex',
		justifyContent: 'space-between',
		gap: '16px',
		fontSize: '0.95rem',
		color: '#cbd5e1',
	},
	metaLabel: {
		color: '#94a3b8',
		flexShrink: 0,
	},
	monospace: {
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
		fontSize: '0.8rem',
		wordBreak: 'break-all',
		textAlign: 'right',
	},
	section: {
		marginTop: '24px',
		paddingTop: '18px',
		borderTop: '1px solid rgba(148, 163, 184, 0.16)',
	},
	sectionTitle: {
		margin: '0 0 12px',
		fontSize: '1.05rem',
		fontWeight: 700,
	},
	timeline: {
		listStyle: 'none',
		margin: 0,
		padding: 0,
		display: 'grid',
		gap: '10px',
	},
	timelineItem: {
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(2, 6, 23, 0.6)',
		border: '1px solid rgba(148, 163, 184, 0.12)',
		fontSize: '0.9rem',
	},
	timelineMeta: {
		color: '#94a3b8',
		fontSize: '0.82rem',
		marginTop: '4px',
	},
	actions: {
		marginTop: '24px',
		display: 'grid',
		gap: '12px',
	},
	form: {
		display: 'grid',
		gap: '12px',
		marginTop: '18px',
		paddingTop: '18px',
		borderTop: '1px solid rgba(148, 163, 184, 0.16)',
	},
	field: {
		display: 'grid',
		gap: '8px',
	},
	label: {
		fontSize: '0.92rem',
		fontWeight: 600,
		color: '#cbd5e1',
	},
	input: {
		width: '100%',
		padding: '13px 14px',
		borderRadius: '12px',
		border: '1px solid rgba(148, 163, 184, 0.18)',
		background: '#020617',
		color: '#e5e7eb',
		fontSize: '0.98rem',
	},
	button: {
		padding: '13px 16px',
		border: 'none',
		borderRadius: '12px',
		background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
		color: '#fff',
		fontSize: '0.98rem',
		fontWeight: 700,
		cursor: 'pointer',
	},
	buyButton: {
		padding: '15px 16px',
		border: 'none',
		borderRadius: '12px',
		background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
		color: '#fff',
		fontSize: '1.02rem',
		fontWeight: 800,
		cursor: 'pointer',
	},
	ghostButton: {
		padding: '13px 16px',
		borderRadius: '12px',
		border: '1px solid rgba(148, 163, 184, 0.24)',
		background: 'transparent',
		color: '#e5e7eb',
		fontSize: '0.98rem',
		fontWeight: 600,
		cursor: 'pointer',
	},
	dangerButton: {
		padding: '13px 16px',
		borderRadius: '12px',
		border: '1px solid rgba(220, 38, 38, 0.4)',
		background: 'rgba(220, 38, 38, 0.12)',
		color: '#fca5a5',
		fontSize: '0.98rem',
		fontWeight: 700,
		cursor: 'pointer',
	},
	note: {
		marginTop: '18px',
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(56, 189, 248, 0.1)',
		border: '1px solid rgba(56, 189, 248, 0.24)',
		color: '#7dd3fc',
		fontSize: '0.88rem',
		lineHeight: 1.5,
	},
	confirmPanel: {
		marginTop: '18px',
		padding: '16px',
		borderRadius: '14px',
		background: 'rgba(34, 197, 94, 0.08)',
		border: '1px solid rgba(34, 197, 94, 0.28)',
		display: 'grid',
		gap: '10px',
	},
	success: {
		marginTop: '18px',
		padding: '14px',
		borderRadius: '12px',
		background: 'rgba(34, 197, 94, 0.12)',
		border: '1px solid rgba(34, 197, 94, 0.32)',
		color: '#86efac',
		lineHeight: 1.6,
	},
	error: {
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(220, 38, 38, 0.12)',
		border: '1px solid rgba(220, 38, 38, 0.3)',
		color: '#fca5a5',
	},
	warning: {
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(234, 179, 8, 0.1)',
		border: '1px solid rgba(234, 179, 8, 0.3)',
		color: '#fde047',
		fontSize: '0.9rem',
		lineHeight: 1.5,
	},
	muted: {
		color: '#94a3b8',
	},
};

const VERIFICATION_LABELS = {
	original: { text: 'Verified original', style: { color: '#4ade80' } },
	duplicate: { text: 'Flagged as a duplicate', style: { color: '#fca5a5' } },
	modified_copy: { text: 'Flagged as a modified copy', style: { color: '#fca5a5' } },
	modified: { text: 'Flagged as modified', style: { color: '#fca5a5' } },
};

function formatCredits(amount) {
	return `${Number(amount).toLocaleString()} Credits`;
}

/** SQLite timestamps are UTC but carry no zone marker, so one is added. */
function parseTimestamp(value) {
	if (!value) {
		return null;
	}

	return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
}

function formatTimeLeft(endsAt) {
	const end = parseTimestamp(endsAt);

	if (!end) {
		return null;
	}

	const remaining = end.getTime() - Date.now();

	if (remaining <= 0) {
		return 'Ended';
	}

	const minutes = Math.floor(remaining / 60000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days}d ${hours % 24}h left`;
	}

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m left`;
	}

	return `${Math.max(1, minutes)}m left`;
}

function describeTransfer(entry) {
	if (entry.transferType === 'upload') {
		return `${entry.newOwnerName || `User ${entry.newOwner}`} uploaded this asset`;
	}

	if (entry.transferType === 'sale') {
		return `Sold by ${entry.previousOwnerName || `User ${entry.previousOwner}`} to ${
			entry.newOwnerName || `User ${entry.newOwner}`
		}`;
	}

	return `Transferred to ${entry.newOwnerName || `User ${entry.newOwner}`}`;
}

export default function ListingDetails() {
	const { id } = useParams();
	const navigate = useNavigate();
	const currentUserId = authService.getCurrentUserId();

	const [listing, setListing] = useState(null);
	const [balance, setBalance] = useState(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [price, setPrice] = useState('');
	const [savingPrice, setSavingPrice] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [confirmingPurchase, setConfirmingPurchase] = useState(false);
	const [buying, setBuying] = useState(false);
	const [purchase, setPurchase] = useState(null);
	const [actionError, setActionError] = useState('');
	const [bidAmount, setBidAmount] = useState('');
	const [bidding, setBidding] = useState(false);
	const [bidMessage, setBidMessage] = useState('');

	async function loadListing() {
		setLoading(true);
		setLoadError('');

		try {
			const data = await marketplaceService.getListingById(id);
			setListing(data);
			setPrice(String(data.price));
		} catch (error) {
			setLoadError(error.message);
		} finally {
			setLoading(false);
		}
	}

	async function loadBalance() {
		try {
			const wallet = await walletService.getWallet();
			setBalance(wallet.balance);
		} catch {
			// The wallet is extra context here; the listing still renders without it.
			setBalance(null);
		}
	}

	useEffect(() => {
		loadListing();
		loadBalance();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	const isOwner = listing && currentUserId != null && listing.sellerId === currentUserId;
	const isActive = listing && listing.status === 'active';
	const isAuction = listing && listing.listingType === 'auction';
	const isFractional = listing && listing.listingType === 'fractional';
	// A fractional listing prices one share, so the amount actually charged is
	// the whole block.
	const totalPrice = listing ? (isFractional ? listing.price * listing.shareCount : listing.price) : 0;
	const canAfford = balance == null || (listing && balance >= totalPrice);

	async function handleUpdatePrice(event) {
		event.preventDefault();
		setSavingPrice(true);
		setActionError('');

		try {
			await marketplaceService.updateListing(id, { price: Number(price) });
			await loadListing();
		} catch (error) {
			setActionError(error.message);
		} finally {
			setSavingPrice(false);
		}
	}

	async function handleRemove() {
		setRemoving(true);
		setActionError('');

		try {
			await marketplaceService.deleteListing(id);
			navigate('/marketplace', { replace: true });
		} catch (error) {
			setActionError(error.message);
			setRemoving(false);
		}
	}

	async function handleBid(event) {
		event.preventDefault();
		setBidding(true);
		setActionError('');
		setBidMessage('');

		try {
			const result = await marketplaceService.placeBid(id, Number(bidAmount));
			setBidMessage(result.message);
			setBalance(result.wallet.balance);
			setBidAmount('');
			await loadListing();
		} catch (error) {
			setActionError(error.message);
		} finally {
			setBidding(false);
		}
	}

	async function handleCancelAuction() {
		setActionError('');

		try {
			await marketplaceService.cancelAuction(id);
			await loadListing();
		} catch (error) {
			setActionError(error.message);
		}
	}

	async function handleBuy() {
		setBuying(true);
		setActionError('');

		try {
			const result = await marketplaceService.buyListing(id);
			setPurchase(result);
			setConfirmingPurchase(false);
			setBalance(result.wallet.balance);
			await loadListing();
		} catch (error) {
			setActionError(error.message);
			setConfirmingPurchase(false);
		} finally {
			setBuying(false);
		}
	}

	if (loading) {
		return (
			<div style={pageStyles.page}>
				<section style={pageStyles.card}>
					<p style={pageStyles.muted}>Loading listing...</p>
				</section>
			</div>
		);
	}

	if (loadError || !listing) {
		return (
			<div style={pageStyles.page}>
				<section style={pageStyles.card}>
					<Link to="/marketplace" style={pageStyles.backLink}>
						&larr; Back to marketplace
					</Link>
					<div style={pageStyles.error}>{loadError || 'Listing not found'}</div>
				</section>
			</div>
		);
	}

	const verificationStatus = listing.verification?.status
		? String(listing.verification.status).toLowerCase()
		: null;
	const verificationLabel = verificationStatus ? VERIFICATION_LABELS[verificationStatus] : null;

	return (
		<div style={pageStyles.page}>
			<section style={pageStyles.card}>
				<Link to="/marketplace" style={pageStyles.backLink}>
					&larr; Back to marketplace
				</Link>

				<h1 style={pageStyles.title}>{listing.assetTitle}</h1>
				<span style={isActive ? pageStyles.badge : pageStyles.neutralBadge}>{listing.status}</span>
				<span style={{ ...pageStyles.neutralBadge, marginLeft: '8px' }}>{listing.listingType}</span>

				{isAuction ? (
					<>
						<p style={pageStyles.price}>
							{formatCredits(listing.currentBid ?? listing.startingPrice)}
						</p>
						<p style={pageStyles.muted}>
							{listing.currentBid
								? `Highest bid of ${listing.bidCount} bid${listing.bidCount === 1 ? '' : 's'}`
								: 'Starting price — no bids yet'}
							{isActive ? ` — ${formatTimeLeft(listing.endsAt)}` : ''}
						</p>
					</>
				) : isFractional ? (
					<>
						<p style={pageStyles.price}>{formatCredits(totalPrice)}</p>
						<p style={pageStyles.muted}>
							{listing.shareCount} shares at {formatCredits(listing.price)} each
							{listing.fractional ? ` — ${listing.shareCount} of ${listing.fractional.totalShares} total` : ''}
						</p>
					</>
				) : (
					<p style={pageStyles.price}>{formatCredits(listing.price)}</p>
				)}

				{listing.description ? <p style={pageStyles.muted}>{listing.description}</p> : null}

				<div style={pageStyles.meta}>
					<div style={pageStyles.metaRow}>
						<span style={pageStyles.metaLabel}>Seller</span>
						<span>{listing.sellerName}</span>
					</div>
					<div style={pageStyles.metaRow}>
						<span style={pageStyles.metaLabel}>Listing type</span>
						<span>{listing.listingType}</span>
					</div>
					<div style={pageStyles.metaRow}>
						<span style={pageStyles.metaLabel}>Asset id</span>
						<span>{listing.assetId}</span>
					</div>
					{listing.assetCategory ? (
						<div style={pageStyles.metaRow}>
							<span style={pageStyles.metaLabel}>Category</span>
							<span>{listing.assetCategory}</span>
						</div>
					) : null}
					<div style={pageStyles.metaRow}>
						<span style={pageStyles.metaLabel}>Listed on</span>
						<span>{listing.createdAt}</span>
					</div>
					{listing.status === 'sold' ? (
						<div style={pageStyles.metaRow}>
							<span style={pageStyles.metaLabel}>Bought by</span>
							<span>{listing.buyerName || `User ${listing.buyerId}`}</span>
						</div>
					) : null}
				</div>

				{isAuction ? (
					<div style={pageStyles.section}>
						<h2 style={pageStyles.sectionTitle}>Bids</h2>
						<div style={pageStyles.meta}>
							<div style={pageStyles.metaRow}>
								<span style={pageStyles.metaLabel}>Starting price</span>
								<span>{formatCredits(listing.startingPrice)}</span>
							</div>
							{listing.reservePrice ? (
								<div style={pageStyles.metaRow}>
									<span style={pageStyles.metaLabel}>Reserve</span>
									<span>
										{formatCredits(listing.reservePrice)}
										{listing.currentBid >= listing.reservePrice ? ' (met)' : ' (not yet met)'}
									</span>
								</div>
							) : null}
							<div style={pageStyles.metaRow}>
								<span style={pageStyles.metaLabel}>Ends at</span>
								<span>{parseTimestamp(listing.endsAt)?.toLocaleString() || '—'}</span>
							</div>
						</div>

						{listing.bids?.length ? (
							<ul style={{ ...pageStyles.timeline, marginTop: '14px' }}>
								{listing.bids.map((bid) => (
									<li key={bid.id} style={pageStyles.timelineItem}>
										<div>
											{formatCredits(bid.amount)} by{' '}
											{bid.bidderId === currentUserId ? 'you' : bid.bidderName}
										</div>
										<div style={pageStyles.timelineMeta}>
											{bid.status === 'held'
												? 'Leading — funds held'
												: bid.status === 'won'
													? 'Won the auction'
													: bid.status === 'outbid'
														? 'Outbid — funds returned'
														: 'Returned'}
											{' — '}
											{bid.createdAt}
										</div>
									</li>
								))}
							</ul>
						) : (
							<p style={{ ...pageStyles.muted, marginTop: '12px' }}>No bids have been placed yet.</p>
						)}
					</div>
				) : null}

				{listing.fractional ? (
					<div style={pageStyles.section}>
						<h2 style={pageStyles.sectionTitle}>Share register</h2>
						<p style={pageStyles.timelineMeta}>
							This asset is split into {listing.fractional.totalShares} shares.
						</p>
						<ul style={{ ...pageStyles.timeline, marginTop: '12px' }}>
							{listing.holdings.map((holding) => (
								<li key={holding.userId} style={pageStyles.timelineItem}>
									<div>
										{holding.userId === currentUserId ? 'You' : holding.userName} — {holding.shares}{' '}
										share{holding.shares === 1 ? '' : 's'} ({holding.percentage}%)
									</div>
								</li>
							))}
						</ul>
					</div>
				) : null}

				<div style={pageStyles.section}>
					<h2 style={pageStyles.sectionTitle}>Authenticity</h2>
					<div style={pageStyles.meta}>
						<div style={pageStyles.metaRow}>
							<span style={pageStyles.metaLabel}>Verification</span>
							<span style={verificationLabel ? verificationLabel.style : pageStyles.muted}>
								{verificationLabel
									? verificationLabel.text
									: listing.verification?.status || 'Not verified yet'}
							</span>
						</div>
						{listing.verification?.createdAt ? (
							<div style={pageStyles.metaRow}>
								<span style={pageStyles.metaLabel}>Checked on</span>
								<span>{listing.verification.createdAt}</span>
							</div>
						) : null}
						{listing.hashes?.sha256Hash ? (
							<div style={pageStyles.metaRow}>
								<span style={pageStyles.metaLabel}>SHA-256</span>
								<span style={pageStyles.monospace}>{listing.hashes.sha256Hash}</span>
							</div>
						) : null}
						{listing.hashes?.phash ? (
							<div style={pageStyles.metaRow}>
								<span style={pageStyles.metaLabel}>pHash</span>
								<span style={pageStyles.monospace}>{listing.hashes.phash}</span>
							</div>
						) : null}
						{listing.metadata?.width && listing.metadata?.height ? (
							<div style={pageStyles.metaRow}>
								<span style={pageStyles.metaLabel}>Dimensions</span>
								<span>
									{listing.metadata.width} x {listing.metadata.height}
								</span>
							</div>
						) : null}
						{listing.metadata?.camera ? (
							<div style={pageStyles.metaRow}>
								<span style={pageStyles.metaLabel}>Camera</span>
								<span>{listing.metadata.camera}</span>
							</div>
						) : null}
						{listing.metadata?.createdDate ? (
							<div style={pageStyles.metaRow}>
								<span style={pageStyles.metaLabel}>Captured</span>
								<span>{listing.metadata.createdDate}</span>
							</div>
						) : null}
					</div>
					{!verificationStatus ? (
						<div style={{ ...pageStyles.warning, marginTop: '12px' }}>
							This asset has not been through verification yet. Its hashes are recorded, but no verification
							report has been produced.
						</div>
					) : null}
				</div>

				<div style={pageStyles.section}>
					<h2 style={pageStyles.sectionTitle}>Ownership history</h2>
					{listing.ownershipHistory?.length ? (
						<ul style={pageStyles.timeline}>
							{listing.ownershipHistory.map((entry) => (
								<li key={entry.id} style={pageStyles.timelineItem}>
									<div>{describeTransfer(entry)}</div>
									<div style={pageStyles.timelineMeta}>
										{entry.transferredAt}
										{entry.blockchainBlockId ? ` — ledger block #${entry.blockchainBlockId}` : ''}
									</div>
								</li>
							))}
						</ul>
					) : (
						<p style={pageStyles.muted}>No ownership records for this asset yet.</p>
					)}
					{listing.blockchain?.length ? (
						<p style={{ ...pageStyles.timelineMeta, marginTop: '12px' }}>
							{listing.blockchain.length} ledger block{listing.blockchain.length === 1 ? '' : 's'} recorded,
							latest hash {listing.blockchain[listing.blockchain.length - 1].currentHash.slice(0, 16)}...
						</p>
					) : null}
				</div>

				{actionError ? <div style={{ ...pageStyles.error, marginTop: '18px' }}>{actionError}</div> : null}

				{purchase ? (
					<div style={pageStyles.success}>
						<strong>Purchase complete.</strong>{' '}
						{purchase.shareCount
							? `You now hold ${purchase.shareCount} shares of "${purchase.listing.assetTitle}"`
							: `You now own "${purchase.listing.assetTitle}"`}{' '}
						for {formatCredits(purchase.price)}. Your balance is {formatCredits(purchase.wallet.balance)}, and
						the transfer is recorded in ledger block #{purchase.block.id}.
						{purchase.consolidated ? ' You now hold every share, so the asset is whole again.' : ''}
					</div>
				) : null}

				{bidMessage ? <div style={pageStyles.success}>{bidMessage}</div> : null}

				{isOwner ? (
					<>
						{isActive && isAuction ? (
							<div style={pageStyles.actions}>
								<div style={pageStyles.note}>
									This is your auction. It settles automatically when it ends, paying you the winning bid.
									An auction with live bids cannot be changed or cancelled.
								</div>
								{listing.bidCount === 0 ? (
									<button type="button" onClick={handleCancelAuction} style={pageStyles.dangerButton}>
										Cancel auction
									</button>
								) : null}
							</div>
						) : isActive ? (
							<>
								<form onSubmit={handleUpdatePrice} style={pageStyles.form}>
									<label style={pageStyles.field}>
										<span style={pageStyles.label}>Update price</span>
										<input
											type="number"
											min="0.01"
											step="0.01"
											value={price}
											onChange={(event) => setPrice(event.target.value)}
											style={pageStyles.input}
										/>
									</label>
									<button type="submit" style={pageStyles.button} disabled={savingPrice}>
										{savingPrice ? 'Saving...' : 'Save price'}
									</button>
								</form>
								<div style={pageStyles.actions}>
									<button
										type="button"
										onClick={handleRemove}
										style={pageStyles.dangerButton}
										disabled={removing}
									>
										{removing ? 'Removing...' : 'Remove listing'}
									</button>
								</div>
							</>
						) : (
							<div style={pageStyles.note}>
								This is your listing and it is {listing.status}. A {listing.status} listing can no longer be
								changed. To sell the asset again, create a new listing from the marketplace page.
							</div>
						)}
					</>
				) : !isActive ? (
					<div style={pageStyles.note}>
						This listing is {listing.status} and is no longer available to buy.
					</div>
				) : isAuction ? (
					<form onSubmit={handleBid} style={pageStyles.form}>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>
								Your bid — at least {formatCredits(listing.minimumBid ?? listing.startingPrice)}
							</span>
							<input
								type="number"
								min={listing.minimumBid ?? listing.startingPrice}
								step="0.01"
								value={bidAmount}
								onChange={(event) => setBidAmount(event.target.value)}
								style={pageStyles.input}
								placeholder={String(listing.minimumBid ?? listing.startingPrice)}
								required
							/>
						</label>
						<p style={{ ...pageStyles.muted, margin: 0, fontSize: '0.88rem' }}>
							Placing a bid holds the amount in your wallet so it is committed to this auction. If someone
							outbids you, it is returned immediately.
						</p>
						<button type="submit" style={pageStyles.buyButton} disabled={bidding}>
							{bidding ? 'Placing bid...' : 'Place bid'}
						</button>
						{balance != null ? (
							<p style={{ ...pageStyles.muted, margin: 0, fontSize: '0.88rem' }}>
								Your available balance is {formatCredits(balance)}.
							</p>
						) : null}
					</form>
				) : confirmingPurchase ? (
					<div style={pageStyles.confirmPanel}>
						<strong>Confirm your purchase</strong>
						{isFractional ? (
							<div style={pageStyles.metaRow}>
								<span style={pageStyles.metaLabel}>Shares</span>
								<span>
									{listing.shareCount} at {formatCredits(listing.price)} each
								</span>
							</div>
						) : null}
						<div style={pageStyles.metaRow}>
							<span style={pageStyles.metaLabel}>Total</span>
							<span>{formatCredits(totalPrice)}</span>
						</div>
						{balance != null ? (
							<div style={pageStyles.metaRow}>
								<span style={pageStyles.metaLabel}>Balance after purchase</span>
								<span>{formatCredits(balance - totalPrice)}</span>
							</div>
						) : null}
						<p style={{ ...pageStyles.muted, margin: 0, fontSize: '0.88rem' }}>
							{isFractional
								? 'Your wallet will be charged and the shares will be transferred to you immediately.'
								: 'Your wallet will be charged and ownership of this asset will transfer to you immediately.'}
						</p>
						<button type="button" onClick={handleBuy} style={pageStyles.buyButton} disabled={buying}>
							{buying ? 'Completing purchase...' : `Pay ${formatCredits(totalPrice)}`}
						</button>
						<button
							type="button"
							onClick={() => setConfirmingPurchase(false)}
							style={pageStyles.ghostButton}
							disabled={buying}
						>
							Cancel
						</button>
					</div>
				) : (
					<div style={pageStyles.actions}>
						<button
							type="button"
							onClick={() => setConfirmingPurchase(true)}
							style={pageStyles.buyButton}
							disabled={!canAfford}
						>
							{isFractional
								? `Buy ${listing.shareCount} shares for ${formatCredits(totalPrice)}`
								: `Buy for ${formatCredits(totalPrice)}`}
						</button>
						{!canAfford ? (
							<div style={pageStyles.warning}>
								Your balance is {formatCredits(balance)}, which is not enough for this listing.{' '}
								<Link to="/wallet" style={{ color: '#fde047', fontWeight: 700 }}>
									Add funds in your wallet
								</Link>
								.
							</div>
						) : null}
					</div>
				)}
			</section>
		</div>
	);
}
