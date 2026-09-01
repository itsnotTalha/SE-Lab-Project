import { EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { assetService } from '../../services/assetService';
import PrivacyMask from './PrivacyMask';
import { formatReportDate } from './verificationUtils';

export default function OwnerBadge({ match, confidenceLevel }) {
	const { user } = useAuth();
	const [transfers, setTransfers] = useState([]);
	useEffect(() => {
		let active = true;
		if (!match?.ownerIsCurrentUser || !match.asset?.id) { setTransfers([]); return undefined; }
		assetService.getOwnershipHistory(match.asset.id).then((records) => { if (active) setTransfers(records); }).catch(() => { if (active) setTransfers([]); });
		return () => { active = false; };
	}, [match?.asset?.id, match?.ownerIsCurrentUser]);
	if (!match || confidenceLevel === 'low') return <div className="owner-badge owner-badge--private"><span><LockKeyhole size={17}/></span><div><small>Registered owner</small><strong>Not disclosed</strong><p>No reliable match is available.</p></div></div>;
	if (confidenceLevel === 'medium') return <div className="owner-badge owner-badge--private"><span><EyeOff size={17}/></span><div><small>Registered owner</small><strong>Protected pending review</strong><p>Identity is hidden for medium-confidence results.</p></div></div>;
	if (match.ownerIsCurrentUser) return <div className="owner-badge owner-badge--self owner-badge--expanded"><span><ShieldCheck size={17}/></span><div><small>Registered owner · authenticated</small><strong>{user?.fullName || 'You'}</strong><p>Verified since {new Date(match.registeredAt || user?.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p></div><div className="owner-records"><strong>Owner-only transfer records</strong>{transfers.length ? transfers.slice(0, 3).map((record) => <div key={record.transactionReference}><span>{record.transferType || 'Transfer'} · {new Date(record.transferredAt).toLocaleDateString()}</span><small>{record.transactionReference} · {Number(record.price || 0).toLocaleString()} {record.currency || 'credits'}</small></div>) : <p>No ownership transfers recorded. This account holds the original registered record.</p>}</div></div>;
	return <div className="owner-badge"><span><UserRound size={17}/></span><div><small>Privacy-protected registered owner</small><strong><PrivacyMask value={match.ownerReference}/></strong><p>Asset registered {formatReportDate(match.registeredAt)}</p></div></div>;
}
