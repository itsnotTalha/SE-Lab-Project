const { database } = require('../database/database');

function run(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.run(sql, params, function onRun(error) {
			if (error) return reject(error);
			resolve(this);
		});
	});
}

function get(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
	});
}

function all(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
	});
}

function mapVault(row) {
	if (!row) return null;
	return {
		id: row.id,
		userId: row.user_id,
		reference: row.public_reference,
		name: row.name,
		description: row.description,
		assetCount: Number(row.asset_count || 0),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapVaultAsset(row) {
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		category: row.category,
		fileName: row.file_name,
		fileSize: row.file_size,
		mimeType: row.mime_type,
		status: row.status,
		createdAt: row.created_at,
		width: row.width,
		height: row.height,
		hasHash: row.hash_id != null,
		hasMetadata: row.metadata_id != null,
		addedAt: row.added_at,
	};
}

const VAULT_SELECT = `
	SELECT v.*, COUNT(va.asset_id) AS asset_count
	FROM vaults v
	LEFT JOIN vault_assets va ON va.vault_id = v.id
`;

async function createVault({ userId, reference, name, description }) {
	const result = await run(
		`INSERT INTO vaults (user_id, public_reference, name, description)
		 VALUES (?, ?, ?, ?)`,
		[userId, reference, name, description]
	);
	return getVaultById(result.lastID);
}

async function getVaultById(id) {
	const row = await get(`${VAULT_SELECT} WHERE v.id = ? GROUP BY v.id LIMIT 1`, [id]);
	return mapVault(row);
}

async function getVaultsByUserId(userId) {
	const rows = await all(
		`${VAULT_SELECT}
		 WHERE v.user_id = ?
		 GROUP BY v.id
		 ORDER BY v.updated_at DESC, v.id DESC`,
		[userId]
	);
	return rows.map(mapVault);
}

async function getVaultByReferenceAndUserId(reference, userId) {
	const row = await get(
		`${VAULT_SELECT}
		 WHERE v.public_reference = ? AND v.user_id = ?
		 GROUP BY v.id
		 LIMIT 1`,
		[reference, userId]
	);
	return mapVault(row);
}

async function updateVault(id, { name, description }) {
	await run(
		`UPDATE vaults SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		[name, description, id]
	);
	return getVaultById(id);
}

async function deleteVault(id) {
	return run('DELETE FROM vaults WHERE id = ?', [id]);
}

async function getVaultAssets(vaultId, userId, limit = null) {
	const limitClause = Number.isInteger(limit) && limit > 0 ? ` LIMIT ${limit}` : '';
	const rows = await all(
		`SELECT a.id, a.title, a.description, a.category, a.file_name, a.file_size,
			a.mime_type, a.status, a.created_at, m.id AS metadata_id, m.width, m.height,
			h.id AS hash_id, va.added_at
		 FROM vault_assets va
		 JOIN assets a ON a.id = va.asset_id
		 LEFT JOIN asset_metadata m ON m.asset_id = a.id
		 LEFT JOIN asset_hashes h ON h.asset_id = a.id
		 WHERE va.vault_id = ? AND a.owner_id = ?
		 ORDER BY va.added_at DESC, a.id DESC${limitClause}`,
		[vaultId, userId]
	);
	return rows.map(mapVaultAsset);
}

async function getOwnedAssetsByIds(userId, assetIds) {
	if (!assetIds.length) return [];
	const placeholders = assetIds.map(() => '?').join(',');
	const rows = await all(
		`SELECT id FROM assets WHERE owner_id = ? AND id IN (${placeholders})`,
		[userId, ...assetIds]
	);
	return rows.map((row) => row.id);
}

async function getExistingMembershipIds(vaultId, assetIds) {
	if (!assetIds.length) return [];
	const placeholders = assetIds.map(() => '?').join(',');
	const rows = await all(
		`SELECT asset_id FROM vault_assets WHERE vault_id = ? AND asset_id IN (${placeholders})`,
		[vaultId, ...assetIds]
	);
	return rows.map((row) => row.asset_id);
}

async function addAssets(vaultId, assetIds) {
	await run('BEGIN IMMEDIATE TRANSACTION');
	try {
		for (const assetId of assetIds) {
			await run('INSERT INTO vault_assets (vault_id, asset_id) VALUES (?, ?)', [vaultId, assetId]);
		}
		await run('UPDATE vaults SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [vaultId]);
		await run('COMMIT');
	} catch (error) {
		await run('ROLLBACK').catch(() => {});
		throw error;
	}
}

async function removeAsset(vaultId, assetId) {
	const result = await run('DELETE FROM vault_assets WHERE vault_id = ? AND asset_id = ?', [vaultId, assetId]);
	if (result.changes) await run('UPDATE vaults SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [vaultId]);
	return result.changes;
}

async function getVaultStats(userId) {
	const row = await get(
		`SELECT
			(SELECT COUNT(*) FROM vaults WHERE user_id = ?) AS total_vaults,
			(SELECT COUNT(DISTINCT va.asset_id) FROM vault_assets va JOIN vaults v ON v.id = va.vault_id WHERE v.user_id = ?) AS organized_assets,
			(SELECT COUNT(*) FROM assets WHERE owner_id = ?) AS total_assets`,
		[userId, userId, userId]
	);
	return {
		totalVaults: Number(row?.total_vaults || 0),
		organizedAssets: Number(row?.organized_assets || 0),
		totalAssets: Number(row?.total_assets || 0),
	};
}

module.exports = {
	createVault,
	getVaultsByUserId,
	getVaultByReferenceAndUserId,
	updateVault,
	deleteVault,
	getVaultAssets,
	getOwnedAssetsByIds,
	getExistingMembershipIds,
	addAssets,
	removeAsset,
	getVaultStats,
};
