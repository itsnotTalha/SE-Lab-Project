import { ArrowRight, Check, DollarSign, Lock, Send, ShieldCheck, Tag, X } from 'lucide-react';
import { useState } from 'react';
import Button from '../ui/Button';
import '../../styles/negotiation-chat.css';

export default function NegotiationChatModal({ open, onClose, listing, onAcceptOffer }) {
	const [messages, setMessages] = useState([
		{
			id: 1,
			sender: 'seller',
			text: 'Hello! Thanks for your interest in this asset. Private cryptographic channel established.',
			time: 'Just now',
		},
	]);
	const [inputText, setInputText] = useState('');
	const [counterPrice, setCounterPrice] = useState('');
	const [showCounterBox, setShowCounterBox] = useState(false);

	if (!open || !listing) return null;

	function handleSendMessage(e) {
		e?.preventDefault();
		if (!inputText.trim()) return;

		const userMsg = {
			id: Date.now(),
			sender: 'me',
			text: inputText,
			time: 'Just now',
		};
		setMessages((prev) => [...prev, userMsg]);
		setInputText('');

		setTimeout(() => {
			setMessages((prev) => [
				...prev,
				{
					id: Date.now() + 1,
					sender: 'seller',
					text: "I received your note. I'm open to discussing adjustments if you submit a formal offer.",
					time: 'Just now',
				},
			]);
		}, 1200);
	}

	function handleSendOffer(e) {
		e?.preventDefault();
		const p = parseFloat(counterPrice);
		if (!p || p <= 0) return;

		const offerMsg = {
			id: Date.now(),
			sender: 'me',
			isOffer: true,
			amount: p,
			time: 'Just now',
		};
		setMessages((prev) => [...prev, offerMsg]);
		setShowCounterBox(false);
		setCounterPrice('');

		setTimeout(() => {
			setMessages((prev) => [
				...prev,
				{
					id: Date.now() + 1,
					sender: 'seller',
					isOffer: true,
					amount: Math.round(p * 1.05),
					sellerCounter: true,
					time: 'Just now',
				},
			]);
		}, 1600);
	}

	return (
		<div className="negotiation-modal" role="dialog" aria-modal="true">
			<div className="negotiation-backdrop" onClick={onClose} />
			<div className="negotiation-card">
				<header className="negotiation-header">
					<div className="negotiation-header-info">
						<div className="negotiation-lock-icon">
							<Lock size={18} />
						</div>
						<div>
							<h3>Negotiate: {listing.title}</h3>
							<span>
								<ShieldCheck size={12} />
								End-to-End Encrypted Session
							</span>
						</div>
					</div>
					<button className="icon-button" onClick={onClose}>
						<X size={18} />
					</button>
				</header>

				<div className="negotiation-messages">
					{messages.map((m) => {
						if (m.isOffer) {
							return (
								<div key={m.id} className="offer-card">
									<div className="offer-card-badge">
										{m.sellerCounter ? 'Seller Counter-Offer' : 'Your Counter-Offer'}
									</div>
									<div className="offer-card-amount">
										{Number(m.amount).toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>Credits</span>
									</div>
									<div className="chat-bubble-meta" style={{ justifyContent: 'center' }}>
										<span>{m.time}</span>
									</div>
									{m.sellerCounter && (
										<div className="offer-actions">
											<Button
												size="small"
												onClick={() => {
													onAcceptOffer?.(m.amount);
													onClose();
												}}
											>
												<Check size={14} /> Accept & Buy
											</Button>
										</div>
									)}
								</div>
							);
						}

						return (
							<div key={m.id} className={`chat-bubble ${m.sender === 'me' ? 'mine' : 'theirs'}`}>
								<div>{m.text}</div>
								<div className="chat-bubble-meta">
									<span>{m.sender === 'me' ? 'You' : 'Seller'}</span> • <span>{m.time}</span>
								</div>
							</div>
						);
					})}
				</div>

				<footer className="negotiation-footer">
					{showCounterBox ? (
						<form onSubmit={handleSendOffer} className="negotiation-counter-row">
							<Tag size={16} style={{ color: '#f8bc4e' }} />
							<input
								type="number"
								step="1"
								placeholder={`Propose price (Current: ${listing.price})`}
								value={counterPrice}
								onChange={(e) => setCounterPrice(e.target.value)}
								style={{ flex: 1, background: 'none', border: 0, color: '#fff', outline: 'none' }}
								autoFocus
							/>
							<Button size="small" type="submit">Submit Offer</Button>
							<button type="button" onClick={() => setShowCounterBox(false)} style={{ background: 'none', border: 0, color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
						</form>
					) : (
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
								Current Ask: <strong>{Number(listing.price).toLocaleString()} Credits</strong>
							</span>
							<button
								type="button"
								className="slide-confirm-fallback-btn"
								onClick={() => setShowCounterBox(true)}
								style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
							>
								<DollarSign size={13} /> Submit Counter-Offer
							</button>
						</div>
					)}

					<form onSubmit={handleSendMessage} className="negotiation-input-row">
						<input
							type="text"
							className="input"
							placeholder="Type an encrypted message..."
							value={inputText}
							onChange={(e) => setInputText(e.target.value)}
							style={{ flex: 1 }}
						/>
						<Button type="submit" icon={Send}>Send</Button>
					</form>
				</footer>
			</div>
		</div>
	);
}
