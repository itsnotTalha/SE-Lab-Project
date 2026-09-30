import { AlertCircle, CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplaceService';
import Button from '../ui/Button';
import SlideToConfirm from '../ui/SlideToConfirm';
import '../../styles/purchase-confirmation.css';

export default function PurchaseListingModal({ listing, onClose, onPurchased }) {
 const navigate = useNavigate();
 const dialog = useRef(null);
 const successHeading = useRef(null);
 const inFlight = useRef(false);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const [receipt, setReceipt] = useState(null);
 useEffect(() => {
  const element = dialog.current;
  const previous = document.activeElement;
  element?.showModal();
  return () => { element?.close(); if (previous?.isConnected) previous.focus(); };
 }, []);
 useEffect(() => { if (receipt) successHeading.current?.focus(); }, [receipt]);
 if (!listing) return null;
 const close = () => { if (!inFlight.current) onClose(); };
 async function purchase() {
  if (inFlight.current || receipt) return false;
  inFlight.current = true;
  setLoading(true); setError('');
  let result;
  try { result = await marketplaceService.purchaseListing(listing.reference); }
  catch (purchaseError) { setError(purchaseError.message || 'Purchase failed. Please try again.'); return false; }
  finally { inFlight.current = false; setLoading(false); }
  setReceipt(result);
  // Refresh parent state without dismissing a successfully completed receipt.
  onPurchased?.(result);
  return true;
 }
 const inspect = () => {
  const id = receipt.asset.id ?? Number(receipt.asset.reference.replace(/^VC-A-?/, ''));
  onClose(); navigate(Number.isSafeInteger(Number(id)) && Number(id) > 0 ? `/assets/${Number(id)}/inspect` : '/assets');
 };
 return <dialog ref={dialog} className="purchase-dialog" aria-labelledby="purchase-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === dialog.current) close(); }}>
  <header className="purchase-dialog-header"><span className="purchase-dialog-icon"><ShoppingBag size={21}/></span><h2 id="purchase-title">{receipt ? 'Purchase confirmation' : 'Review your purchase'}</h2><button type="button" className="icon-button" aria-label="Close purchase dialog" onClick={close} disabled={loading}><X size={19}/></button></header>
  {receipt ? <section className="purchase-confirmation-card">
   <span className="purchase-confirmation-check"><CheckCircle2 size={34}/></span><h3 ref={successHeading} tabIndex={-1}>Purchase successful</h3><p>The asset is now in your library.</p>
   <dl><div><dt>Asset</dt><dd>{receipt.asset.title}</dd></div><div><dt>Asset reference</dt><dd>{receipt.asset.reference}</dd></div><div><dt>Transaction</dt><dd><code>{receipt.transactionReference}</code></dd></div><div><dt>Amount paid</dt><dd>{Number(receipt.price).toLocaleString()} credits</dd></div><div><dt>Remaining balance</dt><dd>{Number(receipt.buyerBalance).toLocaleString()} credits</dd></div></dl>
   <footer><Button variant="secondary" onClick={close}>Done</Button><Button onClick={inspect}>View purchased asset</Button></footer>
  </section> : <div className="purchase-review"><p>Review the asset and price before confirming the ownership transfer.</p><dl><div><dt>Asset</dt><dd>{listing.title}</dd></div><div><dt>Seller</dt><dd>{listing.seller.isAnonymous ? 'Anonymous seller' : listing.seller.name || listing.seller.reference}</dd></div><div className="purchase-review-total"><dt>Total</dt><dd>{Number(listing.price).toLocaleString()} credits</dd></div></dl>
   {error && <div className="error-banner" role="alert"><AlertCircle size={17}/><span>{error}</span></div>}
   <SlideToConfirm onConfirm={purchase} loading={loading}/><p className="purchase-processing-note">{loading ? 'Please wait while your purchase completes.' : 'Your wallet is charged only after you confirm.'}</p><Button variant="secondary" disabled={loading} onClick={close}>Cancel</Button>
  </div>}
 </dialog>;
}
