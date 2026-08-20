import { ArrowRight, Plus, Search, SlidersHorizontal, Store, WalletCards } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import CreateListingModal from '../../components/marketplace/CreateListingModal';
import MarketplaceThumbnail from '../../components/marketplace/MarketplaceThumbnail';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { marketplaceService } from '../../services/marketplaceService';
import { walletService } from '../../services/walletService';

const FILTERS = [
	{ value: 'all', label: 'All' },
	{ value: 'active', label: 'Active' },
	{ value: 'sold', label: 'Sold' },
	{ value: 'cancelled', label: 'Cancelled' },
	{ value: 'mine', label: 'My Listings' },
];
const TONES = { active: 'success', sold: 'info', cancelled: 'neutral' };

function MarketplaceSkeleton() {
	return <div className="marketplace-grid" role="status" aria-label="Loading marketplace listings">{[1,2,3,4,5,6].map((item)=><article className="marketplace-card-skeleton" key={item} aria-hidden="true"><span className="skeleton marketplace-card-skeleton__visual"/><div><span className="skeleton marketplace-card-skeleton__eyebrow"/><span className="skeleton marketplace-card-skeleton__title"/><span className="skeleton marketplace-card-skeleton__line"/><span className="skeleton marketplace-card-skeleton__price"/></div></article>)}</div>;
}

function emptyState(filter, search, onCreate, onReset) {
	if (search) return { title:'No listings match your search', description:'Try a different title, asset reference, or seller reference.', action:<Button variant="secondary" onClick={onReset}>Clear search</Button> };
	if (filter==='mine') return { title:'You have no marketplace listings', description:'Choose one of your registered assets to create your first listing.', action:<Button icon={Plus} onClick={onCreate}>Create listing</Button> };
	if (filter!=='all') return { title:`No ${filter} listings`, description:`There are currently no marketplace listings with ${filter} status.`, action:<Button variant="secondary" onClick={onReset}>View all listings</Button> };
	return { title:'No marketplace listings yet', description:'Registered asset listings will appear here when sellers make them available.', action:<Button icon={Plus} onClick={onCreate}>Create listing</Button> };
}

export default function MarketplacePage() {
	const [listings,setListings]=useState([]);
	const [wallet,setWallet]=useState(null);
	const [loading,setLoading]=useState(true);
	const [walletLoading,setWalletLoading]=useState(true);
	const [error,setError]=useState('');
	const [walletError,setWalletError]=useState(false);
	const [search,setSearch]=useState('');
	const [filter,setFilter]=useState('all');
	const [createOpen,setCreateOpen]=useState(false);
	const load=useCallback(async()=>{
		setLoading(true); setWalletLoading(true); setError(''); setWalletError(false);
		const [listingResult,walletResult]=await Promise.allSettled([marketplaceService.getListings(),walletService.getWallet()]);
		if(listingResult.status==='fulfilled')setListings(listingResult.value);else setError(listingResult.reason.message);
		if(walletResult.status==='fulfilled')setWallet(walletResult.value);else setWalletError(true);
		setLoading(false); setWalletLoading(false);
	},[]);
	useEffect(()=>{load();},[load]);
	const visible=useMemo(()=>listings.filter((listing)=>{
		const matchesFilter=filter==='all'||(filter==='mine'?listing.seller.isCurrentUser:listing.status===filter);
		const query=search.trim().toLowerCase();
		return matchesFilter&&(!query||[listing.title,listing.asset.title,listing.asset.reference,listing.seller.reference].some((value)=>String(value||'').toLowerCase().includes(query)));
	}),[listings,search,filter]);
	const empty=emptyState(filter,search,()=>setCreateOpen(true),()=>{setSearch('');setFilter('all');});
	const formattedBalance=wallet?Number(wallet.balance).toLocaleString(undefined,{maximumFractionDigits:2}):null;

	return <>
		<PageHeader eyebrow="Exchange" title="Marketplace" description="Discover and purchase registered digital assets using VaultChain Credits." action={<div className="marketplace-header-actions"><div className="marketplace-wallet-balance"><WalletCards size={16}/><div><span>Available balance</span>{walletLoading?<span className="skeleton skeleton--value"/>:walletError?<strong>Unavailable</strong>:<strong>{formattedBalance} <small>VaultChain Credits</small></strong>}</div></div><Button icon={Plus} onClick={()=>setCreateOpen(true)}>Create listing</Button></div>}/>
		{error?<div className="error-banner">{error}</div>:null}
		<section className="marketplace-toolbar" aria-label="Marketplace search and filters"><label className="marketplace-search"><Search size={17}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search by listing, asset, or seller reference" aria-label="Search marketplace listings"/>{search?<button type="button" onClick={()=>setSearch('')} aria-label="Clear marketplace search">×</button>:null}</label><div className="marketplace-filter-group" aria-label="Filter marketplace listings"><SlidersHorizontal size={14} aria-hidden="true"/>{FILTERS.map((item)=><button type="button" key={item.value} className={filter===item.value?'is-active':''} aria-pressed={filter===item.value} onClick={()=>setFilter(item.value)}>{item.label}</button>)}</div></section>
		{loading?<MarketplaceSkeleton/>:visible.length===0?<div className="marketplace-empty"><EmptyState icon={Store} title={empty.title} description={empty.description} action={empty.action}/></div>:<div className="marketplace-grid">{visible.map((listing)=>{const own=listing.seller.isCurrentUser;return <article className="marketplace-card" key={listing.reference}><div className="marketplace-card__visual"><MarketplaceThumbnail listing={listing}/>{own?<span className="marketplace-card__owner-label">Your listing</span>:null}<StatusBadge tone={TONES[listing.status]||'neutral'}>{listing.status[0].toUpperCase()+listing.status.slice(1)}</StatusBadge></div><div className="marketplace-card__body"><div className="marketplace-card__identity"><h2>{listing.title}</h2><code>{listing.asset.reference}</code></div><div className="marketplace-card__seller"><span>Seller</span><code>{listing.seller.reference}</code></div><div className="marketplace-card__footer"><div className="marketplace-card__price"><strong>{Number(listing.price).toLocaleString()}</strong><span>VaultChain Credits</span></div><Link to={`/marketplace/${listing.reference}`}>{own?'Manage listing':'View listing'} <ArrowRight size={14}/></Link></div></div></article>;})}</div>}
		<CreateListingModal open={createOpen} onClose={()=>setCreateOpen(false)} onCreated={()=>{setCreateOpen(false);load();}}/>
	</>;
}
