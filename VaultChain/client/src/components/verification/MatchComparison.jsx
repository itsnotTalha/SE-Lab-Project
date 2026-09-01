import { Blend, Columns3, FileImage, Maximize2, ScanSearch, X, ZoomIn } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { assetService } from '../../services/assetService';

export default function MatchComparison({ sourceUrl, source, match, score }) {
	const [mode, setMode] = useState('side');
	const [registeredUrl, setRegisteredUrl] = useState('');
	const [zoomOpen, setZoomOpen] = useState(false);

	useEffect(() => {
		let active = true;
		let objectUrl = '';
		if (!match?.asset?.id) { setRegisteredUrl(''); return undefined; }
		assetService.getContentObjectUrl(match.asset.id).then((url) => { objectUrl = url; if (active) setRegisteredUrl(url); else URL.revokeObjectURL(url); }).catch(() => setRegisteredUrl(''));
		return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
	}, [match?.asset?.id]);

	const canBlend = Boolean(sourceUrl && registeredUrl);
	return <section className="report-section match-comparison"><header><span><FileImage size={17}/></span><div><h3>Image comparison</h3><p>Inspect the uploaded source against the closest registered candidate</p></div><div className="comparison-modes"><button type="button" className={mode === 'side' ? 'is-active' : ''} onClick={() => setMode('side')}><Columns3 size={14}/>Side by side</button><button type="button" disabled={!canBlend} className={mode === 'overlay' ? 'is-active' : ''} onClick={() => setMode('overlay')}><Blend size={14}/>Overlay</button><button type="button" disabled={!canBlend} className={mode === 'difference' ? 'is-active' : ''} onClick={() => setMode('difference')}><ScanSearch size={14}/>Differences</button></div></header>
		{mode === 'side' ? <div className="match-comparison__side"><ComparisonPane label="Original upload" url={sourceUrl} fallback={source?.fileName || 'Uploaded image unavailable'} meta={source?.width && source?.height ? `${source.width} × ${source.height}` : source?.mimeType}/><div className="match-comparison__score"><strong>{score.toFixed(1)}%</strong><span>confidence</span><i/></div><ComparisonPane label="Registered asset" url={registeredUrl} fallback={match ? 'Preview protected by owner privacy' : 'No reliable match'} meta={match?.assetReference}/></div> : <div className={`match-comparison__blend is-${mode}`}><ComparisonPane label={mode === 'overlay' ? '50% overlay comparison' : 'Difference highlight'} url={sourceUrl} fallback="Uploaded image unavailable"/><img src={registeredUrl} alt="Registered asset comparison layer"/><span>{mode === 'overlay' ? 'Aligned visual overlay' : 'Brighter regions indicate visual differences'}</span></div>}
		<footer><div><span>Comparison mode does not change the saved result.</span><small>Registered previews are available only when your account owns and can access the matched asset.</small></div><button type="button" className="button button--secondary button--sm" disabled={!sourceUrl && !registeredUrl} onClick={() => setZoomOpen(true)}><Maximize2 size={14}/>Open zoom view</button></footer>
		<AnimatePresence>{zoomOpen ? <motion.div className="comparison-zoom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button type="button" className="comparison-zoom__backdrop" onClick={() => setZoomOpen(false)} aria-label="Close zoom view"/><div className="comparison-zoom__panel"><header><span><ZoomIn size={17}/>Inspection view</span><button type="button" className="icon-button" onClick={() => setZoomOpen(false)}><X size={17}/></button></header><div>{sourceUrl ? <img src={sourceUrl} alt="Original upload enlarged"/> : null}{registeredUrl ? <img src={registeredUrl} alt="Registered asset enlarged"/> : null}</div></div></motion.div> : null}</AnimatePresence>
	</section>;
}

function ComparisonPane({ label, url, fallback, meta }) {
	return <div className="comparison-pane"><span>{label}</span><div>{url ? <img src={url} alt={label}/> : <p><FileImage size={35}/><small>{fallback}</small></p>}</div><footer><strong>{fallback}</strong>{meta ? <small>{meta}</small> : null}</footer></div>;
}
