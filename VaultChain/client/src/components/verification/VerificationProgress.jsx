import { Fingerprint, LoaderCircle, ScanSearch } from 'lucide-react';

export default function VerificationProgress() {
	return <div className="verification-progress" role="status" aria-live="polite"><span><LoaderCircle size={24}/></span><div><strong>Searching registered fingerprints...</strong><p>The server is generating SHA-256 and pHash evidence, ranking global candidates, and saving the report.</p><div><span><Fingerprint size={13}/> 256-bit fingerprints</span><span><ScanSearch size={13}/> Global best-match search</span></div></div></div>;
}
