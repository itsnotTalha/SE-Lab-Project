import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { authService } from '../../services/authService';
import { marketplaceService } from '../../services/marketplaceService';

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
		maxWidth: '560px',
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
		fontSize: '0.95rem',
		color: '#cbd5e1',
	},
	metaLabel: {
		color: '#94a3b8',
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
	error: {
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(220, 38, 38, 0.12)',
		border: '1px solid rgba(220, 38, 38, 0.3)',
		color: '#fca5a5',
	},
	muted: {
		color: '#94a3b8',
	},
};

export default function ListingDetails() {
	const { id } = useParams();
	const navigate = useNavigate();
	const currentUserId = authService.getCurrentUserId();

	const [listing, setListing] = useState(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [price, setPrice] = useState('');
	const [savingPrice, setSavingPrice] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [actionError, setActionError] = useState('');

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

	useEffect(() => {
		loadListing();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	const isOwner = listing && currentUserId != null && listing.sellerId === currentUserId;

	async function handleUpdatePrice(event) {
		event.preventDefault();
		setSavingPrice(true);
		setActionError('');

		try {
			const updated = await marketplaceService.updateListing(id, { price: Number(price) });
			setListing(updated);
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

	return (
		<div style={pageStyles.page}>
			<section style={pageStyles.card}>
				<Link to="/marketplace" style={pageStyles.backLink}>
					&larr; Back to marketplace
				</Link>

				<h1 style={pageStyles.title}>{listing.assetTitle}</h1>
				<span style={pageStyles.badge}>{listing.status}</span>
				<p style={pageStyles.price}>{listing.price.toLocaleString()} Credits</p>

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
					<div style={pageStyles.metaRow}>
						<span style={pageStyles.metaLabel}>Listed on</span>
						<span>{listing.createdAt}</span>
					</div>
				</div>

				{actionError ? <div style={{ ...pageStyles.error, marginTop: '18px' }}>{actionError}</div> : null}

				{isOwner ? (
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
							<button type="button" onClick={handleRemove} style={pageStyles.dangerButton} disabled={removing || listing.status === 'removed'}>
								{listing.status === 'removed' ? 'Listing removed' : removing ? 'Removing...' : 'Remove listing'}
							</button>
						</div>
					</>
				) : (
					<div style={pageStyles.note}>
						Buying and ownership transfer are not available yet — that lands with the Ownership Transfer module.
					</div>
				)}
			</section>
		</div>
	);
}
