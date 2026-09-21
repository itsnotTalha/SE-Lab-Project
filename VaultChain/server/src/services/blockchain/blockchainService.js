const crypto = require('crypto');

const blockchainRepository = require('../../repositories/blockchainRepository');

const GENESIS_PREVIOUS_HASH = '0'.repeat(64);

/**
 * A block's hash covers its own contents and the hash of the block before it.
 * Editing any historical row therefore breaks every hash that follows it,
 * which is what verifyChain() detects.
 */
function computeBlockHash({ blockIndex, assetId, ownerId, action, previousHash, createdAt }) {
	const payload = [blockIndex, assetId ?? '', ownerId ?? '', action, previousHash ?? '', createdAt].join('|');

	return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Appends a block to the ledger. Pass the `client` from withTransaction() to
 * mine as part of a larger transaction, such as a marketplace settlement.
 */
async function mineBlock({ assetId, ownerId, action }, client) {
	const lastBlock = await blockchainRepository.getLastBlock(client);
	const blockIndex = lastBlock ? lastBlock.blockIndex + 1 : 1;
	const previousHash = lastBlock ? lastBlock.currentHash : GENESIS_PREVIOUS_HASH;
	const createdAt = new Date().toISOString();

	const currentHash = computeBlockHash({
		blockIndex,
		assetId,
		ownerId,
		action,
		previousHash,
		createdAt,
	});

	return blockchainRepository.createBlock(
		{
			blockIndex,
			assetId,
			ownerId,
			action,
			previousHash,
			currentHash,
			createdAt,
		},
		client
	);
}

async function getAssetChain(assetId) {
	const numericAssetId = Number(assetId);

	if (!Number.isInteger(numericAssetId) || numericAssetId <= 0) {
		const error = new Error('A valid assetId is required');
		error.status = 400;
		throw error;
	}

	return blockchainRepository.getBlocksByAssetId(numericAssetId);
}

async function getChain() {
	return blockchainRepository.getAllBlocks();
}

/**
 * Walks the ledger and reports the first block whose stored hash no longer
 * matches its contents or no longer links to the block before it.
 */
async function verifyChain() {
	const blocks = await blockchainRepository.getAllBlocks();
	let expectedPreviousHash = GENESIS_PREVIOUS_HASH;

	for (const block of blocks) {
		if (block.previousHash !== expectedPreviousHash) {
			return {
				valid: false,
				blockCount: blocks.length,
				brokenAtBlockIndex: block.blockIndex,
				reason: 'Block does not link to the previous block hash',
			};
		}

		const recomputedHash = computeBlockHash(block);

		if (recomputedHash !== block.currentHash) {
			return {
				valid: false,
				blockCount: blocks.length,
				brokenAtBlockIndex: block.blockIndex,
				reason: 'Block contents do not match the stored block hash',
			};
		}

		expectedPreviousHash = block.currentHash;
	}

	return {
		valid: true,
		blockCount: blocks.length,
		brokenAtBlockIndex: null,
		reason: null,
	};
}

module.exports = {
	GENESIS_PREVIOUS_HASH,
	computeBlockHash,
	mineBlock,
	getAssetChain,
	getChain,
	verifyChain,
};
