import { Fingerprint, LoaderCircle, ScanSearch } from 'lucide-react';

export default function VerificationProgress() {
	return <div className="verification-progress" role="status" aria-live="polite"><span><LoaderCircle size={24}/></span><div><strong>Analyzing image evidence...</strong><p>The server is generating fingerprints, comparing the selected asset, inspecting available metadata, and saving the report.</p><div><span><Fingerprint size={13}/> SHA-256 and perceptual fingerprints</span><span><ScanSearch size={13}/> Direct asset comparison and report</span></div></div></div>;
}
