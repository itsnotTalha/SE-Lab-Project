import { lazy, Suspense, useState } from 'react';
import { ArrowRight, BarChart3, Check, FileImage, FileText, Fingerprint, FolderLock, Link2, ShieldCheck, Store, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingState from '../ui/LoadingState';
import '../../styles/feature-showcase.css';

const BlockchainVisualization = lazy(() => import('../blockchain/BlockchainVisualization'));
const features = [
	{ id: 'ocr', icon: FileText, label: 'Auto OCR', title: 'From a handwritten page to searchable text.', description: 'Local recognition runs first. Unclear images can move to Gemini for Bengali and English transcription when configured. Explore the routing with these sample cases.' },
	{ id: 'library', icon: FileImage, label: 'Upload & library', title: 'Keep the original and the evidence together.', description: 'Choose image asset or document upload, then find your files in their respective libraries.', steps: ['Choose an image or document', 'Save the original and fingerprints', 'Inspect details in your library'], records: [['Image assets', 'JPG / PNG / WebP'], ['Documents', 'PDF / JPG / PNG'], ['Upload limit', '20 MB per file']], note: 'Document images use Auto OCR. Gemini transcription accepts images up to 14 MB.' },
	{ id: 'verification', icon: Fingerprint, label: 'Verification', title: 'Different checks answer different questions.', description: 'Inspect exact fingerprints, visual similarity, document metadata, and extracted text to understand how files relate.', steps: ['Choose the evidence to compare', 'Check fingerprints and similarity', 'Review the report beside the original'], records: [['SHA-256', 'Cryptographic identity'], ['Perceptual hash', 'Visual similarity'], ['Document comparison', 'File, metadata and text']], note: 'Comparison results provide evidence; they do not independently prove authorship.' },
	{ id: 'vaults', icon: FolderLock, label: 'Vaults', title: 'A collection with controlled access.', description: 'Organize image assets into password-protected vaults with locking and timed unlock sessions.', steps: ['Create a vault', 'Add assets and set access protection', 'Unlock when you need to work'], records: [['Organization', 'Named asset collections'], ['Access', 'Password protection'], ['Auto-lock', '5, 10 or 30 minutes']], note: 'Vaults control access to assets; stored files are not encrypted by this feature. Documents stay in the document library.' },
	{ id: 'marketplace', icon: Store, label: 'Marketplace', title: 'From a private original to an approved exchange.', description: 'Create listings, choose seller visibility, and manage buyer preview requests for vault assets.', steps: ['Create a listing', 'Review buyer preview requests', 'Complete an ownership transfer'], records: [['Seller visibility', 'Named or anonymous'], ['Preview requests', 'Approve, decline or revoke'], ['After purchase', 'Asset moves to buyer’s library']], note: 'Preview approval is specific to each buyer and does not unlock your vault.' },
	{ id: 'wallet', icon: WalletCards, label: 'Wallet & activity', title: 'Follow the value and the ownership history.', description: 'Use VaultChain Credits for marketplace purchases and inspect recorded wallet and ownership activity.', steps: ['Review your credit balance', 'Purchase a listed asset', 'Inspect the transaction and transfer'], records: [['Wallet', 'Credit balance and transactions'], ['Earnings', 'Sales and seller proceeds'], ['History', 'Recorded ownership transfers']], note: 'VaultChain Credits are the application’s marketplace balance.' },
	{ id: 'insights', icon: BarChart3, label: 'Insights & admin', title: 'See what is happening across your workspace.', description: 'Your dashboard summarizes assets, activity and vault coverage. Authorized administrators have separate management and reporting tools.', steps: ['Review dashboard activity', 'Explore analytics and reports', 'Manage permitted administrative actions'], records: [['Personal dashboard', 'Assets, reports and activity'], ['Administration', 'Users, assets and marketplace'], ['Operations', 'Revenue, logs and settings']], note: 'Administrative pages and actions depend on the signed-in account’s role.' },
	{ id: 'blockchain', icon: Link2, label: 'Blockchain', title: 'Understand why the links matter.', description: 'Explore how fingerprints connect example blocks, inspect hashes, and change a record to see a broken link. This is an educational simulation, not a live blockchain ledger.' },
];

const samples = {
	printed: { label: 'Printed image', name: 'project-notes.png', input: 'PROJECT NOTES\nReview the original file.\nCompare the stored fingerprints.', check: 'Clear local recognition', route: 'Local OCR · Tesseract', output: 'PROJECT NOTES\nReview the original file.\nCompare the stored fingerprints.', note: 'A readable, high-confidence local result stays local. No online transcription is needed.' },
	handwriting: { label: 'Handwritten note', name: 'class-notes.jpg', input: 'ক্লাস নোট\nডেটা বাস → তথ্য আদান-প্রদান\nAddress / Data Bus', check: 'Local recognition is unclear', route: 'Online OCR · Gemini', output: 'ক্লাস নোট\n• ডেটা বাস: তথ্য আদান-প্রদান\n• Address / Data Bus', note: 'With Gemini configured, an unclear image is sent online for transcription. Bengali and English text can be preserved together.' },
	pdf: { label: 'Digital PDF', name: 'project-report.pdf', input: 'PROJECT REPORT\n1. Store originals\n2. Compare evidence\n3. Review results', check: 'Embedded text is available', route: 'Local PDF extraction', output: 'PROJECT REPORT\n1. Store originals\n2. Compare evidence\n3. Review results', note: 'PDFs use local extraction. Scanned PDF pages use local OCR within the supported page limits.' },
	offline: { label: 'Online unavailable', name: 'unclear-notes.jpg', input: 'Meeting notes\nReview original\n… unclear handwriting …', check: 'Local result needs review', route: 'Local text retained · Review needed', output: 'Meeting notes\nReview original\n[Sample partial transcription]', note: 'If online OCR fails, available local text is retained with a warning. If no local text is available, extraction fails and can be retried.' },
};

function AutoOcrDemo() {
	const [sample, setSample] = useState('handwriting');
	const current = samples[sample];
	return <div className="feature-ocr">
		<div className="feature-ocr__choices" role="group" aria-label="Choose an OCR demonstration">{Object.entries(samples).map(([key, item]) => <button type="button" key={key} aria-pressed={sample === key} onClick={() => setSample(key)}>{item.label}</button>)}</div>
		<div className="feature-ocr__flow" aria-live="polite" aria-atomic="true" key={sample}>
			<article><span className="story-kicker">01 / ORIGINAL EXAMPLE</span><h4><FileText size={17}/>{current.name}</h4><pre className={sample === 'handwriting' ? 'is-handwriting' : ''}>{current.input}</pre><small>Illustrative text sample</small></article>
			<article className="feature-ocr__decision"><span className="story-kicker">02 / AUTOMATIC SELECTION</span><Fingerprint size={32}/><h4>{current.check}</h4><ArrowRight size={22} aria-hidden="true"/><strong>{current.route}</strong></article>
			<article><span className="story-kicker">03 / TRANSCRIPTION EXAMPLE</span><h4>Text you can review</h4><pre>{current.output}</pre><small>Compare with the original before relying on it.</small></article>
		</div>
		<p className="feature-showcase__note"><ShieldCheck size={18}/><span>{current.note}</span></p>
		<p className="feature-ocr__disclosure">These are prepared examples, not live OCR results. Auto selection uses recognition quality, not a definitive handwriting detector. Online transcription requires a configured Gemini key and sends the image to Google.</p>
	</div>;
}

export default function FeatureShowcase() {
	const [selected, setSelected] = useState('ocr');
	const current = features.find((feature) => feature.id === selected);
	return <section className="feature-showcase story-container" id="features" aria-labelledby="feature-showcase-title">
		<div className="story-section-heading"><span className="story-kicker">EXPLORE THE WHOLE WORKSPACE</span><h2 id="feature-showcase-title">One project.<br/>Follow every feature.</h2><p>Try the examples, follow the flow, and see how your originals, documents and ownership records fit together.</p></div>
		<div className="feature-showcase__choices" role="group" aria-label="Choose a project feature">{features.map(({ id, icon: Icon, label }) => <button type="button" key={id} aria-pressed={selected === id} aria-controls="feature-showcase-panel" onClick={() => setSelected(id)}><Icon size={19}/><span>{label}</span></button>)}</div>
		<div className="feature-showcase__panel" id="feature-showcase-panel" key={selected}>
			<header aria-live="polite"><span className="story-kicker">{current.label} / FEATURE TOUR</span><h3>{current.title}</h3><p>{current.description}</p></header>
			{selected === 'ocr' ? <AutoOcrDemo/> : selected === 'blockchain' ? <Suspense fallback={<LoadingState label="Loading blockchain demonstration"/>}><BlockchainVisualization/></Suspense> : <>
				<ol className="feature-showcase__steps">{current.steps.map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong>{index < current.steps.length - 1 && <ArrowRight size={19} aria-hidden="true"/>}</li>)}</ol>
				<dl className="feature-showcase__records">{current.records.map(([label, value]) => <div key={label}><dt><Check size={16}/>{label}</dt><dd>{value}</dd></div>)}</dl>
				<p className="feature-showcase__note"><ShieldCheck size={18}/><span>{current.note}</span></p>
			</>}
			<footer><span>Ready to try it with your own files?</span><Link className="story-button story-button--primary" to="/register">Create your workspace <ArrowRight size={16}/></Link></footer>
		</div>
	</section>;
}
