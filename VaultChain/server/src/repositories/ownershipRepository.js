const { run, get, all } = require('../database/database');

const defaultClient = { run, get, all };

function mapHistoryRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		assetId: row.asset_id,
		previousOwner: row.previous_owner,
		previousOwnerName: row.previous_owner_name || null,
		newOwner: row.new_owner,
		newOwnerName: row.new_owner_name || null,
		transferType: row.transfer_type,
		blockchainBlockId: row.blockchain_block_id,
		transferredAt: row.transferred_at,
	};
}

const HISTORY_SELECT = `
	SELECT
		ownership_history.id AS id,
		ownership_history.asset_id AS asset_id,
		ownership_history.previous_owner AS previous_owner,
		previous_users.full_name AS previous_owner_name,
		ownership_history.new_owner AS new_owner,
		new_users.full_name AS new_owner_name,
		ownership_history.transfer_type AS transfer_type,
		ownership_history.blockchain_block_id AS blockchain_block_id,
		ownership_history.transferred_at AS transferred_at
	FROM ownership_history
	LEFT JOIN users AS previous_users ON previous_users.id = ownership_history.previous_owner
	LEFT JOIN users AS new_users ON new_users.id = ownership_history.new_owner
`;

async function createHistoryEntry(
	{ assetId, previousOwner, newOwner, transferType, blockchainBlockId },
	client = defaultClient
) {
	const result = await client.run(
		`INSERT INTO ownership_history (asset_id, previous_owner, new_owner, transfer_type, blockchain_block_id)
		 VALUES (?, ?, ?, ?, ?)`,
		[assetId, previousOwner ?? null, newOwner, transferType, blockchainBlockId ?? null]
	);

	const row = await client.get(`${HISTORY_SELECT} WHERE ownership_history.id = ?`, [result.lastID]);

	return mapHistoryRow(row);
}

async function getHistoryByAssetId(assetId, client = defaultClient) {
	const rows = await client.all(
		`${HISTORY_SELECT} WHERE ownership_history.asset_id = ?
		 ORDER BY ownership_history.transferred_at ASC, ownership_history.id ASC`,
		[assetId]
	);

	return rows.map(mapHistoryRow);
}

/**
 * Moves an asset to a new owner. Returns the number of rows changed so the
 * caller can detect that the asset was no longer owned by `expectedOwnerId`,
 * which is how a settlement guards against the seller having transferred the
 * asset in between the listing being created and the purchase landing.
 */
async function updateAssetOwner({ assetId, expectedOwnerId, newOwnerId }, client = defaultClient) {
	const result = await client.run(
		`UPDATE assets
		 SET owner_id = ?, updated_at = CURRENT_TIMESTAMP
		 WHERE id = ? AND owner_id = ?`,
		[newOwnerId, assetId, expectedOwnerId]
	);

	return result.changes;
}

module.exports = {
	createHistoryEntry,
	getHistoryByAssetId,
	updateAssetOwner,
};
