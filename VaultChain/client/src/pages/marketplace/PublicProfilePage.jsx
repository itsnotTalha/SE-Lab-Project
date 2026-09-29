import { ArrowLeft, CheckCircle2, Heart, Share2, Shield, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import MarketplaceThumbnail from '../../components/marketplace/MarketplaceThumbnail';
import { marketplaceService } from '../../services/marketplaceService';
import '../../styles/public-profile.css';

export default function PublicProfilePage() {
	const { sellerRef } = useParams();
	const [loading, setLoading] = useState(true);
	const [listings, setListings] = useState([]);
	const [tipped, setTipped] = useState(false);

	useEffect(() => {
		async function fetchCreatorListings() {
			try {
				const all = await marketplaceService.getListings();
				const filtered = all.filter(
					(item) => item.seller?.reference === sellerRef || item.seller?.name === sellerRef
				);
				setListings(filtered);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		}
		fetchCreatorListings();
	}, [sellerRef]);

	if (loading) return <LoadingState label="Loading creator profile..." />;

	const displayName = sellerRef?.startsWith('USR-') ? `Creator ${sellerRef.slice(-6)}` : sellerRef || 'Vault Creator';

	return (
		<div className="public-profile-container">
			<Link to="/marketplace" className="vault-back">
				<ArrowLeft size={16} /> Back to Marketplace
			</Link>

			<div className="creator-banner" />

			<div className="creator-header-card">
				<div className="creator-avatar-wrap">
					<div className="creator-avatar">
						{displayName.charAt(0).toUpperCase()}
					</div>
					<div className="creator-details">
						<h1>
							{displayName}
							<span className="badge-pill badge-verified">
								<CheckCircle2 size={13} /> Verified Creator
							</span>
						</h1>
						<span>Ref: {sellerRef}</span>
					</div>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
					<div className="creator-stats-row">
						<div className="creator-stat">
							<strong>{listings.length}</strong>
							<small>Listings</small>
						</div>
						<div className="creator-stat">
							<strong>100%</strong>
							<small>Delivery</small>
						</div>
					</div>

					<Button
						variant="secondary"
						onClick={() => {
							setTipped(true);
							setTimeout(() => setTipped(false), 2500);
						}}
					>
						<Heart size={14} style={{ color: tipped ? '#ff4d6d' : 'inherit' }} />
						{tipped ? 'Tipped 5 Credits!' : 'Tip Creator'}
					</Button>
				</div>
			</div>

			<section>
				<h2 style={{ fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
					<Store size={18} style={{ color: 'var(--primary)' }} />
					Active Marketplace Catalog ({listings.length})
				</h2>

				{listings.length === 0 ? (
					<div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '16px', color: 'var(--text-muted)' }}>
						This creator has no active public listings currently.
					</div>
				) : (
					<div className="creator-catalog-grid">
						{listings.map((item) => (
							<article key={item.reference} className="marketplace-card">
								<div className="marketplace-card__visual">
									<MarketplaceThumbnail listing={item} />
								</div>
								<div className="marketplace-card__body">
									<h3>{item.title}</h3>
									<p style={{ margin: '4px 0 10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
										{Number(item.price).toLocaleString()} Credits
									</p>
									<Link to={`/marketplace/${item.reference}`} className="button button--secondary" style={{ width: '100%', justifyContent: 'center' }}>
										View Asset
									</Link>
								</div>
							</article>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
