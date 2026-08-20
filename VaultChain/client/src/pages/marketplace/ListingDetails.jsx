import { ArrowLeft, LockKeyhole, Save, ShoppingBag, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import MarketplaceThumbnail from '../../components/marketplace/MarketplaceThumbnail';
import PurchaseListingModal from '../../components/marketplace/PurchaseListingModal';
import Button from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { marketplaceService } from '../../services/marketplaceService';

const tones={active:'success',sold:'info',cancelled:'neutral'};

export default function ListingDetails() {
	const { id: reference }=useParams();
	const navigate=useNavigate();
	const [listing,setListing]=useState(null);
	const [loading,setLoading]=useState(true);
	const [error,setError]=useState('');
	const [price,setPrice]=useState('');
	const [saving,setSaving]=useState(false);
	const [removing,setRemoving]=useState(false);
	const [purchaseOpen,setPurchaseOpen]=useState(false);
	const load=useCallback(async()=>{setLoading(true);setError('');try{const data=await marketplaceService.getListing(reference);setListing(data);setPrice(String(data.price));}catch(loadError){setError(loadError.message);}finally{setLoading(false);}},[reference]);
	useEffect(()=>{load();},[load]);
	async function update(event){event.preventDefault();setSaving(true);setError('');try{setListing(await marketplaceService.updateListing(reference,{price:Number(price)}));}catch(actionError){setError(actionError.message);}finally{setSaving(false);}}
	async function remove(){setRemoving(true);setError('');try{await marketplaceService.deleteListing(reference);navigate('/marketplace',{replace:true});}catch(actionError){setError(actionError.message);setRemoving(false);}}
	if(loading)return <LoadingState label="Loading listing"/>;
	if(error&&!listing)return <><PageHeader title="Listing unavailable" description={error}/><Link className="button button--secondary" to="/marketplace"><ArrowLeft size={15}/>Back to marketplace</Link></>;
	const owner=listing.seller.isCurrentUser;
	return <><PageHeader eyebrow={listing.reference} title={listing.title} description={`Offered by ${listing.seller.reference}`} action={<Link className="button button--secondary" to="/marketplace"><ArrowLeft size={15}/>Back</Link>}/>{error?<div className="error-banner">{error}</div>:null}<div className="dashboard-grid"><SectionCard><MarketplaceThumbnail listing={listing} large/><div className="listing-hero"><StatusBadge tone={tones[listing.status]||'neutral'}>{listing.status}</StatusBadge><h2>{Number(listing.price).toLocaleString()}</h2><p>VaultChain Credits</p></div><div className="listing-details"><div><span>Asset</span><strong>{listing.asset.reference}</strong></div><div><span>Category</span><strong>{listing.asset.category||'Digital asset'}</strong></div><div><span>Seller</span><strong className="mono">{listing.seller.reference}</strong></div><div><span>Created</span><strong>{new Date(listing.createdAt).toLocaleDateString()}</strong></div></div>{listing.description?<p className="listing-description">{listing.description}</p>:null}{listing.asset.isLocked?<div className="info-banner"><LockKeyhole size={15}/> Password Protected — preview is unavailable while the seller's Vault is locked.</div>:null}</SectionCard><SectionCard title={owner?'Manage listing':listing.status==='active'?'Purchase asset':`Listing ${listing.status}`} description={owner?'Update the price or cancel this offer.':listing.status==='active'?'Payment and ownership transfer happen together.':'This listing is no longer available for purchase.'}>{owner&&listing.status==='active'?<div className="form-grid"><form className="form-grid" onSubmit={update}><div className="field"><label htmlFor="updated-price">Price in VaultChain Credits</label><input id="updated-price" className="input" type="number" min="0.01" step="0.01" value={price} onChange={(event)=>setPrice(event.target.value)}/></div><Button type="submit" icon={Save} disabled={saving}>{saving?'Saving…':'Save price'}</Button></form><Button variant="danger" icon={Trash2} disabled={removing} onClick={remove}>{removing?'Cancelling…':'Cancel listing'}</Button></div>:!owner&&listing.status==='active'?<div className="purchase-action"><p>Purchasing transfers the registered asset to your library without changing its file or fingerprints.</p><Button icon={ShoppingBag} onClick={()=>setPurchaseOpen(true)}>Purchase for {Number(listing.price).toLocaleString()} Credits</Button></div>:<div className="info-banner">This listing is {listing.status} and cannot be purchased.</div>}</SectionCard></div><PurchaseListingModal listing={purchaseOpen?listing:null} onClose={()=>{setPurchaseOpen(false);load();}} onPurchased={()=>load()}/></>;
}
