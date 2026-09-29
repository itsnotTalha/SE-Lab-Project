import { Check, CheckCircle2, Copy, Download, ExternalLink, Printer, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SecurityReceiptModal({ open, onClose, receipt }) {
	const navigate = useNavigate();
	const [copied, setCopied] = useState(false);

	const barcodeBars = useMemo(() => {
		const str = receipt?.transactionReference || 'VC-TXN-000000';
		const bars = [];
		for (let i = 0; i < 48; i++) {
			const code = str.charCodeAt(i % str.length);
			const width = ((code * (i + 1)) % 4) + 1.5;
			bars.push({ width, id: i });
		}
		return bars;
	}, [receipt?.transactionReference]);

	if (!open || !receipt) return null;

	const txRef = receipt.transactionReference || 'TXN-PENDING';
	const assetTitle = receipt.asset?.title || 'Registered Digital Asset';
	const assetRef = receipt.asset?.reference || 'VC-A-000';
	const price = Number(receipt.price || 0).toLocaleString();
	const buyerBalance = receipt.buyerBalance != null ? Number(receipt.buyerBalance).toLocaleString() : null;
	const timestamp = receipt.createdAt ? new Date(receipt.createdAt).toLocaleString() : new Date().toLocaleString();
	const cleanAssetId = assetRef.replace(/^VC-A-?/, '');

	function handleCopy() {
		navigator.clipboard.writeText(txRef);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	function handlePrint() {
		window.print();
	}

	function handleInspect() {
		onClose?.();
		navigate(`/assets/${cleanAssetId}/inspect`);
	}

	return (
		<div className="security-receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
			<div className="security-receipt-backdrop" onClick={onClose} />
			<div className="security-receipt-card">
				{/* Top Header */}
				<header className="receipt-header-banner">
					<div className="receipt-brand">
						<div className="receipt-brand-icon">
							<ShieldCheck size={20} />
						</div>
						<div className="receipt-brand-text">
							<h3 id="receipt-title">VaultChain Settlement</h3>
							<span>Cryptographic Security Receipt</span>
						</div>
					</div>
					<button className="receipt-close-btn" type="button" onClick={onClose} aria-label="Close receipt">
						<X size={17} />
					</button>
				</header>

				{/* Receipt Body */}
				<div className="receipt-body">
					<div className="receipt-main-highlight">
						<div className="receipt-status-pill">
							<CheckCircle2 size={13} />
							<span>Verified Ownership Transfer</span>
						</div>
						<div className="receipt-amount-label" style={{ marginTop: '10px' }}>Total Amount Paid</div>
						<div className="receipt-amount-value">
							{price}
							<span className="receipt-amount-currency">Credits</span>
						</div>
					</div>

					<div className="receipt-details-list">
						<div className="receipt-row">
							<span className="receipt-row-label">Transaction Ref</span>
							<span className="receipt-row-value">
								<code className="receipt-code">{txRef}</code>
								<button
									type="button"
									onClick={handleCopy}
									style={{ background: 'none', border: 0, color: copied ? '#42d69d' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
									title="Copy reference"
								>
									{copied ? <Check size={14} /> : <Copy size={14} />}
								</button>
							</span>
						</div>

						<div className="receipt-row">
							<span className="receipt-row-label">Timestamp</span>
							<span className="receipt-row-value" style={{ fontSize: '0.7rem' }}>{timestamp}</span>
						</div>

						<div className="receipt-row">
							<span className="receipt-row-label">Purchased Asset</span>
							<span className="receipt-row-value" style={{ maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
								{assetTitle}
							</span>
						</div>

						<div className="receipt-row">
							<span className="receipt-row-label">Asset Token ID</span>
							<span className="receipt-row-value">
								<code className="receipt-code">{assetRef}</code>
							</span>
						</div>

						<div className="receipt-row">
							<span className="receipt-row-label">Network Escrow Fee</span>
							<span className="receipt-row-value" style={{ color: '#42d69d' }}>0.00 Credits (Free)</span>
						</div>

						{buyerBalance !== null && (
							<div className="receipt-row">
								<span className="receipt-row-label">Updated Balance</span>
								<span className="receipt-row-value">{buyerBalance} Credits</span>
							</div>
						)}
					</div>

					{/* Perforation cutout */}
					<div className="receipt-perforation">
						<div className="receipt-perforation-line" />
					</div>

					{/* Security Cryptographic Seal */}
					<div className="receipt-security-seal">
						<div className="receipt-seal-header">
							<span>Ledger Seal & Authenticity Proof</span>
							<span style={{ color: '#42d69d' }}>● IMMUTABLE</span>
						</div>
						<div className="receipt-hash-block">
							SHA256:{receipt.transactionReference ? `0x${receipt.transactionReference.replace(/-/g, '').toLowerCase()}fc89e021a8d` : '0x7f9a14c3e809b23f5b82c7a10df3a1b'}
						</div>
						{/* Simulated Barcode */}
						<div className="receipt-barcode" aria-hidden="true">
							{barcodeBars.map((bar) => (
								<div
									key={bar.id}
									className="barcode-bar"
									style={{ width: `${bar.width}px` }}
								/>
							))}
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<footer className="receipt-actions">
					<button
						type="button"
						className="receipt-btn-secondary"
						onClick={handlePrint}
						title="Print or Save PDF"
					>
						<Printer size={15} />
						<span>Print</span>
					</button>
					<button
						type="button"
						className="receipt-btn-primary"
						onClick={handleInspect}
					>
						<span>Inspect Asset</span>
						<ExternalLink size={15} />
					</button>
				</footer>
			</div>
		</div>
	);
}
