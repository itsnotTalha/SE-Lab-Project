import { AlertCircle, CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';

import { marketplaceService } from '../../services/marketplaceService';
import Button from '../ui/Button';

export default function PurchaseListingModal({ listing, onClose, onPurchased }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [receipt, setReceipt] = useState(null);
	if (!listing) return null;
	async function purchase() {
		setLoading(true); setError('');
		try { const result=await marketplaceService.purchaseListing(listing.reference); setReceipt(result); onPurchased?.(result); }
		catch (purchaseError) { setError(purchaseError.message); }
		finally { setLoading(false); }
	}
	return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="purchase-title"><button className="modal__backdrop" aria-label="Close" onClick={onClose}/><section className="modal__card purchase-modal"><header className="modal__header"><div><span className="modal__icon">{receipt?<CheckCircle2 size={19}/>:<ShoppingBag size={19}/>}</span><div><h2 id="purchase-title">{receipt?'Purchase complete':'Confirm purchase'}</h2><p>{receipt?receipt.transactionReference:'Ownership transfers immediately after payment.'}</p></div></div><button className="icon-button" type="button" onClick={onClose}><X size={18}/></button></header><div className="purchase-modal__body">{receipt?<><div className="purchase-receipt"><span>Asset</span><strong>{receipt.asset.title}</strong><span>Transaction</span><code>{receipt.transactionReference}</code><span>Paid</span><strong>{Number(receipt.price).toLocaleString()} VaultChain Credits</strong><span>Balance</span><strong>{Number(receipt.buyerBalance).toLocaleString()} VaultChain Credits</strong></div><Button onClick={onClose}>View purchased asset in your library</Button></>:<><p>You are purchasing <strong>{listing.title}</strong> from <code>{listing.seller.reference}</code>.</p><div className="purchase-total"><span>Total</span><strong>{Number(listing.price).toLocaleString()} VaultChain Credits</strong></div>{error?<div className="error-banner" role="alert"><AlertCircle size={16}/>{error}</div>:null}<footer><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={ShoppingBag} onClick={purchase} disabled={loading}>{loading?'Purchasing…':'Confirm purchase'}</Button></footer></>}</div></section></div>;
}
