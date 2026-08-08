import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { marketplaceService } from '../../services/marketplaceService';

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
		gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
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
	error: {
		gridColumn: '1 / -1',
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(220, 38, 38, 0.12)',
		border: '1px solid rgba(220, 38, 38, 0.3)',
		color: '#fca5a5',
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
	badge: {
		justifySelf: 'start',
		padding: '4px 10px',
		borderRadius: '999px',
		fontSize: '0.75rem',
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: '0.04em',
		background: 'rgba(34, 197, 94, 0.16)',
		color: '#4ade80',
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
};

export default function MarketplacePage() {
	const navigate = useNavigate();
	const { logout } = useAuth();
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [assetId, setAssetId] = useState('');
	const [listingType, setListingType] = useState('sale');
	const [price, setPrice] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');

	async function loadListings() {
		setLoading(true);
		setLoadError('');

		try {
			const data = await marketplaceService.getListings();
			setListings(data);
		} catch (error) {
			setLoadError(error.message);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadListings();
	}, []);

	function handleLogout() {
		logout();
		navigate('/login', { replace: true });
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setSubmitting(true);
		setSubmitError('');

		try {
			await marketplaceService.createListing({ assetId: Number(assetId), listingType, price: Number(price) });
			setAssetId('');
			setPrice('');
			await loadListings();
		} catch (error) {
			setSubmitError(error.message);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div style={pageStyles.page}>
			<div style={pageStyles.container}>
				<header style={pageStyles.header}>
					<div>
						<h1 style={pageStyles.headline}>Marketplace</h1>
						<p style={pageStyles.subtitle}>Browse active listings or list one of your own verified assets for sale.</p>
					</div>
					<nav style={pageStyles.nav}>
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
					<p style={pageStyles.panelText}>Enter the id of an asset you own (from the dashboard upload flow) to list it for sale.</p>
					<form onSubmit={handleSubmit} style={pageStyles.form}>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Asset id</span>
							<input
								type="number"
								value={assetId}
								onChange={(event) => setAssetId(event.target.value)}
								style={pageStyles.input}
								placeholder="e.g. 1"
								required
							/>
						</label>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Listing type</span>
							<select value={listingType} onChange={(event) => setListingType(event.target.value)} style={pageStyles.input}>
								<option value="sale">Sale</option>
								<option value="auction">Auction</option>
								<option value="rent">Rent</option>
							</select>
						</label>
						<label style={pageStyles.field}>
							<span style={pageStyles.label}>Price</span>
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
						<button type="submit" style={pageStyles.button} disabled={submitting}>
							{submitting ? 'Creating...' : 'Create listing'}
						</button>
						{submitError ? <div style={pageStyles.error}>{submitError}</div> : null}
					</form>
				</section>

				<section style={pageStyles.card}>
					<h2 style={pageStyles.panelTitle}>Active listings</h2>
					{loadError ? <div style={{ ...pageStyles.error, marginTop: '14px' }}>{loadError}</div> : null}
					<div style={pageStyles.grid}>
						{loading ? (
							<p style={pageStyles.muted}>Loading...</p>
						) : listings.length === 0 ? (
							<p style={pageStyles.muted}>No active listings yet.</p>
						) : (
							listings.map((listing) => (
								<div key={listing.id} style={pageStyles.listingCard}>
									<span style={pageStyles.badge}>{listing.status}</span>
									<h3 style={pageStyles.listingTitle}>{listing.assetTitle}</h3>
									<p style={pageStyles.listingMeta}>Seller: {listing.sellerName}</p>
									<p style={pageStyles.listingMeta}>Type: {listing.listingType}</p>
									<p style={pageStyles.listingPrice}>{listing.price.toLocaleString()} Credits</p>
									<Link to={`/marketplace/${listing.id}`} style={pageStyles.viewLink}>
										View
									</Link>
								</div>
							))
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
