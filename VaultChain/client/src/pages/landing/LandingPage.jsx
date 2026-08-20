import {
	ArrowRight, Braces, Check, ChevronRight, CircleCheck, Database, FileImage,
	Code2, Fingerprint, Image, Layers3, Link2, LockKeyhole, Menu, ScanLine,
	ShieldCheck, Sparkles, UploadCloud, X, Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import BrandLogo from '../../components/ui/BrandLogo';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';

const features = [
	{ icon: Fingerprint, title: 'Cryptographic fingerprinting', text: 'Generate a unique SHA-256 integrity fingerprint for every uploaded image.', tone: 'cyan' },
	{ icon: ScanLine, title: 'Perceptual matching', text: 'Identify visually identical images through compact perceptual signatures.', tone: 'violet' },
	{ icon: Database, title: 'Metadata intelligence', text: 'Extract dimensions, camera details, location, and available EXIF information.', tone: 'blue' },
	{ icon: Layers3, title: 'Duplicate protection', text: 'Stop duplicate images before they enter your digital asset collection.', tone: 'green' },
	{ icon: LockKeyhole, title: 'Secure digital vault', text: 'A private, encrypted home for high-value digital files.', tone: 'amber', soon: true },
	{ icon: ShieldCheck, title: 'Authenticity verification', text: 'A deeper verification workflow for proving asset integrity.', tone: 'violet', soon: true },
];

const steps = [
	{ n: '01', icon: UploadCloud, title: 'Upload', text: 'Choose an image from your device.' },
	{ n: '02', icon: Fingerprint, title: 'Fingerprint', text: 'Create SHA-256 and perceptual signatures.' },
	{ n: '03', icon: Braces, title: 'Analyze', text: 'Inspect metadata and image intelligence.' },
	{ n: '04', icon: ShieldCheck, title: 'Protect', text: 'Block duplicates and preserve its identity.' },
];

function LandingNavbar() {
	const { isAuthenticated } = useAuth();
	const [open, setOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 18);
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);
	const close = () => setOpen(false);
	return (
		<header className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
			<div className="landing-container landing-nav__inner">
				<Link to="/" className="landing-nav__brand" aria-label="VaultChain home"><BrandLogo /></Link>
				<nav className={`landing-nav__links ${open ? 'is-open' : ''}`} aria-label="Landing page navigation">
					<a href="#features" onClick={close}>Features</a><a href="#how-it-works" onClick={close}>How it works</a><a href="#security" onClick={close}>Security</a><a href="#about" onClick={close}>About</a>
					<div className="landing-nav__mobile-actions">{isAuthenticated ? <Link to="/dashboard" className="landing-button landing-button--primary" onClick={close}>Dashboard</Link> : <><Link to="/login" className="landing-button landing-button--secondary" onClick={close}>Sign in</Link><Link to="/register" className="landing-button landing-button--primary" onClick={close}>Get started</Link></>}</div>
				</nav>
				<div className="landing-nav__actions">{isAuthenticated ? <Link to="/dashboard" className="landing-button landing-button--primary">Dashboard <ArrowRight size={14} /></Link> : <><Link to="/login" className="landing-button landing-button--ghost">Sign in</Link><Link to="/register" className="landing-button landing-button--primary">Get started <ArrowRight size={14} /></Link></>}</div>
				<button type="button" className="landing-nav__toggle" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
			</div>
		</header>
	);
}

function HeroVisual() {
	return (
		<div className="hero-visual" aria-label="Illustration of a verified digital asset">
			<span className="hero-node hero-node--one" /><span className="hero-node hero-node--two" /><span className="hero-node hero-node--three" />
			<svg className="hero-connections" viewBox="0 0 600 570" aria-hidden="true"><path d="M70 140C180 160 155 260 252 260"/><path d="M515 85C410 130 460 205 390 235"/><path d="M548 430C435 420 458 334 401 325"/></svg>
			<div className="identity-card">
				<div className="identity-card__top"><div><span className="identity-card__file"><FileImage size={22} /></span><div><strong>Northern_Lights.png</strong><small>Digital image · 8.4 MB</small></div></div><StatusBadge tone="success"><CircleCheck size={10} /> Verified</StatusBadge></div>
				<div className="identity-card__preview"><div className="identity-card__orb"/><span className="identity-card__scan"/><div className="identity-card__mountains"><i/><i/><i/></div><span className="identity-card__secure"><ShieldCheck size={13} /> Integrity secured</span></div>
				<div className="identity-card__data"><div><span><Fingerprint size={14} /> SHA-256 fingerprint</span><code>6e3a9f1c4b72····98c42d18b7</code></div><div className="identity-card__columns"><div><span>Perceptual hash</span><code>81f0e1c31d8c</code></div><div><span>Metadata</span><strong>24 fields</strong></div></div></div>
				<div className="identity-card__footer"><span><Check size={12}/> No duplicate detected</span><small>Protected just now</small></div>
			</div>
			<div className="hero-float-card hero-float-card--hash"><Fingerprint size={15}/><div><span>Fingerprint generated</span><code>SHA-256</code></div></div>
			<div className="hero-float-card hero-float-card--meta"><Database size={15}/><div><span>Metadata analyzed</span><code>EXIF READY</code></div></div>
		</div>
	);
}

function ProductPreview() {
	return (
		<div className="product-preview reveal">
			<div className="preview-browser"><div className="preview-browser__dots"><i/><i/><i/></div><span>app.vaultchain / overview</span><span className="preview-browser__demo">Illustrative demo</span></div>
			<div className="preview-app">
				<aside><BrandLogo compact/><nav><span className="active"><Layers3/>Overview</span><span><Image/>Assets</span><span><ScanLine/>Verification</span><span><LockKeyhole/>Vault</span></nav></aside>
				<div className="preview-main"><header><div><small>Workspace</small><strong>Good evening, Alex</strong></div><span className="preview-avatar">A</span></header><div className="preview-stats"><div><small>Total assets</small><strong>24</strong><span>Demo data</span></div><div><small>Verified assets</small><strong>18</strong><span>Demo data</span></div><div><small>Vault items</small><strong>—</strong><span>Coming soon</span></div><div><small>Wallet</small><strong>1.2K</strong><span>Demo credits</span></div></div><div className="preview-content"><section><div className="preview-heading"><strong>Recent assets</strong><span>Demo preview</span></div><div className="preview-assets"><div><i/><span>Origin.jpg<small>Fingerprint active</small></span><CircleCheck/></div><div><i/><span>Canvas.png<small>Fingerprint active</small></span><CircleCheck/></div><div><i/><span>Archive.webp<small>Fingerprint active</small></span><CircleCheck/></div></div></section><section className="preview-security"><ShieldCheck/><strong>Security status</strong><div><span>Integrity</span><b>Protected</b></div><div><span>Duplicates</span><b>Monitored</b></div></section></div></div>
			</div>
		</div>
	);
}

export default function LandingPage() {
	return (
		<div className="landing-page">
			<LandingNavbar />
			<main>
				<section className="landing-hero"><div className="landing-glow landing-glow--one"/><div className="landing-glow landing-glow--two"/><div className="landing-container landing-hero__grid"><div className="landing-hero__copy"><span className="hero-badge"><Sparkles size={13}/> Digital ownership. Reimagined.</span><h1>Own it.<br/>Verify it.<br/><span>Protect it.</span></h1><p>VaultChain gives your digital assets a verifiable identity through secure hashing, metadata intelligence and authenticity tools.</p><div className="landing-hero__actions"><Link to="/register" className="landing-button landing-button--primary landing-button--lg">Create your vault <ArrowRight size={16}/></Link><a href="#features" className="landing-button landing-button--secondary landing-button--lg">Explore features <ChevronRight size={16}/></a></div><div className="landing-hero__note"><ShieldCheck size={14}/><span>JWT-protected access</span><i/><Fingerprint size={14}/><span>Unique asset fingerprints</span></div></div><HeroVisual /></div></section>

				<section className="trust-strip" aria-label="VaultChain technologies"><div className="landing-container trust-strip__inner">{[[Fingerprint,'SHA-256 Fingerprinting'],[ScanLine,'Perceptual Hashing'],[Database,'Metadata Intelligence'],[Layers3,'Duplicate Protection'],[LockKeyhole,'Secure Vaults','Vision']].map(([Icon,label,note])=><div key={label}><Icon size={16}/><span>{label}</span>{note?<small>{note}</small>:null}</div>)}</div></section>

				<section id="features" className="landing-section features-section"><div className="landing-container"><div className="section-heading reveal"><span>Core platform</span><h2>Trust, built into every asset.</h2><p>A focused toolkit for understanding what your files are, where they came from, and whether they have appeared before.</p></div><div className="feature-grid">{features.map(({ icon:Icon,title,text,tone,soon },i)=><article className={`feature-card feature-card--${tone} reveal`} key={title} style={{'--delay':`${i*.04}s`}}><div className="feature-card__icon"><Icon size={21}/></div><div>{soon?<StatusBadge tone="warning">In development</StatusBadge>:<span className="feature-card__live"><i/> Available now</span>}<h3>{title}</h3><p>{text}</p></div><ChevronRight className="feature-card__arrow" size={17}/></article>)}</div></div></section>

				<section id="how-it-works" className="landing-section workflow-section"><div className="landing-container"><div className="section-heading section-heading--center reveal"><span>How it works</span><h2>From upload to protected identity.</h2><p>Four focused steps transform an image into an inspectable digital record.</p></div><div className="workflow-grid">{steps.map(({n,icon:Icon,title,text})=><article className="workflow-step reveal" key={n}><div className="workflow-step__icon"><Icon size={21}/><span>{n}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

				<section className="landing-section product-section"><div className="landing-container"><div className="section-heading section-heading--center reveal"><span>One secure workspace</span><h2>See the full picture, instantly.</h2><p>Bring fingerprints, metadata, asset activity, and security signals into a single calm interface.</p></div><ProductPreview /></div></section>

				<section id="security" className="landing-section security-section"><div className="landing-container security-grid"><div className="security-copy reveal"><span className="hero-badge"><ShieldCheck size={13}/> Security by design</span><h2>Your files tell a story.<br/>VaultChain verifies it.</h2><p>Every supported upload moves through real integrity and intelligence checks before becoming part of your collection.</p><div className="security-points">{['SHA-256 integrity fingerprinting','Perceptual image signatures','Metadata and EXIF inspection','JWT-protected user access','Duplicate image detection'].map(x=><div key={x}><Check size={14}/><span>{x}</span></div>)}</div></div><div className="fingerprint-card reveal"><div className="fingerprint-card__header"><span><Fingerprint size={18}/></span><div><strong>Integrity fingerprint</strong><small>SHA-256 · 256-bit digest</small></div><StatusBadge tone="success">Protected</StatusBadge></div><code>98e7f1c4a2b6d098<br/>41fe2c70d36e9fa1<br/>bf726931db3c568e<br/>81ad5eea0b4f92c7</code><div className="fingerprint-card__checks"><div><span>Algorithm</span><strong>SHA-256</strong></div><div><span>Duplicate match</span><strong>None found</strong></div><div><span>Access</span><strong>JWT secured</strong></div></div><small className="fingerprint-card__note">Sample fingerprint for product illustration</small></div></div></section>

				<section id="about" className="landing-cta-section"><div className="landing-container"><div className="landing-cta reveal"><div className="landing-cta__glow"/><span><Zap size={14}/> Start building your secure collection</span><h2>Give your digital assets<br/>a verifiable identity.</h2><p>Create your workspace and fingerprint your first image in minutes.</p><div><Link to="/register" className="landing-button landing-button--primary landing-button--lg">Create free account <ArrowRight size={16}/></Link><Link to="/login" className="landing-button landing-button--secondary landing-button--lg">Sign in</Link></div></div></div></section>
			</main>
			<footer className="landing-footer"><div className="landing-container"><div className="landing-footer__top"><div><BrandLogo/><p>Built for secure digital ownership.</p></div><div className="landing-footer__links"><div><strong>Product</strong><a href="#features">Features</a><a href="#security">Security</a><a href="#how-it-works">How it works</a></div><div><strong>Platform</strong><Link to="/dashboard">Dashboard</Link><Link to="/assets">Assets</Link><Link to="/login">Sign in</Link></div><div><strong>Project</strong><a href="https://github.com/itsnotTalha/SE-Lab-Project" target="_blank" rel="noreferrer"><Code2 size={13}/> GitHub</a></div></div></div><div className="landing-footer__bottom"><span>© {new Date().getFullYear()} VaultChain</span><span><Link2 size={12}/> Authenticity starts with evidence.</span></div></div></footer>
		</div>
	);
}
