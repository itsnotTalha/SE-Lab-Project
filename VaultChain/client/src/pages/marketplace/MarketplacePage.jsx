import { ArrowRight, Plus, Search, Store } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import CreateListingModal from '../../components/marketplace/CreateListingModal';
import MarketplaceThumbnail from '../../components/marketplace/MarketplaceThumbnail';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { marketplaceService } from '../../services/marketplaceService';

const tone = { active: 'success', sold: 'info', cancelled: 'neutral' };

export default function MarketplacePage() {
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState('active');
	const [createOpen, setCreateOpen] = useState(false);
	const load = useCallback(async () => {
		setLoading(true); setError('');
		try { setListings(await marketplaceService.getListings()); }
		catch (loadError) { setError(loadError.message); }
		finally { setLoading(false); }
	}, []);
	useEffect(() => { load(); }, [load]);
	const visible = useMemo(() => listings.filter((listing) => {
		const matchesStatus = filter === 'all' || listing.status === filter;
		const query = search.trim().toLowerCase();
		return matchesStatus && (!query || [listing.title, listing.description, listing.asset.title, listing.asset.reference, listing.seller.reference].some((value) => String(value || '').toLowerCase().includes(query)));
	}), [listings, search, filter]);

	return <>
		<PageHeader eyebrow="Exchange" title="Marketplace" description="Discover and purchase registered digital assets using VaultChain Credits." action={<Button icon={Plus} onClick={()=>setCreateOpen(true)}>Create listing</Button>}/>
		{error?<div className="error-banner">{error}</div>:null}
		<div className="marketplace-toolbar"><label className="search-field"><Search size={15}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search listings, assets, or sellers" aria-label="Search marketplace"/></label><div className="filter-group" aria-label="Listing status">{['active','sold','cancelled','all'].map((status)=><button key={status} className={filter===status?'is-active':''} onClick={()=>setFilter(status)}>{status[0].toUpperCase()+status.slice(1)}</button>)}</div></div>
		{loading?<LoadingState label="Loading marketplace listings"/>:visible.length===0?<EmptyState icon={Store} title={search?'No matching listings':`No ${filter==='all'?'':filter} listings`} description="Marketplace listings will appear here when assets are offered for sale." action={!search&&filter==='active'?<Button icon={Plus} onClick={()=>setCreateOpen(true)}>Create listing</Button>:null}/>:<div className="market-grid marketplace-grid">{visible.map((listing)=><article className="market-card" key={listing.reference}><div className="market-card__visual"><MarketplaceThumbnail listing={listing}/><StatusBadge tone={tone[listing.status]||'neutral'}>{listing.status}</StatusBadge></div><div className="market-card__body"><small>{listing.asset.reference} · Seller {listing.seller.reference}</small><h3>{listing.title}</h3><p>{listing.description||listing.asset.title}</p><strong>{Number(listing.price).toLocaleString()} VaultChain Credits</strong><Link to={`/marketplace/${listing.reference}`}>View listing <ArrowRight size={13}/></Link></div></article>)}</div>}
		<CreateListingModal open={createOpen} onClose={()=>setCreateOpen(false)} onCreated={()=>{setCreateOpen(false);load();}}/>
	</>;
}
