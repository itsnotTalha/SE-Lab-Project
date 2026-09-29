import { ArrowRight, Check, ChevronDown, FileImage, FileText, Fingerprint, FolderLock, LayoutDashboard, Link2, Moon, Pause, Play, ShieldCheck, Sparkles, Sun, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from '../../components/ui/BrandLogo';
import FeatureShowcase from '../../components/landing/FeatureShowcase';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/landing-refined.css';

const questions = [
	['How does automatic OCR work?', 'Image documents try local English OCR first. Clear results stay local. When recognition is unclear, Gemini can transcribe Bengali and English handwriting if configured. This uses recognition quality, not a definitive handwriting detector. Online transcription sends the image to Google. PDFs remain local.'],
	['What can I upload?', 'Image assets support JPG, PNG and WebP. Documents support PDF, JPG and PNG. General uploads support up to 20 MB; Gemini image transcription supports up to 14 MB.'],
	['What happens if online OCR is unavailable?', 'Available local text is retained with a review warning. If online OCR fails and there is no local text, extraction can be retried. Your original stays in the library.'],
	['What does verification prove?', 'Fingerprints and comparisons help establish file integrity and similarity. They do not independently prove authorship or copyright. Review extracted text against the original, especially for handwriting.'],
	['Are vaults and marketplace previews private?', 'Vaults control asset access through passwords and timed unlock sessions. They do not encrypt stored files. Buyers of vault listings request preview approval, which is specific to each buyer and can be revoked.'],
	['Is this a live blockchain?', 'The blockchain explorer is an educational simulation. You can inspect linked example blocks and change a record to see the next link break. It does not record blockchain transactions.'],
];

function ProductPreview() {
	return <div className="landing-product" aria-label="Illustrative VaultChain workspace preview">
		<div className="landing-product__bar"><span><i/><i/><i/></span><span>vaultchain / workspace</span><span>PRODUCT PREVIEW</span></div>
		<div className="landing-product__body">
			<aside aria-hidden="true"><span className="landing-product__mark">V</span><LayoutDashboard size={18}/><FileImage size={18}/><FileText size={18}/><FolderLock size={18}/><Link2 size={18}/></aside>
			<div className="landing-product__main"><header><div><small>YOUR CREATIVE WORKSPACE</small><h2>Everything, accounted for.</h2></div><span><ShieldCheck size={20}/></span></header>
				<div className="landing-product__asset"><div className="landing-product__landscape"><span/><i/></div><div><span className="landing-label">ORIGINAL ASSET</span><h3>Summer collection</h3><p>Image · Metadata · Fingerprints</p><span className="landing-product__chip"><Fingerprint size={13}/> Inspectable identity</span></div></div>
				<div className="landing-product__document"><div><span className="landing-product__file"><FileText size={22}/></span><div><strong>From notes to knowledge</strong><small>Automatic document OCR</small></div></div><div className="landing-product__route"><span>Original</span><ArrowRight size={13}/><span>Local check</span><ArrowRight size={13}/><span>Transcription</span></div><p><span lang="bn">আপনার নোট, পরিষ্কার টেক্সটে।</span><small>Bengali + English handwriting support through Gemini</small></p></div>
				<footer><Check size={14}/><span>Keep the original. Inspect the evidence.</span><span>EXAMPLE</span></footer>
			</div>
		</div>
	</div>;
}

export default function LandingPage() {
	const { theme, toggleTheme, motionEnabled, toggleMotion } = useTheme();
	return <div className="story-landing landing-refined">
		<a href="#landing-main" className="workspace-skip">Skip to content</a>
		<header className="landing-nav"><div className="story-container"><Link to="/" aria-label="VaultChain home"><BrandLogo/></Link><nav aria-label="Page sections"><a href="#features">Product</a><a href="#workflow">How it works</a><a href="#questions">FAQs</a></nav><div><button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><Link className="landing-login" to="/login">Sign in</Link><Link to="/register" className="story-button story-button--primary">Get started <ArrowRight size={15}/></Link></div></div></header>
		<main id="landing-main" tabIndex={-1}>
			<section className="landing-hero story-container"><div className="landing-hero__copy"><span className="landing-label"><span className="landing-dot"/> A CLEARER HOME FOR YOUR ORIGINALS</span><h1>Your work.<br/>Your evidence.<br/><em>All in one place.</em></h1><p>Collect your images. Transcribe your notes. Verify what changed. A thoughtful workspace for the files that matter to you.</p><div className="landing-hero__actions"><Link to="/register" className="story-button story-button--primary">Create your workspace <ArrowRight size={17}/></Link><a href="#features" className="story-button story-button--outline">Explore the product</a></div><div className="landing-hero__details"><span><Check size={14}/> Original files preserved</span><span><Check size={14}/> Evidence you can inspect</span></div></div><ProductPreview/></section>
			<div className="landing-capabilities story-container" aria-label="Core capabilities">{[[FileImage, 'Originals'], [FileText, 'Auto OCR'], [Fingerprint, 'Verification'], [FolderLock, 'Vaults'], [ShieldCheck, 'Controlled sharing']].map(([Icon, text]) => <span key={text}><Icon size={18}/>{text}</span>)}</div>
			<FeatureShowcase/>
			<section className="landing-workflow story-container" id="workflow"><header><span className="landing-label">A SIMPLE WAY TO GET STARTED</span><h2>Less searching.<br/>More understanding.</h2><p>From the first upload to your next exchange, keep the context with the file.</p></header><div>{[
				{ icon: UploadCloud, title: 'Bring your originals', text: 'Upload an image or document. Keep its original appearance and build a searchable library.' },
				{ icon: Fingerprint, title: 'Read the evidence', text: 'Review fingerprints, document text and comparison reports. Inspect details beside the original.' },
				{ icon: FolderLock, title: 'Choose the next step', text: 'Organize assets in vaults, manage preview access, or list an asset in the marketplace.' },
			].map(({ icon: Icon, title, text }, index) => <article key={title}><div><Icon size={24}/><span>0{index + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
			<section className="landing-insights story-container"><div><span className="landing-label"><Sparkles size={14}/> A WORKSPACE THAT EXPLAINS ITSELF</span><h2>Know what’s in your library.<br/>And what’s happening to it.</h2><p>Follow creation and verification activity, review OCR status, and see marketplace earnings and spending. Your dashboard brings the details into focus.</p><Link to="/login" className="story-button story-button--outline">Open your dashboard <ArrowRight size={16}/></Link></div><div className="landing-insights__grid">{[['Collection', 'Images, documents & categories'], ['Processing', 'OCR status & verification outcomes'], ['Trading', 'Earnings & purchase activity'], ['Organization', 'Vault coverage & active listings']].map(([title, text]) => <article key={title}><span>{title}</span><strong>{text}</strong></article>)}</div></section>
			<section className="landing-questions story-container" id="questions"><header><span className="landing-label">GOOD QUESTIONS. CLEAR ANSWERS.</span><h2>A little clarity<br/>before you begin.</h2></header><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={17}/></summary><p>{answer}</p></details>)}</div></section>
			<section className="landing-cta story-container"><div><span className="landing-label">MAKE ROOM FOR YOUR NEXT IDEA</span><h2>Your originals deserve<br/>a better home.</h2><p>Start with one file. Build a clearer picture.</p></div><Link to="/register" className="story-button story-button--primary">Get started with VaultChain <ArrowRight size={18}/></Link></section>
		</main>
		<footer className="landing-footer story-container"><Link to="/" aria-label="VaultChain home"><BrandLogo/></Link><span>Originals. Evidence. Your control.</span><a href="#features">Explore features</a><button type="button" aria-pressed={motionEnabled} onClick={toggleMotion}>{motionEnabled ? <Pause size={14}/> : <Play size={14}/>} {motionEnabled ? 'Pause motion' : 'Enable motion'}</button><small>© {new Date().getFullYear()} VaultChain</small></footer>
	</div>;
}
