const { run, get, all } = require('../database/database');

const defaultClient = { run, get, all };

function mapHoldingRow(row) {
	if (!row) {
		return null;
	}

	return {
		assetId: row.asset_id,
		userId: row.user_id,
		userName: row.user_name || null,
		shares: row.shares,
		percentage: row.percentage,
	};
}

async function createFractionalAsset({ assetId, totalShares }, client = defaultClient) {
	await client.run(`INSERT INTO fractional_assets (asset_id, total_shares) VALUES (?, ?)`, [
		assetId,
		totalShares,
	]);

	return getFractionalAsset(assetId, client);
}

async function getFractionalAsset(assetId, client = defaultClient) {
	const row = await client.get(
		'SELECT asset_id, total_shares, created_at FROM fractional_assets WHERE asset_id = ? LIMIT 1',
		[assetId]
	);

	if (!row) {
		return null;
	}

	return {
		assetId: row.asset_id,
		totalShares: row.total_shares,
		createdAt: row.created_at,
	};
}

async function getHoldings(assetId, client = defaultClient) {
	const rows = await client.all(
		`SELECT
			fractional_ownership.asset_id AS asset_id,
			fractional_ownership.user_id AS user_id,
			fractional_ownership.shares AS shares,
			fractional_ownership.percentage AS percentage,
			users.full_name AS user_name
		 FROM fractional_ownership
		 JOIN users ON users.id = fractional_ownership.user_id
		 WHERE fractional_ownership.asset_id = ?
		 ORDER BY fractional_ownership.shares DESC, fractional_ownership.user_id ASC`,
		[assetId]
	);

	return rows.map(mapHoldingRow);
}

async function getHolding(assetId, userId, client = defaultClient) {
	const row = await client.get(
		`SELECT asset_id, user_id, shares, percentage
		 FROM fractional_ownership
		 WHERE asset_id = ? AND user_id = ?
		 LIMIT 1`,
		[assetId, userId]
	);

	return mapHoldingRow(row);
}

async function getHolderCount(assetId, client = defaultClient) {
	const row = await client.get(
		'SELECT COUNT(*) AS total FROM fractional_ownership WHERE asset_id = ? AND shares > 0',
		[assetId]
	);

	return row ? row.total : 0;
}

/**
 * Sets a holder's share count, recalculating their percentage from the asset's
 * total. A holder left with no shares is removed rather than kept at zero, so
 * the holder list always reflects who actually owns part of the asset.
 */
async function setHolding({ assetId, userId, shares, totalShares }, client = defaultClient) {
	if (shares <= 0) {
		await client.run('DELETE FROM fractional_ownership WHERE asset_id = ? AND user_id = ?', [
			assetId,
			userId,
		]);

		return null;
	}

	const percentage = Math.round((shares / totalShares) * 10000) / 100;

	await client.run(
		`INSERT INTO fractional_ownership (asset_id, user_id, shares, percentage)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(asset_id, user_id) DO UPDATE SET
			shares = excluded.shares,
			percentage = excluded.percentage`,
		[assetId, userId, shares, percentage]
	);

	return getHolding(assetId, userId, client);
}

module.exports = {
	createFractionalAsset,
	getFractionalAsset,
	getHoldings,
	getHolding,
	getHolderCount,
	setHolding,
};
