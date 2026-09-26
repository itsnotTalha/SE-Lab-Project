import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Download,
	Eye,
	FileText,
	KeyRound,
	LockKeyhole,
	Save,
	ShieldCheck,
	ShoppingBag,
	Trash2,
	XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import MarketplaceThumbnail from '../../components/marketplace/MarketplaceThumbnail';
import PurchaseListingModal from '../../components/marketplace/PurchaseListingModal';
import RequestAccessModal from '../../components/marketplace/RequestAccessModal';
import Button from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { documentService } from '../../services/documentService';
import { marketplaceService } from '../../services/marketplaceService';

const tones = { active: 'success', sold: 'info', cancelled: 'neutral' };

export default function ListingDetails() {
	const { id: reference } = useParams();
	const navigate = useNavigate();
	const [listing, setListing] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [price, setPrice] = useState('');
	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [purchaseOpen, setPurchaseOpen] = useState(false);
	const [requestAccessOpen, setRequestAccessOpen] = useState(false);
	const [downloadPassword, setDownloadPassword] = useState('');
	const [downloadModalOpen, setDownloadModalOpen] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [downloadError, setDownloadError] = useState('');
	const [selectedPermittedPage, setSelectedPermittedPage] = useState(null);
	const [permittedPageUrl, setPermittedPageUrl] = useState('');
	const [pageLoading, setPageLoading] = useState(false);
	const [pageError, setPageError] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const data = await marketplaceService.getListing(reference);
			setListing(data);
			setPrice(String(data.price));
		} catch (loadError) {
			setError(loadError.message);
		} finally {
			setLoading(false);
		}
	}, [reference]);

	useEffect(() => {
		load();
	}, [load]);

	async function update(event) {
		event.preventDefault();
		setSaving(true);
		setError('');
		try {
			setListing(await marketplaceService.updateListing(reference, { price: Number(price) }));
		} catch (actionError) {
			setError(actionError.message);
		} finally {
			setSaving(false);
		}
	}

	async function remove() {
		setRemoving(true);
		setError('');
		try {
			await marketplaceService.deleteListing(reference);
			navigate('/marketplace', { replace: true });
		} catch (actionError) {
			setError(actionError.message);
			setRemoving(false);
		}
	}

	async function handleDownload(event) {
		event.preventDefault();
		if (!listing?.documentId) return;
		setDownloading(true);
		setDownloadError('');
		try {
			await documentService.downloadWithPassword(listing.documentId, downloadPassword, `${listing.title}.pdf`);
			setDownloadModalOpen(false);
			setDownloadPassword('');
		} catch (err) {
			setDownloadError(err.message || 'Download failed');
		} finally {
			setDownloading(false);
		}
	}

	if (loading) return <LoadingState label="Loading listing" />;
	if (error && !listing) {
		return (
			<>
				<PageHeader title="Listing unavailable" description={error} />
				<Link className="button button--secondary" to="/marketplace">
					<ArrowLeft size={15} /> Back to marketplace
				</Link>
			</>
		);
	}

	const owner = listing.seller.isCurrentUser;
	const userAccess = listing.userAccess || {};
	const grant = userAccess.grant;
	const isPending = userAccess.hasActiveRequest || userAccess.requestStatus === 'pending';
	const isApproved = userAccess.requestStatus === 'approved' && Boolean(grant);
	const isRejected = userAccess.requestStatus === 'rejected';

	const permittedPages = useMemo(() => {
		if (!grant || !grant.canView) return [];
		if (grant.accessType === 'single') return grant.pages?.length ? grant.pages : [1];
		if (grant.accessType === 'selected') return grant.pages?.length ? grant.pages : [1];
		if (grant.accessType === 'all') {
			const count = listing?.documentPageCount || 1;
			return Array.from({ length: count }, (_, i) => i + 1);
		}
		return grant.pages || [1];
	}, [grant, listing?.documentPageCount]);

	useEffect(() => {
		if (isApproved && grant?.canView && permittedPages.length > 0) {
			setSelectedPermittedPage((prev) => (prev && permittedPages.includes(prev) ? prev : permittedPages[0]));
		} else {
			setSelectedPermittedPage(null);
			setPermittedPageUrl('');
		}
	}, [isApproved, grant, permittedPages]);

	useEffect(() => {
		if (!isApproved || !grant?.canView || !listing?.documentId || !selectedPermittedPage) {
			return () => {};
		}

		let active = true;
		let objectUrl = '';
		setPageLoading(true);
		setPageError('');

		documentService
			.getPageContentObjectUrl(listing.documentId, selectedPermittedPage)
			.then((url) => {
				objectUrl = url;
				if (active) setPermittedPageUrl(url);
				else URL.revokeObjectURL(url);
			})
			.catch((err) => {
				if (active) setPageError(err.message || 'Unable to load permitted page content');
			})
			.finally(() => {
				if (active) setPageLoading(false);
			});

		return () => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [isApproved, grant?.canView, listing?.documentId, selectedPermittedPage]);

	return (
		<>
			<PageHeader
				eyebrow={listing.reference}
				title={listing.title}
				description={`Offered by ${listing.seller.name ? `${listing.seller.name} (${listing.seller.reference})` : listing.seller.reference}`}
				action={
					<div style={{ display: 'flex', gap: '0.5rem' }}>
						{owner ? (
							<Link className="button button--primary button--vault" to="/marketplace/requests">
								<KeyRound size={15} /> Access Requests
							</Link>
						) : null}
						<Link className="button button--secondary" to="/marketplace">
							<ArrowLeft size={15} /> Back
						</Link>
					</div>
				}
			/>

			{error ? <div className="error-banner">{error}</div> : null}

			<div className="dashboard-grid">
				<SectionCard>
					<MarketplaceThumbnail listing={listing} large />
					<div className="listing-hero">
						<StatusBadge tone={tones[listing.status] || 'neutral'}>{listing.status}</StatusBadge>
						<h2>{Number(listing.price).toLocaleString()}</h2>
						<p>VaultChain Credits</p>
					</div>

					<div className="listing-details">
						<div>
							<span>Marketplace ID</span>
							<strong className="mono">{listing.reference}</strong>
						</div>
						<div>
							<span>Seller Name</span>
							<strong>{listing.seller.name || 'Verified Seller'}</strong>
						</div>
						<div>
							<span>Seller ID</span>
							<strong className="mono">{listing.seller.reference}</strong>
						</div>
						<div>
							<span>Asset</span>
							<strong>{listing.asset.reference}</strong>
						</div>
						<div>
							<span>Category</span>
							<strong>{listing.asset.category || 'Digital asset'}</strong>
						</div>
						<div>
							<span>Created</span>
							<strong>{new Date(listing.createdAt).toLocaleDateString()}</strong>
						</div>
					</div>

					{listing.description ? (
						<p className="listing-description">{listing.description}</p>
					) : null}

					{/* Access Control & Permissions Section */}
					{!owner && listing.status === 'active' ? (
						<div
							style={{
								marginTop: '1.25rem',
								padding: '1rem',
								borderRadius: '8px',
								border: '1px solid var(--border-color, #e2e8f0)',
								background: 'var(--surface-subtle, #f8fafc)',
								display: 'flex',
								flexDirection: 'column',
								gap: '0.75rem',
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
									<LockKeyhole size={16} />
									<strong>Document Access Status</strong>
								</div>

								{isApproved ? (
									<StatusBadge tone="success">Access Granted</StatusBadge>
								) : isPending ? (
									<StatusBadge tone="warning">Request Pending</StatusBadge>
								) : isRejected ? (
									<StatusBadge tone="danger">Request Rejected</StatusBadge>
								) : (
									<StatusBadge tone="neutral">No Access</StatusBadge>
								)}
							</div>

							{isApproved && grant ? (
								<div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: '#fff', padding: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
									<div style={{ color: 'var(--success-text, #065f46)', fontWeight: 600 }}>
										✓ You have approved access from the seller:
									</div>
									<div>
										<strong>Scope:</strong> <span style={{ textTransform: 'capitalize' }}>{grant.accessType}</span>
										{grant.pages && grant.pages.length > 0 ? ` (Pages: ${grant.pages.join(', ')})` : ''}
									</div>
									<div>
										<strong>Permissions:</strong> {grant.canView ? '✓ View Allowed' : '✗ No View'} • {grant.canDownload ? '✓ Download Allowed' : '✗ No Download'}
									</div>

									{grant.canView && listing.documentId ? (
										<div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
											<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
												<div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
													<Eye size={16} style={{ color: 'var(--primary)' }} />
													<strong>Protected Document View</strong>
													<StatusBadge tone="success">
														{grant.accessType === 'single'
															? `Page ${selectedPermittedPage} Only`
															: grant.accessType === 'selected'
															? `Permitted Pages (${grant.pages.join(', ')})`
															: 'All Pages'}
													</StatusBadge>
												</div>

												{permittedPages.length > 1 ? (
													grant.accessType === 'selected' ? (
														<div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
															<span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pages:</span>
															{permittedPages.map((p) => (
																<button
																	key={p}
																	type="button"
																	className={`button button--sm ${selectedPermittedPage === p ? 'button--primary button--vault' : 'button--secondary'}`}
																	style={{ minHeight: '26px', padding: '0 8px', fontSize: '0.72rem' }}
																	onClick={() => setSelectedPermittedPage(p)}
																>
																	Page {p}
																</button>
															))}
														</div>
													) : (
														<div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
															<button
																type="button"
																className="button button--secondary button--sm"
																style={{ minHeight: '26px', padding: '0 6px' }}
																disabled={selectedPermittedPage <= 1}
																onClick={() => setSelectedPermittedPage((prev) => Math.max(1, prev - 1))}
																aria-label="Previous page"
															>
																<ChevronLeft size={13} />
															</button>
															<span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
																Page {selectedPermittedPage} of {listing.documentPageCount || permittedPages.length}
															</span>
															<button
																type="button"
																className="button button--secondary button--sm"
																style={{ minHeight: '26px', padding: '0 6px' }}
																disabled={selectedPermittedPage >= (listing.documentPageCount || permittedPages.length)}
																onClick={() => setSelectedPermittedPage((prev) => Math.min(listing.documentPageCount || permittedPages.length, prev + 1))}
																aria-label="Next page"
															>
																<ChevronRight size={13} />
															</button>
														</div>
													)
												) : null}
											</div>

											<div
												style={{
													width: '100%',
													minHeight: '380px',
													maxHeight: '540px',
													borderRadius: '6px',
													overflow: 'hidden',
													border: '1px solid #cbd5e1',
													background: '#0f172a',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
												}}
											>
												{pageLoading ? (
													<LoadingState label={`Loading permitted page ${selectedPermittedPage}…`} />
												) : pageError ? (
													<div className="error-banner" style={{ margin: '1rem' }}>{pageError}</div>
												) : permittedPageUrl ? (
													<iframe
														src={`${permittedPageUrl}#page=${selectedPermittedPage}&toolbar=0&navpanes=0`}
														title={`Permitted view of ${listing.title} - Page ${selectedPermittedPage}`}
														style={{ width: '100%', height: '480px', border: 'none', background: '#fff' }}
													/>
												) : (
													<div style={{ color: '#94a3b8' }}>Preview not available</div>
												)}
											</div>
											<div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
												🔒 Protected document view restricted to seller-approved scope.
											</div>
										</div>
									) : null}

									<div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
										{grant.canDownload && listing.documentId ? (
											<Button
												size="sm"
												icon={Download}
												onClick={() => setDownloadModalOpen(true)}
											>
												Download Document
											</Button>
										) : null}
									</div>
								</div>
							) : isPending ? (
								<div className="info-banner" style={{ margin: 0, fontSize: '0.85rem' }}>
									Your access request is currently pending approval by the seller.
								</div>
							) : (
								<div>
									{isRejected ? (
										<div className="error-banner" style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>
											Your previous request was rejected. You may submit a new request below.
										</div>
									) : listing.asset.isLocked ? (
										<p style={{ margin: '0 0 0.65rem 0', fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
											This document is password-protected in the seller's Secure Vault. Request access to inspect permitted pages or download.
										</p>
									) : null}

									<Button
										size="sm"
										variant="primary"
										className="button--vault"
										icon={KeyRound}
										disabled={isPending}
										onClick={() => setRequestAccessOpen(true)}
									>
										{isRejected ? 'Request Access Again' : 'Request Access'}
									</Button>
								</div>
							)}
						</div>
					) : null}
				</SectionCard>

				<SectionCard
					title={owner ? 'Manage listing' : listing.status === 'active' ? 'Purchase asset' : `Listing ${listing.status}`}
					description={
						owner
							? 'Update the price or cancel this offer.'
							: listing.status === 'active'
								? 'Payment and ownership transfer happen together.'
								: 'This listing is no longer available for purchase.'
					}
				>
					{owner && listing.status === 'active' ? (
						<div className="form-grid">
							<form className="form-grid" onSubmit={update}>
								<div className="field">
									<label htmlFor="updated-price">Price in VaultChain Credits</label>
									<input
										id="updated-price"
										className="input"
										type="number"
										min="0.01"
										step="0.01"
										value={price}
										onChange={(event) => setPrice(event.target.value)}
									/>
								</div>
								<Button type="submit" icon={Save} disabled={saving}>
									{saving ? 'Saving…' : 'Save price'}
								</Button>
							</form>
							<Button variant="danger" icon={Trash2} disabled={removing} onClick={remove}>
								{removing ? 'Cancelling…' : 'Cancel listing'}
							</Button>
						</div>
					) : !owner && listing.status === 'active' ? (
						<div className="purchase-action">
							<p>Purchasing transfers the registered asset to your library without changing its file or fingerprints.</p>
							<Button icon={ShoppingBag} onClick={() => setPurchaseOpen(true)}>
								Purchase for {Number(listing.price).toLocaleString()} Credits
							</Button>
						</div>
					) : (
						<div className="info-banner">This listing is {listing.status} and cannot be purchased.</div>
					)}
				</SectionCard>
			</div>

			<PurchaseListingModal
				listing={purchaseOpen ? listing : null}
				onClose={() => {
					setPurchaseOpen(false);
					load();
				}}
				onPurchased={() => load()}
			/>

			<RequestAccessModal
				listing={requestAccessOpen ? listing : null}
				onClose={() => setRequestAccessOpen(false)}
				onRequested={() => {
					setRequestAccessOpen(false);
					load();
				}}
			/>

			{/* Download Modal with Password */}
			{downloadModalOpen ? (
				<div className="modal" role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
					<button className="modal__backdrop" aria-label="Close" onClick={() => setDownloadModalOpen(false)} />
					<section className="modal__card" style={{ maxWidth: '420px' }}>
						<header className="modal__header">
							<div>
								<span className="modal__icon">
									<Download size={19} />
								</span>
								<div>
									<h2 id="download-modal-title">Download Protected Document</h2>
									<p>Enter your password to confirm identity.</p>
								</div>
							</div>
							<button className="icon-button" type="button" onClick={() => setDownloadModalOpen(false)}>
								<XCircle size={18} />
							</button>
						</header>

						<form onSubmit={handleDownload} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
							<div className="field">
								<label htmlFor="buyer-pass">Account Password</label>
								<input
									id="buyer-pass"
									className="input"
									type="password"
									value={downloadPassword}
									onChange={(e) => setDownloadPassword(e.target.value)}
									required
									autoFocus
								/>
							</div>

							{downloadError ? (
								<div className="error-banner" role="alert">
									<AlertCircle size={16} />
									<span>{downloadError}</span>
								</div>
							) : null}

							<footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
								<Button variant="secondary" type="button" onClick={() => setDownloadModalOpen(false)} disabled={downloading}>
									Cancel
								</Button>
								<Button icon={Download} type="submit" disabled={downloading}>
									{downloading ? 'Downloading…' : 'Confirm Download'}
								</Button>
							</footer>
						</form>
					</section>
				</div>
			) : null}
		</>
	);
}
