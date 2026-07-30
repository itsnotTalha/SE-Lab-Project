const { database } = require('../database/database');

function run(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.run(sql, params, function onRun(error) {
			if (error) {
				reject(error);
				return;
			}

			resolve(this);
		});
	});
}

function get(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.get(sql, params, (error, row) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(row);
		});
	});
}

function mapAssetRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		ownerId: row.owner_id,
		title: row.title,
		description: row.description,
		category: row.category,
		fileName: row.file_name,
		filePath: row.file_path,
		fileSize: row.file_size,
		mimeType: row.mime_type,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

async function createAsset(assetData) {
	const { ownerId, title, description, category, fileName, filePath, fileSize, mimeType } = assetData;

	const result = await run(
		`INSERT INTO assets (
			owner_id,
			title,
			description,
			category,
			file_name,
			file_path,
			file_size,
			mime_type
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[ownerId, title, description || null, category || null, fileName, filePath, fileSize, mimeType]
	);

	const row = await get(
		`SELECT id, owner_id, title, description, category, file_name, file_path, file_size, mime_type, status, created_at, updated_at
		 FROM assets
		 WHERE id = ?
		 LIMIT 1`,
		[result.lastID]
	);

	return mapAssetRow(row);
}

function mapAssetHashRow(row) {
	if (!row) {
		return null;
	}

	return {
		assetId: row.asset_id,
		sha256Hash: row.sha256_hash,
		createdAt: row.created_at,
	};
}

async function upsertAssetHash({ assetId, sha256Hash }) {
	await run(
		`INSERT INTO asset_hashes (asset_id, sha256_hash, created_at)
		 VALUES (?, ?, CURRENT_TIMESTAMP)
		 ON CONFLICT(asset_id) DO UPDATE SET
			sha256_hash = excluded.sha256_hash`,
		[assetId, sha256Hash]
	);

	const row = await get(
		`SELECT asset_id, sha256_hash, created_at
		 FROM asset_hashes
		 WHERE asset_id = ?
		 LIMIT 1`,
		[assetId]
	);

	return mapAssetHashRow(row);
}

module.exports = {
	createAsset,
	upsertAssetHash,
};