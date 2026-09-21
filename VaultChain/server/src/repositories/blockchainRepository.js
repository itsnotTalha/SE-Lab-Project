const { run, get, all } = require('../database/database');

// Every function accepts an optional `client` so it can either run on its own
// or take part in a caller's transaction (see database.withTransaction).
const defaultClient = { run, get, all };

function mapBlockRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		blockIndex: row.block_index,
		assetId: row.asset_id,
		ownerId: row.owner_id,
		action: row.action,
		previousHash: row.previous_hash,
		currentHash: row.current_hash,
		createdAt: row.created_at,
	};
}

const BLOCK_SELECT = `
	SELECT id, block_index, asset_id, owner_id, action, previous_hash, current_hash, created_at
	FROM blockchain_blocks
`;

async function getLastBlock(client = defaultClient) {
	const row = await client.get(`${BLOCK_SELECT} ORDER BY block_index DESC LIMIT 1`);

	return mapBlockRow(row);
}

async function getBlockById(id, client = defaultClient) {
	const row = await client.get(`${BLOCK_SELECT} WHERE id = ? LIMIT 1`, [id]);

	return mapBlockRow(row);
}

async function createBlock(
	{ blockIndex, assetId, ownerId, action, previousHash, currentHash, createdAt },
	client = defaultClient
) {
	// created_at is written explicitly rather than left to the column default,
	// because it is part of the hashed payload and must be reproducible when
	// the chain is re-verified later.
	const result = await client.run(
		`INSERT INTO blockchain_blocks (block_index, asset_id, owner_id, action, previous_hash, current_hash, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[blockIndex, assetId ?? null, ownerId ?? null, action, previousHash ?? null, currentHash, createdAt]
	);

	return getBlockById(result.lastID, client);
}

async function getBlocksByAssetId(assetId, client = defaultClient) {
	const rows = await client.all(`${BLOCK_SELECT} WHERE asset_id = ? ORDER BY block_index ASC`, [assetId]);

	return rows.map(mapBlockRow);
}

async function getAllBlocks(client = defaultClient) {
	const rows = await client.all(`${BLOCK_SELECT} ORDER BY block_index ASC`);

	return rows.map(mapBlockRow);
}

module.exports = {
	getLastBlock,
	getBlockById,
	createBlock,
	getBlocksByAssetId,
	getAllBlocks,
};
