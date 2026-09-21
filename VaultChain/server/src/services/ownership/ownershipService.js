const assetRepository = require('../../repositories/assetRepository');
const ownershipRepository = require('../../repositories/ownershipRepository');
const blockchainService = require('../blockchain/blockchainService');

const TRANSFER_TYPES = new Set(['upload', 'sale', 'transfer']);

/**
 * Moves an asset from one owner to another, records the ownership history row
 * and mines the matching ledger block.
 *
 * This is always called with the `client` of an open transaction, because an
 * ownership change must commit together with whatever caused it (a marketplace
 * settlement moves money in the same transaction). It deliberately does not
 * open a transaction of its own.
 */
async function transferOwnership({ assetId, fromUserId, toUserId, transferType }, client) {
	if (!client) {
		throw new Error('transferOwnership must run inside a transaction');
	}

	if (!TRANSFER_TYPES.has(transferType)) {
		const error = new Error('transferType must be one of upload, sale, transfer');
		error.status = 400;
		throw error;
	}

	if (fromUserId === toUserId) {
		const error = new Error('An asset cannot be transferred to its current owner');
		error.status = 400;
		throw error;
	}

	const changedRows = await ownershipRepository.updateAssetOwner(
		{ assetId, expectedOwnerId: fromUserId, newOwnerId: toUserId },
		client
	);

	if (changedRows === 0) {
		const error = new Error('The asset is no longer owned by the expected owner');
		error.status = 409;
		throw error;
	}

	const block = await blockchainService.mineBlock(
		{ assetId, ownerId: toUserId, action: `ownership_${transferType}` },
		client
	);

	const historyEntry = await ownershipRepository.createHistoryEntry(
		{
			assetId,
			previousOwner: fromUserId,
			newOwner: toUserId,
			transferType,
			blockchainBlockId: block.id,
		},
		client
	);

	return { historyEntry, block };
}

async function getOwnershipHistory(assetId) {
	const numericAssetId = Number(assetId);

	if (!Number.isInteger(numericAssetId) || numericAssetId <= 0) {
		const error = new Error('A valid assetId is required');
		error.status = 400;
		throw error;
	}

	const asset = await assetRepository.getAssetById(numericAssetId);

	if (!asset) {
		const error = new Error('Asset not found');
		error.status = 404;
		throw error;
	}

	return ownershipRepository.getHistoryByAssetId(numericAssetId);
}

module.exports = {
	transferOwnership,
	getOwnershipHistory,
};
