import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { marketplaceService } from '../../services/marketplaceService';
import { walletService } from '../../services/walletService';

const pageStyles = {
	page: {
		minHeight: '100vh',
		padding: '32px 24px 48px',
		background:
			'radial-gradient(circle at top left, rgba(59, 130, 246, 0.22), transparent 30%), radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 24%), linear-gradient(135deg, #020617 0%, #0f172a 55%, #111827 100%)',
		color: '#e5e7eb',
	},
	container: {
		maxWidth: '1120px',
		margin: '0 auto',
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: '16px',
		marginBottom: '24px',
		flexWrap: 'wrap',
	},
	headline: {
		margin: 0,
		fontSize: '2.35rem',
		fontWeight: 800,
		letterSpacing: '-0.03em',
	},
	subtitle: {
		margin: '10px 0 0',
		color: '#94a3b8',
		maxWidth: '640px',
		lineHeight: 1.6,
	},
	nav: {
		display: 'flex',
		gap: '10px',
		flexWrap: 'wrap',
		alignItems: 'center',
	},
	navLink: {
		padding: '10px 14px',
		borderRadius: '999px',
		background: 'rgba(15, 23, 42, 0.72)',
		border: '1px solid rgba(148, 163, 184, 0.18)',
		color: '#e5e7eb',
		textDecoration: 'none',
		fontWeight: 600,
	},
	balancePill: {
		padding: '10px 14px',
		borderRadius: '999px',
		background: 'rgba(34, 197, 94, 0.14)',
		border: '1px solid rgba(34, 197, 94, 0.32)',
		color: '#4ade80',
		fontWeight: 700,
	},
	card: {
		background: 'rgba(15, 23, 42, 0.82)',
		border: '1px solid rgba(148, 163, 184, 0.16)',
		borderRadius: '22px',
		boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)',
		backdropFilter: 'blur(14px)',
		padding: '24px',
		marginBottom: '20px',
	},
	panelTitle: {
		margin: 0,
		fontSize: '1.15rem',
		fontWeight: 700,
	},
	panelText: {
		marginTop: '8px',
		marginBottom: 0,
		color: '#94a3b8',
		lineHeight: 1.6,
	},
	form: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
		gap: '14px',
		marginTop: '18px',
		alignItems: 'end',
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
	error: {
		gridColumn: '1 / -1',
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(220, 38, 38, 0.12)',
		border: '1px solid rgba(220, 38, 38, 0.3)',
		color: '#fca5a5',
	},
	info: {
		gridColumn: '1 / -1',
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(56, 189, 248, 0.1)',
		border: '1px solid rgba(56, 189, 248, 0.24)',
		color: '#7dd3fc',
		fontSize: '0.9rem',
		lineHeight: 1.5,
	},
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
		gap: '16px',
		marginTop: '18px',
	},
	listingCard: {
		padding: '18px',
		borderRadius: '16px',
		background: 'rgba(2, 6, 23, 0.68)',
		border: '1px solid rgba(148, 163, 184, 0.12)',
		display: 'grid',
		gap: '6px',
		alignContent: 'start',
	},
	listingTitle: {
		margin: 0,
		fontSize: '1.05rem',
		fontWeight: 700,
	},
	listingMeta: {
		margin: 0,
		fontSize: '0.85rem',
		color: '#94a3b8',
	},
	listingPrice: {
		margin: '6px 0 0',
		fontSize: '1.4rem',
		fontWeight: 800,
	},
	badgeRow: {
		display: 'flex',
		gap: '6px',
		flexWrap: 'wrap',
	},
	badge: {
		padding: '4px 10px',
		borderRadius: '999px',
		fontSize: '0.75rem',
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: '0.04em',
		background: 'rgba(34, 197, 94, 0.16)',
		color: '#4ade80',
	},
	mineBadge: {
		padding: '4px 10px',
		borderRadius: '999px',
		fontSize: '0.75rem',
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: '0.04em',
		background: 'rgba(56, 189, 248, 0.16)',
		color: '#7dd3fc',
	},
	soldBadge: {
		padding: '4px 10px',
		borderRadius: '999px',
		fontSize: '0.75rem',
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: '0.04em',
		background: 'rgba(148, 163, 184, 0.16)',
		color: '#cbd5e1',
	},
	viewLink: {
		marginTop: '10px',
		display: 'inline-block',
		padding: '10px 14px',
		borderRadius: '10px',
		border: '1px solid rgba(148, 163, 184, 0.24)',
		color: '#e5e7eb',
		textDecoration: 'none',
		fontWeight: 600,
		textAlign: 'center',
	},
	muted: {
		color: '#94a3b8',
	},
	tabRow: {
		display: 'flex',
		gap: '8px',
		flexWrap: 'wrap',
		marginBottom: '4px',
	},
	tab: {
		padding: '9px 14px',
		borderRadius: '999px',
		border: '1px solid rgba(148, 163, 184, 0.2)',
		background: 'transparent',
		color: '#94a3b8',
		fontWeight: 600,
		cursor: 'pointer',
	},
	activeTab: {
		padding: '9px 14px',
		borderRadius: '999px',
		border: '1px solid rgba(56, 189, 248, 0.4)',
		background: 'rgba(56, 189, 248, 0.14)',
		color: '#e5e7eb',
		fontWeight: 700,
		cursor: 'pointer',
	},
	pagination: {
		display: 'flex',
		gap: '10px',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: '18px',
	},
	table: {
		width: '100%',
		marginTop: '16px',
		borderCollapse: 'collapse',
		fontSize: '0.92rem',
	},
	th: {
		textAlign: 'left',
		padding: '10px 8px',
		color: '#94a3b8',
		fontWeight: 600,
		borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
	},
	td: {
		padding: '10px 8px',
		borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
	},
};

const EMPTY_FILTERS = {
	search: '',
	minPrice: '',
	maxPrice: '',
	category: '',
	listingType: '',
	sort: 'newest',
};

const LISTING_TYPE_LABELS = {
	sale: 'Sale',
	auction: 'Auction',
	fractional: 'Shares',
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
		return 'Ending now';
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

export default function MarketplacePage() {
	const navigate = useNavigate();
	const { logout } = useAuth();
	const currentUserId = authService.getCurrentUserId();

	const [tab, setTab] = useState('browse');

	const [listings, setListings] = useState([]);
	const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
	const [page, setPage] = useState(1);
	const [filters, setFilters] = useState(EMPTY_FILTERS);
	const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');

	const [balance, setBalance] = useState(null);
	const [listableAssets, setListableAssets] = useState([]);
	const [myListings, setMyListings] = useState([]);
	const [trades, setTrades] = useState([]);

	const [assetId, setAssetId] = useState('');
	const [listingType, setListingType] = useState('sale');
	const [price, setPrice] = useState('');
	const [description, setDescription] = useState('');
	const [startingPrice, setStartingPrice] = useState('');
	const [reservePrice, setReservePrice] = useState('');
	const [minBidIncrement, setMinBidIncrement] = useState('');
	const [endsAt, setEndsAt] = useState('');
	const [shareCount, setShareCount] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');

	const [splitAssetId, setSplitAssetId] = useState('');
	const [totalShares, setTotalShares] = useState('100');
	const [splitting, setSplitting] = useState(false);
	const [splitError, setSplitError] = useState('');
	const [splitMessage, setSplitMessage] = useState('');

	const loadListings = useCallback(async () => {
		setLoading(true);
		setLoadError('');

		try {
			const data = await marketplaceService.getListings({ ...appliedFilters, page, limit: 12 });
			setListings(data.listings);
			setPagination(data.pagination);
		} catch (error) {
			setLoadError(error.message);
		} finally {
			setLoading(false);
		}
	}, [appliedFilters, page]);

	const loadSideData = useCallback(async () => {
		// Each of these is optional context for the page, so one failing must
		// not blank out the listings the user came here for.
		const [walletResult, assetsResult, mineResult, tradesResult] = await Promise.allSettled([
			walletService.getWallet(),
			marketplaceService.getListableAssets(),
			marketplaceService.getMyListings(),
			marketplaceService.getTrades(),
		]);

		if (walletResult.status === 'fulfilled') {
			setBalance(walletResult.value.balance);
		}

		if (assetsResult.status === 'fulfilled') {
			setListableAssets(assetsResult.value);
		}

		if (mineResult.status === 'fulfilled') {
			setMyListings(mineResult.value);
		}

		if (tradesResult.status === 'fulfilled') {
			setTrades(tradesResult.value);
		}
	}, []);

	useEffect(() => {
		loadListings();
	}, [loadListings]);

	useEffect(() => {
		loadSideData();
	}, [loadSideData]);

	function handleLogout() {
		logout();
		navigate('/login', { replace: true });
	}

	function handleApplyFilters(event) {
		event.preventDefault();
		setPage(1);
		setAppliedFilters(filters);
	}

	function handleResetFilters() {
		setFilters(EMPTY_FILTERS);
		setAppliedFilters(EMPTY_FILTERS);
		setPage(1);
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setSubmitting(true);
		setSubmitError('');

		try {
			const payload = {
				assetId: Number(assetId),
				listingType,
				description: description.trim() || undefined,
			};

			if (listingType === 'auction') {
				payload.startingPrice = Number(startingPrice);
				payload.reservePrice = reservePrice ? Number(reservePrice) : undefined;
				payload.minBidIncrement = minBidIncrement ? Number(minBidIncrement) : undefined;
				// datetime-local gives local wall-clock time; convert to a real
				// instant so the server and client agree on when it ends.
				payload.endsAt = new Date(endsAt).toISOString();
			} else if (listingType === 'fractional') {
				payload.shareCount = Number(shareCount);
				payload.price = Number(price);
			} else {
				payload.price = Number(price);
			}

			await marketplaceService.createListing(payload);
			setAssetId('');
			setPrice('');
			setDescription('');
			setStartingPrice('');
			setReservePrice('');
			setMinBidIncrement('');
			setEndsAt('');
			setShareCount('');
			await Promise.all([loadListings(), loadSideData()]);
		} catch (error) {
			setSubmitError(error.message);
		} finally {
			setSubmitting(false);
		}
	}

	async function handleSplit(event) {
		event.preventDefault();
		setSplitting(true);
		setSplitError('');
		setSplitMessage('');

		try {
			const result = await marketplaceService.fractionalizeAsset(
				Number(splitAssetId),
				Number(totalShares)
			);
			setSplitMessage(result.message);
			setSplitAssetId('');
			await loadSideData();
		} catch (error) {
			setSplitError(error.message);
		} finally {
			setSplitting(false);
		}
	}

	// A share offer is made by a shareholder, who need not still be the asset's
	// owner of record, so fractional listings draw on a different set of assets
	// than whole-asset listings do.
	const availableAssets =
		listingType === 'fractional'
			? listableAssets.filter((asset) => asset.fractionalized && asset.myShares > 0)
			: listableAssets.filter((asset) => asset.listable);
	const blockedAssets = listableAssets.filter((asset) => !asset.listable);
	const splittableAssets = listableAssets.filter((asset) => asset.canFractionalize);
	const selectedAsset = listableAssets.find((asset) => String(asset.id) === String(assetId));

	return (
		<div style={pageStyles.page}>
			<div style={pageStyles.container}>
				<header style={pageStyles.header}>
					<div>
						<h1 style={pageStyles.headline}>Marketplace</h1>
						<p style={pageStyles.subtitle}>
							Browse verified assets, buy with your wallet balance, or list one of your own. Every purchase
							transfers ownership and records it on the ledger.
						</p>
					</div>
					<nav style={pageStyles.nav}>
						{balance != null ? <span style={pageStyles.balancePill}>{formatCredits(balance)}</span> : null}
						<Link to="/dashboard" style={pageStyles.navLink}>
							Dashboard
						</Link>
						<Link to="/wallet" style={pageStyles.navLink}>
							Wallet
						</Link>
						<button type="button" onClick={handleLogout} style={{ ...pageStyles.navLink, cursor: 'pointer' }}>
							Logout
						</button>
					</nav>
				</header>

				<section style={pageStyles.card}>
					<h2 style={pageStyles.panelTitle}>List an asset</h2>
					<p style={pageStyles.panelText}>
						Sell an asset outright, run an auction for it, or offer a block of shares in an asset you have split.
						Assets that are already listed, or that failed verification, cannot be listed again.
					</p>
					<form onSubmit={handleSubmit} style={pageStyles.form}>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Listing type</span>
							<select
								value={listingType}
								onChange={(event) => {
									setListingType(event.target.value);
									setAssetId('');
								}}
								style={pageStyles.input}
							>
								<option value="sale">Fixed-price sale</option>
								<option value="auction">Auction</option>
								<option value="fractional">Shares in a split asset</option>
							</select>
						</label>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Asset</span>
							<select
								value={assetId}
								onChange={(event) => setAssetId(event.target.value)}
								style={pageStyles.input}
								required
							>
								<option value="">
									{availableAssets.length === 0
										? listingType === 'fractional'
											? 'No split assets with shares you hold'
											: 'No assets available to list'
										: 'Select an asset'}
								</option>
								{availableAssets.map((asset) => (
									<option key={asset.id} value={asset.id}>
										#{asset.id} — {asset.title}
										{listingType === 'fractional' ? ` (you hold ${asset.myShares}/${asset.totalShares})` : ''}
									</option>
								))}
							</select>
						</label>

						{listingType === 'auction' ? (
							<>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Starting price (Credits)</span>
									<input
										type="number"
										min="0.01"
										step="0.01"
										value={startingPrice}
										onChange={(event) => setStartingPrice(event.target.value)}
										style={pageStyles.input}
										placeholder="100"
										required
									/>
								</label>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Reserve price (optional)</span>
									<input
										type="number"
										min="0.01"
										step="0.01"
										value={reservePrice}
										onChange={(event) => setReservePrice(event.target.value)}
										style={pageStyles.input}
										placeholder="Minimum you will accept"
									/>
								</label>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Bid increment (optional)</span>
									<input
										type="number"
										min="0.01"
										step="0.01"
										value={minBidIncrement}
										onChange={(event) => setMinBidIncrement(event.target.value)}
										style={pageStyles.input}
										placeholder="1"
									/>
								</label>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Ends at</span>
									<input
										type="datetime-local"
										value={endsAt}
										onChange={(event) => setEndsAt(event.target.value)}
										style={pageStyles.input}
										required
									/>
								</label>
							</>
						) : listingType === 'fractional' ? (
							<>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Shares to offer</span>
									<input
										type="number"
										min="1"
										step="1"
										max={selectedAsset ? selectedAsset.myShares : undefined}
										value={shareCount}
										onChange={(event) => setShareCount(event.target.value)}
										style={pageStyles.input}
										placeholder="25"
										required
									/>
								</label>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Price per share (Credits)</span>
									<input
										type="number"
										min="0.01"
										step="0.01"
										value={price}
										onChange={(event) => setPrice(event.target.value)}
										style={pageStyles.input}
										placeholder="10"
										required
									/>
								</label>
							</>
						) : (
							<label style={pageStyles.field}>
								<span style={pageStyles.label}>Price (Credits)</span>
								<input
									type="number"
									min="0.01"
									step="0.01"
									value={price}
									onChange={(event) => setPrice(event.target.value)}
									style={pageStyles.input}
									placeholder="1500"
									required
								/>
							</label>
						)}

						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Note for buyers (optional)</span>
							<input
								type="text"
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								style={pageStyles.input}
								placeholder="Signed original print"
							/>
						</label>
						<button type="submit" style={pageStyles.button} disabled={submitting || availableAssets.length === 0}>
							{submitting ? 'Creating...' : 'Create listing'}
						</button>
						{listingType === 'fractional' && shareCount && price ? (
							<div style={pageStyles.info}>
								A buyer takes the whole block: {shareCount} shares for{' '}
								{formatCredits(Number(shareCount) * Number(price))}.
							</div>
						) : null}
						{submitError ? <div style={pageStyles.error}>{submitError}</div> : null}
						{blockedAssets.length > 0 && listingType !== 'fractional' ? (
							<div style={pageStyles.info}>
								Not listable right now:{' '}
								{blockedAssets.map((asset) => `#${asset.id} ${asset.title} (${asset.reason})`).join(', ')}
							</div>
						) : null}
					</form>
				</section>

				<section style={pageStyles.card}>
					<h2 style={pageStyles.panelTitle}>Split an asset into shares</h2>
					<p style={pageStyles.panelText}>
						Divide an asset into shares so it can be co-owned. You keep every share until you offer some for
						sale. While other people hold shares, the asset can no longer be sold whole.
					</p>
					<form onSubmit={handleSplit} style={pageStyles.form}>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Asset</span>
							<select
								value={splitAssetId}
								onChange={(event) => setSplitAssetId(event.target.value)}
								style={pageStyles.input}
								required
							>
								<option value="">
									{splittableAssets.length === 0 ? 'No assets available to split' : 'Select an asset'}
								</option>
								{splittableAssets.map((asset) => (
									<option key={asset.id} value={asset.id}>
										#{asset.id} — {asset.title}
									</option>
								))}
							</select>
						</label>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Total shares</span>
							<input
								type="number"
								min="2"
								max="10000"
								step="1"
								value={totalShares}
								onChange={(event) => setTotalShares(event.target.value)}
								style={pageStyles.input}
								required
							/>
						</label>
						<button
							type="submit"
							style={pageStyles.button}
							disabled={splitting || splittableAssets.length === 0}
						>
							{splitting ? 'Splitting...' : 'Split into shares'}
						</button>
						{splitError ? <div style={pageStyles.error}>{splitError}</div> : null}
						{splitMessage ? <div style={pageStyles.info}>{splitMessage}</div> : null}
					</form>
				</section>

				<section style={pageStyles.card}>
					<div style={pageStyles.tabRow}>
						<button
							type="button"
							style={tab === 'browse' ? pageStyles.activeTab : pageStyles.tab}
							onClick={() => setTab('browse')}
						>
							Browse ({pagination.total})
						</button>
						<button
							type="button"
							style={tab === 'mine' ? pageStyles.activeTab : pageStyles.tab}
							onClick={() => setTab('mine')}
						>
							My listings ({myListings.length})
						</button>
						<button
							type="button"
							style={tab === 'trades' ? pageStyles.activeTab : pageStyles.tab}
							onClick={() => setTab('trades')}
						>
							Trade history ({trades.length})
						</button>
					</div>

					{tab === 'browse' ? (
						<>
							<form onSubmit={handleApplyFilters} style={pageStyles.form}>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Search title</span>
									<input
										type="search"
										value={filters.search}
										onChange={(event) => setFilters({ ...filters, search: event.target.value })}
										style={pageStyles.input}
										placeholder="Sunrise"
									/>
								</label>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Category</span>
									<input
										type="text"
										value={filters.category}
										onChange={(event) => setFilters({ ...filters, category: event.target.value })}
										style={pageStyles.input}
										placeholder="photography"
									/>
								</label>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Min price</span>
									<input
										type="number"
										min="0"
										step="0.01"
										value={filters.minPrice}
										onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })}
										style={pageStyles.input}
									/>
								</label>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Max price</span>
									<input
										type="number"
										min="0"
										step="0.01"
										value={filters.maxPrice}
										onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })}
										style={pageStyles.input}
									/>
								</label>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Listing type</span>
									<select
										value={filters.listingType}
										onChange={(event) => setFilters({ ...filters, listingType: event.target.value })}
										style={pageStyles.input}
									>
										<option value="">All types</option>
										<option value="sale">Fixed-price sales</option>
										<option value="auction">Auctions</option>
										<option value="fractional">Share offers</option>
									</select>
								</label>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Sort by</span>
									<select
										value={filters.sort}
										onChange={(event) => setFilters({ ...filters, sort: event.target.value })}
										style={pageStyles.input}
									>
										<option value="newest">Newest first</option>
										<option value="oldest">Oldest first</option>
										<option value="price_asc">Price: low to high</option>
										<option value="price_desc">Price: high to low</option>
									</select>
								</label>
								<button type="submit" style={pageStyles.button}>
									Apply
								</button>
								<button type="button" onClick={handleResetFilters} style={pageStyles.ghostButton}>
									Reset
								</button>
							</form>

							{loadError ? <div style={{ ...pageStyles.error, marginTop: '14px' }}>{loadError}</div> : null}

							<div style={pageStyles.grid}>
								{loading ? (
									<p style={pageStyles.muted}>Loading...</p>
								) : listings.length === 0 ? (
									<p style={pageStyles.muted}>No listings match this search.</p>
								) : (
									listings.map((listing) => {
										const isMine = listing.sellerId === currentUserId;

										return (
											<div key={listing.id} style={pageStyles.listingCard}>
												<div style={pageStyles.badgeRow}>
													<span style={pageStyles.badge}>{listing.status}</span>
													<span style={pageStyles.mineBadge}>
														{LISTING_TYPE_LABELS[listing.listingType] || listing.listingType}
													</span>
													{isMine ? <span style={pageStyles.soldBadge}>Yours</span> : null}
												</div>
												<h3 style={pageStyles.listingTitle}>{listing.assetTitle}</h3>
												<p style={pageStyles.listingMeta}>Seller: {listing.sellerName}</p>
												{listing.assetCategory ? (
													<p style={pageStyles.listingMeta}>Category: {listing.assetCategory}</p>
												) : null}

												{listing.listingType === 'auction' ? (
													<>
														<p style={pageStyles.listingPrice}>
															{formatCredits(listing.currentBid ?? listing.startingPrice)}
														</p>
														<p style={pageStyles.listingMeta}>
															{listing.currentBid
																? `Current bid — ${listing.bidCount} bid${listing.bidCount === 1 ? '' : 's'}`
																: 'Starting price — no bids yet'}
														</p>
														<p style={pageStyles.listingMeta}>{formatTimeLeft(listing.endsAt)}</p>
													</>
												) : listing.listingType === 'fractional' ? (
													<>
														<p style={pageStyles.listingPrice}>
															{formatCredits(listing.price * listing.shareCount)}
														</p>
														<p style={pageStyles.listingMeta}>
															{listing.shareCount} shares at {formatCredits(listing.price)} each
														</p>
													</>
												) : (
													<p style={pageStyles.listingPrice}>{formatCredits(listing.price)}</p>
												)}

												<Link to={`/marketplace/${listing.id}`} style={pageStyles.viewLink}>
													{isMine
														? 'Manage'
														: listing.listingType === 'auction'
															? 'View and bid'
															: 'View and buy'}
												</Link>
											</div>
										);
									})
								)}
							</div>

							{pagination.totalPages > 1 ? (
								<div style={pageStyles.pagination}>
									<button
										type="button"
										style={pageStyles.ghostButton}
										onClick={() => setPage((current) => Math.max(1, current - 1))}
										disabled={pagination.page <= 1}
									>
										Previous
									</button>
									<span style={pageStyles.muted}>
										Page {pagination.page} of {pagination.totalPages}
									</span>
									<button
										type="button"
										style={pageStyles.ghostButton}
										onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
										disabled={pagination.page >= pagination.totalPages}
									>
										Next
									</button>
								</div>
							) : null}
						</>
					) : null}

					{tab === 'mine' ? (
						myListings.length === 0 ? (
							<p style={{ ...pageStyles.muted, marginTop: '16px' }}>You have not listed anything yet.</p>
						) : (
							<table style={pageStyles.table}>
								<thead>
									<tr>
										<th style={pageStyles.th}>Asset</th>
										<th style={pageStyles.th}>Price</th>
										<th style={pageStyles.th}>Status</th>
										<th style={pageStyles.th}>Buyer</th>
										<th style={pageStyles.th} />
									</tr>
								</thead>
								<tbody>
									{myListings.map((listing) => (
										<tr key={listing.id}>
											<td style={pageStyles.td}>{listing.assetTitle}</td>
											<td style={pageStyles.td}>{formatCredits(listing.price)}</td>
											<td style={pageStyles.td}>
												<span style={listing.status === 'active' ? pageStyles.badge : pageStyles.soldBadge}>
													{listing.status}
												</span>
											</td>
											<td style={pageStyles.td}>{listing.buyerName || '—'}</td>
											<td style={pageStyles.td}>
												<Link to={`/marketplace/${listing.id}`} style={pageStyles.muted}>
													Open
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)
					) : null}

					{tab === 'trades' ? (
						trades.length === 0 ? (
							<p style={{ ...pageStyles.muted, marginTop: '16px' }}>No completed trades yet.</p>
						) : (
							<table style={pageStyles.table}>
								<thead>
									<tr>
										<th style={pageStyles.th}>Asset</th>
										<th style={pageStyles.th}>Role</th>
										<th style={pageStyles.th}>Counterparty</th>
										<th style={pageStyles.th}>Price</th>
										<th style={pageStyles.th}>Sold at</th>
									</tr>
								</thead>
								<tbody>
									{trades.map((trade) => (
										<tr key={trade.id}>
											<td style={pageStyles.td}>
												<Link to={`/marketplace/${trade.id}`} style={{ color: '#7dd3fc' }}>
													{trade.assetTitle}
												</Link>
											</td>
											<td style={pageStyles.td}>{trade.role === 'buyer' ? 'Bought' : 'Sold'}</td>
											<td style={pageStyles.td}>
												{trade.role === 'buyer' ? trade.sellerName : trade.buyerName || '—'}
											</td>
											<td style={pageStyles.td}>{formatCredits(trade.price)}</td>
											<td style={pageStyles.td}>{trade.soldAt || '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						)
					) : null}
				</section>
			</div>
		</div>
	);
}
