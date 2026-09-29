// A browser-only teaching model. These blocks are never persisted or submitted.
export const GENESIS_HASH = '0'.repeat(64);

export async function hashBlock(block) {
	if (!globalThis.crypto?.subtle) throw new Error('This demonstration requires HTTPS or localhost for SHA-256 hashing.');
	const payload = JSON.stringify({ index: block.index, event: block.event, fingerprint: block.fingerprint, previousHash: block.previousHash });
	const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function buildDemoChain(fingerprint = 'Example asset fingerprint') {
	const blocks = [];
	for (const event of ['Register asset', 'Record ownership', 'Transfer ownership']) {
		const block = { index: blocks.length, event, fingerprint, previousHash: blocks.at(-1)?.hash ?? GENESIS_HASH };
		blocks.push({ ...block, hash: await hashBlock(block) });
	}
	return blocks;
}

export async function inspectDemoChain(blocks) {
	let ancestorsValid = true;
	const results = [];
	for (let index = 0; index < blocks.length; index += 1) {
		const block = blocks[index];
		const computedHash = await hashBlock(block);
		const hashMatches = computedHash === block.hash;
		const linkMatches = block.previousHash === (index ? blocks[index - 1].hash : GENESIS_HASH);
		ancestorsValid = ancestorsValid && hashMatches && linkMatches && block.index === index;
		results.push({ computedHash, hashMatches, linkMatches, valid: ancestorsValid });
	}
	return results;
}
