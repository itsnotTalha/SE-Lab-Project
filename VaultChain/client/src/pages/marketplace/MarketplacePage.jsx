import { ArrowRight, Plus, Store } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { marketplaceService } from '../../services/marketplaceService';

export default function MarketplacePage() {
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [assetId, setAssetId] = useState('');
	const [listingType, setListingType] = useState('sale');
	const [price, setPrice] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const load = useCallback(async()=>{setLoading(true);setError('');try{setListings(await marketplaceService.getListings());}catch(loadError){setError(loadError.message);}finally{setLoading(false);}},[]);
	useEffect(()=>{load();},[load]);
	async function handleSubmit(event){event.preventDefault();setSubmitting(true);setError('');try{await marketplaceService.createListing({assetId:Number(assetId),listingType,price:Number(price)});setAssetId('');setPrice('');await load();}catch(submitError){setError(submitError.message);}finally{setSubmitting(false);}}
	return <><PageHeader eyebrow="Exchange" title="Marketplace" description="List owned assets and review active marketplace offers backed by the current API."/>{error?<div className="error-banner">{error}</div>:null}<div className="dashboard-grid"><SectionCard title="Active listings" description="Live records returned by the marketplace API.">{!loading&&listings.length===0?<EmptyState icon={Store} title="No active listings" description="Create the first listing using an asset you own."/>:<div className="market-grid">{listings.map((listing)=><article className="market-card" key={listing.id}><div className="market-card__visual"><Store size={25}/><StatusBadge tone="success">{listing.status}</StatusBadge></div><div className="market-card__body"><small>Asset #{listing.assetId} · {listing.listingType}</small><h3>{listing.assetTitle}</h3><p>Seller: {listing.sellerName}</p><strong>{Number(listing.price).toLocaleString()} credits</strong><Link to={`/marketplace/${listing.id}`}>View listing <ArrowRight size={13}/></Link></div></article>)}</div>}</SectionCard><SectionCard title="Create listing" description="Use the ID of an asset you own from the upload flow."><form className="form-grid" onSubmit={handleSubmit}><div className="field"><label htmlFor="listing-asset">Asset ID</label><input id="listing-asset" className="input" type="number" min="1" value={assetId} onChange={(e)=>setAssetId(e.target.value)} placeholder="e.g. 12" required/></div><div className="field"><label htmlFor="listing-type">Listing type</label><select id="listing-type" className="select" value={listingType} onChange={(e)=>setListingType(e.target.value)}><option value="sale">Sale</option><option value="auction">Auction</option><option value="rent">Rent</option></select></div><div className="field"><label htmlFor="listing-price">Price in credits</label><input id="listing-price" className="input" type="number" min="0.01" step="0.01" value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="0.00" required/></div><Button type="submit" icon={Plus} disabled={submitting}>{submitting?'Creating…':'Create listing'}</Button></form></SectionCard></div></>;
}
