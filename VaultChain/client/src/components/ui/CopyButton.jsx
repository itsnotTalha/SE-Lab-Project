import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export default function CopyButton({ value, label = 'Copy' }) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		if (!value) return;
		await navigator.clipboard.writeText(value);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	}

	return (
		<button type="button" className="copy-button" onClick={handleCopy} disabled={!value} aria-label={`${label} to clipboard`}>
			{copied ? <Check size={14} /> : <Copy size={14} />}
			<span>{copied ? 'Copied' : label}</span>
		</button>
	);
}
