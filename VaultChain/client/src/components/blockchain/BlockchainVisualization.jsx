import { useEffect, useId, useState } from 'react';
import { ArrowRight, Box, CheckCircle2, Fingerprint, Link2, RotateCcw, ShieldCheck, TriangleAlert, UploadCloud } from 'lucide-react';
import Button from '../ui/Button';
import CopyButton from '../ui/CopyButton';
import { buildDemoChain, hashBlock, inspectDemoChain } from './chainDemo.mjs';
import '../../styles/blockchain.css';

const steps = [
	{ title: 'Start with an asset', icon: UploadCloud, detail: 'An asset and an ownership event provide the information to record. This walkthrough uses example events; it does not upload or transfer anything.', caption: 'Asset + ownership event' },
	{ title: 'Make a fingerprint', icon: Fingerprint, detail: 'VaultChain creates a SHA-256 fingerprint from the uploaded file and metadata. A fingerprint identifies the input; on its own it is not proof that a blockchain transaction happened.', caption: 'File + metadata → SHA-256' },
	{ title: 'Build a block', icon: Box, detail: 'In this model, the event, asset fingerprint, block number, and previous block’s hash are hashed together to produce a new block hash.', caption: 'Event + fingerprint + previous hash → block hash' },
	{ title: 'Link the chain', icon: Link2, detail: 'Each new block stores the preceding block’s hash. Follow the matching values below to see how the records connect, from the first block to the latest.', caption: 'Previous block hash = next block’s previous hash' },
	{ title: 'Check for changes', icon: ShieldCheck, detail: 'Recalculate hashes and compare the links. Try changing the middle event: its new hash no longer matches the value kept by the next block. Real networks also need consensus to agree on an accepted history.', caption: 'Recompute hashes → compare links → inspect history' },
];
const shortHash = (value) => `${value.slice(0, 10)}…${value.slice(-6)}`;

export default function BlockchainVisualization({ fingerprint, assetTitle }) {
	const id = useId();
	const [step, setStep] = useState(0);
	const [selected, setSelected] = useState(0);
	const [tampered, setTampered] = useState(false);
	const [model, setModel] = useState(null);
	const [busy, setBusy] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;
		setBusy(true); setError(''); setModel(null);
		async function prepare() {
			try {
				const blocks = await buildDemoChain(fingerprint || undefined);
				if (tampered) {
					blocks[1] = { ...blocks[1], event: 'Ownership record changed' };
					blocks[1].hash = await hashBlock(blocks[1]);
				}
				const checks = await inspectDemoChain(blocks);
				if (active) setModel({ blocks, checks });
			} catch (failure) { if (active) setError(failure.message); }
			finally { if (active) setBusy(false); }
		}
		prepare();
		return () => { active = false; };
	}, [fingerprint, tampered]);

	const block = model?.blocks[selected];
	const check = model?.checks[selected];
	function reset() { setTampered(false); setStep(0); setSelected(0); }

	return <section className="chain-view" aria-labelledby={`${id}-title`}>
		<header className="chain-view__header">
			<div><span className="chain-view__eyebrow"><Link2 size={15}/> INTERACTIVE WALKTHROUGH</span><h2 id={`${id}-title`}>See how the chain connects.</h2><p>Follow a record from its fingerprint to a linked history. Select any step or block to explore.</p></div>
			<span className="chain-view__badge">Educational simulation</span>
		</header>
		<div className="chain-view__notice"><InfoMark/><span>{fingerprint ? <>Using the stored fingerprint of <strong>{assetTitle || 'this asset'}</strong> with example events. </> : 'Using example data. '}These blocks are generated in your browser, not recorded transactions.</span></div>
		<ol className="chain-steps" aria-label="Blockchain process">{steps.map(({ title, icon: Icon }, index) => <li key={title}><button type="button" aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)} className={step === index ? 'is-active' : ''}><span className="chain-steps__icon"><Icon size={22}/></span><small>0{index + 1}</small><strong>{title}</strong></button>{index < steps.length - 1 && <ArrowRight className="chain-steps__arrow" size={17} aria-hidden="true"/>}</li>)}</ol>
		<div className="chain-explanation" aria-live="polite"><div><span>STEP {step + 1} OF {steps.length}</span><h3>{steps[step].title}</h3><p>{steps[step].detail}</p><code>{steps[step].caption}</code></div><div className="chain-explanation__actions"><Button type="button" variant="secondary" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</Button><Button type="button" size="sm" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>Next step</Button></div></div>
		<div className="chain-view__section-title"><div><h3>A chain of three example blocks</h3><p>Read left to right. Select a block to inspect its full hashes.</p></div><Button type="button" variant="secondary" size="sm" icon={RotateCcw} onClick={reset}>Reset walkthrough</Button></div>
		{busy && <p role="status">Calculating block hashes…</p>}
		{error && <p className="error-banner" role="alert">{error}</p>}
		{model && <>
			<div className="chain-blocks" aria-label="Example blockchain">{model.blocks.map((entry, index) => <div className="chain-blocks__entry" key={entry.index}>
				{index > 0 && <div className={`chain-link ${model.checks[index].linkMatches ? '' : 'is-broken'}`}><Link2 size={19}/><span>{model.checks[index].linkMatches ? 'Hash matches' : 'Link broken'}</span><ArrowRight size={18}/></div>}
				<button type="button" className={`chain-block ${selected === index ? 'is-selected' : ''} ${!model.checks[index].valid ? 'is-invalid' : ''}`} aria-pressed={selected === index} onClick={() => setSelected(index)}>
					<span className="chain-block__top"><Box size={20}/><span>BLOCK 0{index}</span></span><strong>{entry.event}</strong><small>{index === 0 ? 'First block · genesis' : index === 2 ? 'Latest example block' : 'Ownership event'}</small>
					<span className="chain-block__hash"><span>Previous hash</span><code>{shortHash(entry.previousHash)}</code></span><span className="chain-block__hash"><span>This block’s hash</span><code>{shortHash(entry.hash)}</code></span>
					<span className="chain-block__status">{model.checks[index].valid ? <CheckCircle2 size={14}/> : <TriangleAlert size={14}/>} {model.checks[index].valid ? 'Consistent' : 'Broken history'}</span>
				</button>
			</div>)}</div>
			<div className="chain-detail"><div className="chain-view__section-title"><div><span className="chain-view__eyebrow">SELECTED BLOCK 0{block.index}</span><h3>{block.event}</h3></div><span>{check.valid ? 'Hash and history checks pass' : 'History check failed'}</span></div>
				<dl>{[['Asset fingerprint', block.fingerprint], ['Previous block hash', block.previousHash], ['This block’s hash', block.hash]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><code>{value}</code><CopyButton value={value}/></dd></div>)}</dl>
				<p>{selected === 0 ? 'The first block uses an all-zero previous hash because there is no earlier block.' : check.linkMatches ? `This previous hash matches block 0${selected - 1}’s hash.` : `This previous hash still points to the original block 0${selected - 1}. It no longer matches the changed block’s hash.`}</p>
			</div>
		</>}
		<div className={`chain-experiment ${tampered ? 'is-tampered' : ''}`}><div><span className="chain-view__eyebrow"><TriangleAlert size={15}/> TRY IT YOURSELF</span><h3>What happens if an earlier record changes?</h3><p aria-live="polite">{tampered ? 'Block 01 has a changed event and a recalculated hash. Block 02 still carries the old hash, so its link breaks. Restore the example to reconnect the chain.' : 'Change the middle block and watch the next link break. This only changes the example on this screen.'}</p></div><Button type="button" variant="secondary" disabled={busy || !!error} onClick={() => { setTampered(!tampered); setStep(4); setSelected(2); }}>{tampered ? 'Restore example' : 'Change middle block'}</Button></div>
	</section>;
}

function InfoMark() { return <Fingerprint size={18} aria-hidden="true"/>; }
