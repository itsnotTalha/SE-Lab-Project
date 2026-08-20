import { ArrowLeft, Save, Store, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Button from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { authService } from '../../services/authService';
import { marketplaceService } from '../../services/marketplaceService';

export default function ListingDetails(){
	const {id}=useParams();const navigate=useNavigate();const [listing,setListing]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [price,setPrice]=useState('');const [saving,setSaving]=useState(false);const [removing,setRemoving]=useState(false);
	const load=useCallback(async()=>{setLoading(true);setError('');try{const data=await marketplaceService.getListingById(id);setListing(data);setPrice(String(data.price));}catch(loadError){setError(loadError.message);}finally{setLoading(false);}},[id]);
	useEffect(()=>{load();},[load]);
	const owner=listing&&authService.getCurrentUserId()===listing.sellerId;
	async function update(event){event.preventDefault();setSaving(true);setError('');try{setListing(await marketplaceService.updateListing(id,{price:Number(price)}));}catch(actionError){setError(actionError.message);}finally{setSaving(false);}}
	async function remove(){setRemoving(true);setError('');try{await marketplaceService.deleteListing(id);navigate('/marketplace',{replace:true});}catch(actionError){setError(actionError.message);setRemoving(false);}}
	if(loading)return <LoadingState label="Loading listing"/>;
	if(error&&!listing)return <><PageHeader title="Listing unavailable" description={error}/><Link className="button button--secondary" to="/marketplace"><ArrowLeft size={15}/>Back to marketplace</Link></>;
	return <><PageHeader eyebrow="Marketplace listing" title={listing.assetTitle} description={`Listed by ${listing.sellerName}`} action={<Link className="button button--secondary" to="/marketplace"><ArrowLeft size={15}/>Back</Link>}/>{error?<div className="error-banner">{error}</div>:null}<div className="dashboard-grid"><SectionCard><div className="listing-hero"><span><Store size={29}/></span><StatusBadge tone="success">{listing.status}</StatusBadge><h2>{Number(listing.price).toLocaleString()} credits</h2><p>Current listing price</p></div><div className="listing-details"><div><span>Asset ID</span><strong>#{listing.assetId}</strong></div><div><span>Listing type</span><strong>{listing.listingType}</strong></div><div><span>Seller</span><strong>{listing.sellerName}</strong></div><div><span>Created</span><strong>{new Date(listing.createdAt).toLocaleDateString()}</strong></div></div></SectionCard><SectionCard title={owner?'Manage listing':'Ownership transfer unavailable'} description={owner?'Update the price or remove this listing.':'Buying and ownership transfer require a future backend module.'}>{owner?<div className="form-grid"><form className="form-grid" onSubmit={update}><div className="field"><label htmlFor="updated-price">Listing price</label><input id="updated-price" className="input" type="number" min="0.01" step="0.01" value={price} onChange={(e)=>setPrice(e.target.value)}/></div><Button type="submit" icon={Save} disabled={saving}>{saving?'Saving…':'Save price'}</Button></form><Button variant="danger" icon={Trash2} disabled={removing||listing.status==='removed'} onClick={remove}>{removing?'Removing…':'Remove listing'}</Button></div>:<div className="info-banner">This listing is view-only until ownership transfer support is implemented.</div>}</SectionCard></div></>;
}
