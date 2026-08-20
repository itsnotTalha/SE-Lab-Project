import { CalendarDays, Eye, Fingerprint, RotateCcw, SearchX, ShieldCheck } from 'lucide-react';

import AssetThumbnail from '../assets/AssetThumbnail';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';

const RESULT_COPY = {
	exact: { label: 'Exact Match', tone: 'success' },
	strong_visual: { label: 'Strong Visual Match', tone: 'info' },
	possible_visual: { label: 'Possible Visual Match', tone: 'warning' },
	no_match: { label: 'No Meaningful Match', tone: 'neutral' },
	matches_found: { label: 'Matches Found', tone: 'success' },
};

function MatchCard({ match, best, onPreviewAsset }) {
	const copy=RESULT_COPY[match.matchType]||RESULT_COPY.no_match;
	return <article className={`verification-match-card${best?' is-best':''}`}><header><div><span>#{match.rank}</span><div><small>{best?'Best registered match':'Ranked match'}</small><h3>{copy.label}</h3></div></div><StatusBadge tone={copy.tone}>{copy.label}</StatusBadge></header>{match.asset?<div className="verification-match-card__asset"><span><AssetThumbnail asset={match.asset}/></span><div><strong>{match.asset.title}</strong><button type="button" className="text-button" onClick={()=>onPreviewAsset(match.asset)}><Eye size={13}/>Preview owned asset</button></div></div>:null}<div className="verification-match-evidence"><div><span>Asset reference</span><code>{match.assetReference}</code></div><div><span>Registered owner</span><code>{match.ownerReference}</code></div><div><span>SHA-256</span><strong>{match.sha256Match?'Identical':'Different'}</strong></div><div><span>pHash distance</span><strong>{match.distance} / {match.hashBits||256}</strong></div></div>{match.registeredAt?<footer><CalendarDays size={12}/>Registered {new Date(match.registeredAt).toLocaleDateString()}</footer>:null}</article>;
}

export default function VerificationReport({ report, onPreviewAsset, onVerifyAnother }) {
	const matches=report.matches||[];
	return <section className="verification-report verification-global-report"><header className="verification-report__header"><div><span><ShieldCheck size={20}/></span><div><small>Global verification report</small><h2>{report.reference}</h2></div></div><StatusBadge tone={matches.length?'success':'neutral'}>{matches.length?'Matches Found':'No Meaningful Match'}</StatusBadge></header>{matches.length?<><div className="verification-report__summary"><h3>Closest registered matches</h3><p>Results are ranked by exact SHA-256 equality, then ascending 256-bit perceptual-hash distance.</p></div><div className="verification-match-list">{matches.map((match)=><MatchCard key={`${match.assetReference}-${match.rank}`} match={match} best={match.rank===1} onPreviewAsset={onPreviewAsset}/>)}</div></>:<div className="verification-no-match"><span><SearchX size={28}/></span><h3>No meaningful match found.</h3><p>No registered asset was within the possible visual-match threshold of {report.thresholds?.possible??12} bits.</p>{report.nearestDistance!=null?<small>Nearest observed distance: {report.nearestDistance} / {report.thresholds?.hashBits||256}. This is not classified as a match.</small>:null}</div>}<section className="verification-report__section"><h3><Fingerprint size={15}/>Search thresholds</h3><div className="verification-fingerprint-grid"><div><span>Exact match</span><strong>SHA-256 equal</strong></div><div><span>Strong visual</span><strong>0–{report.thresholds?.strong??6}</strong></div><div><span>Possible visual</span><strong>{(report.thresholds?.strong??6)+1}–{report.thresholds?.possible??12}</strong></div><div><span>Maximum results</span><strong>{report.thresholds?.maxResults??5}</strong></div><div><span>Fingerprint size</span><strong>{report.thresholds?.hashBits||256} bits</strong></div></div></section><footer className="verification-report__footer"><div><Button type="button" variant="secondary" icon={RotateCcw} onClick={onVerifyAnother}>Verify another image</Button></div><p>Fingerprint similarity is matching evidence. It does not independently prove authorship, copyright ownership, or absolute authenticity.</p></footer></section>;
}

export { RESULT_COPY };
