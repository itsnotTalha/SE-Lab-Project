import {
	AlertCircle, CheckCircle2, ChevronRight, ExternalLink,
	Image, LockKeyhole, ShieldCheck, Sparkles, Store, X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { assetService } from '../../services/assetService';
import { vaultService } from '../../services/vaultService';
import LoadingState from '../ui/LoadingState';
import '../../styles/ai-asset-popup.css';

export default function AssetPreviewModal({ asset, sourceUrl = '', onClose, onPostMarketplace }) {
	const navigate = useNavigate();
	const [url, setUrl] = useState('');
	const [error, setError] = useState('');
	const [showAiPopup, setShowAiPopup] = useState(true);
	const [vaults, setVaults] = useState([]);
	const [chosenVault, setChosenVault] = useState('');
	const [vaultMode, setVaultMode] = useState(false);
	const [vaultLoading, setVaultLoading] = useState(false);
	const [vaultSuccess, setVaultSuccess] = useState('');

	useEffect(() => {
		let active = true;
		let objectUrl = '';
		const previousOverflow = document.body.style.overflow;
		const handleKeyDown = (event) => {
			if (event.key === 'Escape') onClose();
		};
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', handleKeyDown);

		if (sourceUrl) {
			setUrl(sourceUrl);
		} else {
			assetService
				.getContentObjectUrl(asset.id)
				.then((nextUrl) => {
					objectUrl = nextUrl;
					if (active) setUrl(nextUrl);
					else URL.revokeObjectURL(nextUrl);
				})
				.catch((previewError) => {
					if (active) setError(previewError.message);
				});
		}

		// Fetch available vaults for smart addition
		vaultService
			.getVaults()
			.then((res) => {
				if (active && res?.vaults) {
					setVaults(res.vaults);
					if (res.vaults.length > 0) {
						setChosenVault(res.vaults[0].reference);
					}
				}
			})
			.catch(() => {});

		return () => {
			active = false;
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', handleKeyDown);
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [asset.id, onClose, sourceUrl]);

	async function handleConfirmAddToVault(e) {
		e.stopPropagation();
		if (!chosenVault) {
			navigate('/vault');
			onClose();
			return;
		}

		setVaultLoading(true);
		try {
			await vaultService.addAssets(chosenVault, [asset.id]);
			const vName = vaults.find((v) => v.reference === chosenVault)?.name || 'Vault';
			setVaultSuccess(`Successfully locked inside "${vName}"`);
			setTimeout(() => {
				setVaultMode(false);
				setVaultSuccess('');
			}, 2500);
		} catch (err) {
			setError(err.message || 'Failed to add to vault');
		} finally {
			setVaultLoading(false);
		}
	}

	function handleTriggerMarketplace(e) {
		e.stopPropagation();
		if (onPostMarketplace) {
			onPostMarketplace(asset);
		} else {
			navigate('/marketplace');
			onClose();
		}
	}

	function handleInspect(e) {
		e.stopPropagation();
		navigate(`/assets/${asset.id}/inspect`);
		onClose();
	}

	return (
		<div className="asset-preview-modal" role="dialog" aria-modal="true" aria-labelledby="asset-preview-title">
			<button type="button" className="asset-preview-modal__backdrop" onClick={onClose} aria-label="Close image preview" />
			<div className="asset-preview-modal__card">
				<header>
					<div>
						<span>
							<Image size={18} />
						</span>
						<div>
							<h2 id="asset-preview-title">Image preview</h2>
							<p>{asset.title}</p>
						</div>
					</div>
					<button type="button" className="icon-button" onClick={onClose} aria-label="Close image preview">
						<X size={18} />
					</button>
				</header>

				<div className="asset-preview-modal__content" style={{ position: 'relative' }}>
					{error ? (
						<div className="asset-preview-modal__error">
							<AlertCircle size={22} />
							<strong>Preview unavailable</strong>
							<p>{error}</p>
						</div>
					) : url ? (
						<img src={url} alt={`Full preview of ${asset.title}`} />
					) : (
						<LoadingState label="Loading image preview" />
					)}

					{/* AI Smart Suggestion Pop-up */}
					{showAiPopup && (
						<div className="ai-asset-popup" onClick={(e) => e.stopPropagation()}>
							<div className="ai-asset-popup__header">
								<span className="ai-asset-popup__tag">
									<Sparkles size={13} /> AI Smart Suggestion
								</span>
								<button
									type="button"
									className="ai-asset-popup__close"
									onClick={() => setShowAiPopup(false)}
									title="Dismiss recommendation"
									aria-label="Dismiss AI recommendation"
								>
									<X size={14} />
								</button>
							</div>

							<div className="ai-asset-popup__body">
								<p className="ai-asset-popup__message">
									This asset is cryptographically verified (<strong>SHA-256</strong>). What would you like to do next?
								</p>

								{vaultSuccess ? (
									<div className="ai-success-banner">
										<CheckCircle2 size={15} /> {vaultSuccess}
									</div>
								) : vaultMode ? (
									<div className="ai-vault-chooser">
										{vaults.length > 0 ? (
											<>
												<select
													className="ai-vault-select"
													value={chosenVault}
													onChange={(e) => setChosenVault(e.target.value)}
												>
													{vaults.map((v) => (
														<option key={v.reference} value={v.reference}>
															{v.name} ({v.reference})
														</option>
													))}
												</select>
												<button
													type="button"
													className="ai-vault-confirm-btn"
													disabled={vaultLoading}
													onClick={handleConfirmAddToVault}
												>
													{vaultLoading ? 'Locking…' : 'Lock in Vault'}
												</button>
											</>
										) : (
											<button
												type="button"
												className="ai-vault-confirm-btn"
												onClick={() => {
													navigate('/vault');
													onClose();
												}}
											>
												Go to Vaults & Create First
											</button>
										)}
										<button
											type="button"
											className="ai-asset-popup__close"
											onClick={() => setVaultMode(false)}
										>
											<X size={12} />
										</button>
									</div>
								) : (
									<div className="ai-asset-popup__actions">
										<button
											type="button"
											className="ai-action-btn ai-action-btn--vault"
											onClick={() => {
												if (vaults.length > 0) setVaultMode(true);
												else {
													navigate('/vault');
													onClose();
												}
											}}
										>
											<LockKeyhole size={14} /> Add to Vault
										</button>

										<button
											type="button"
											className="ai-action-btn ai-action-btn--market"
											onClick={handleTriggerMarketplace}
										>
											<Store size={14} /> Post in Marketplace
										</button>

										<button
											type="button"
											className="ai-action-btn ai-action-btn--inspect"
											onClick={handleInspect}
										>
											<ExternalLink size={13} /> Inspect Details
										</button>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				<footer>
					<span>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : asset.mimeType || 'Image'}</span>
					<span>{asset.id ? `Asset #${asset.id}` : 'Comparison image'}</span>
				</footer>
			</div>
		</div>
	);
}
