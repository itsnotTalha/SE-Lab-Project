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

function all(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.all(sql, params, (error, rows) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(rows);
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

async function getAssetById(assetId) {
	const row = await get(
		`SELECT id, owner_id, title, description, category, file_name, file_path, file_size, mime_type, status, created_at, updated_at
		 FROM assets
		 WHERE id = ?
		 LIMIT 1`,
		[assetId]
	);

	return mapAssetRow(row);
}

const OWNED_ASSET_SELECT = `
	SELECT
		a.id,
		a.owner_id,
		a.title,
		a.description,
		a.category,
		a.file_name,
		a.file_path,
		a.file_size,
		a.mime_type,
		a.status,
		a.created_at,
		a.updated_at,
		m.id AS metadata_id,
		m.width,
		m.height,
		h.id AS hash_id,
		h.sha256_hash,
		h.phash
	FROM assets a
	LEFT JOIN asset_metadata m ON m.asset_id = a.id
	LEFT JOIN asset_hashes h ON h.asset_id = a.id
`;

function mapOwnedAssetRow(row) {
	if (!row) return null;

	return {
		...mapAssetRow(row),
		width: row.width,
		height: row.height,
		sha256Hash: row.sha256_hash,
		phash: row.phash,
		hasMetadata: row.metadata_id != null,
		hasHash: row.hash_id != null,
	};
}

async function getAssetsByOwnerId(ownerId) {
	const rows = await all(
		`${OWNED_ASSET_SELECT}
		 WHERE a.owner_id = ?
		 ORDER BY a.created_at DESC, a.id DESC`,
		[ownerId]
	);

	return rows.map(mapOwnedAssetRow);
}

async function getAssetByIdAndOwnerId(assetId, ownerId) {
	const row = await get(
		`${OWNED_ASSET_SELECT}
		 WHERE a.id = ? AND a.owner_id = ?
		 LIMIT 1`,
		[assetId, ownerId]
	);

	return mapOwnedAssetRow(row);
}

async function getGlobalFingerprintCandidates() {
	const rows = await all(
		`SELECT a.id AS asset_id, a.owner_id, a.created_at, h.sha256_hash, h.phash
		 FROM assets a
		 JOIN asset_hashes h ON h.asset_id = a.id
		 WHERE h.sha256_hash IS NOT NULL AND h.phash IS NOT NULL
		 ORDER BY a.id ASC`
	);
	return rows.map((row) => ({
		assetId: row.asset_id,
		ownerId: row.owner_id,
		registeredAt: row.created_at,
		sha256Hash: row.sha256_hash,
		phash: row.phash,
	}));
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
		phash: row.phash,
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
		`SELECT asset_id, sha256_hash, phash, created_at
		 FROM asset_hashes
		 WHERE asset_id = ?
		 LIMIT 1`,
		[assetId]
	);

	return mapAssetHashRow(row);
}

async function updateAssetPhash({ assetId, phash }) {
	const result = await run(
		`UPDATE asset_hashes
		 SET phash = ?
		 WHERE asset_id = ?`,
		[phash, assetId]
	);

	if (result.changes === 0) {
		const error = new Error('Asset hash record not found');
		error.status = 404;
		throw error;
	}

	const row = await get(
		`SELECT asset_id, sha256_hash, phash, created_at
		 FROM asset_hashes
		 WHERE asset_id = ?
		 LIMIT 1`,
		[assetId]
	);

	return mapAssetHashRow(row);
}

async function getAssetHashByAssetId(assetId) {
	const row = await get(
		`SELECT asset_id, sha256_hash, phash, created_at
		 FROM asset_hashes
		 WHERE asset_id = ?
		 LIMIT 1`,
		[assetId]
	);

	return mapAssetHashRow(row);
}

async function findAssetHashByPhash(phash, excludeAssetId) {
	const query = excludeAssetId == null
		? `SELECT asset_id, sha256_hash, phash, created_at
		   FROM asset_hashes
		   WHERE phash = ?
		   ORDER BY created_at ASC, asset_id ASC
		   LIMIT 1`
		: `SELECT asset_id, sha256_hash, phash, created_at
		   FROM asset_hashes
		   WHERE phash = ?
		     AND asset_id != ?
		   ORDER BY created_at ASC, asset_id ASC
		   LIMIT 1`;

	const params = excludeAssetId == null ? [phash] : [phash, excludeAssetId];
	const row = await get(query, params);

	return mapAssetHashRow(row);
}

const ASSET_MATCH_SELECT = `
	SELECT
		a.id AS asset_id,
		a.owner_id,
		a.title,
		a.created_at
	FROM asset_hashes h
	JOIN assets a ON a.id = h.asset_id
`;

function mapAssetMatchRow(row) {
	if (!row) return null;
	return {
		assetId: row.asset_id,
		ownerId: row.owner_id,
		title: row.title,
		createdAt: row.created_at,
	};
}

async function findAssetMatchBySha256(sha256Hash) {
	const row = await get(
		`${ASSET_MATCH_SELECT}
		 WHERE h.sha256_hash = ?
		 ORDER BY a.created_at ASC, a.id ASC
		 LIMIT 1`,
		[sha256Hash]
	);
	return mapAssetMatchRow(row);
}

async function getAssetPhashCandidates() {
	const rows = await all(
		`SELECT
			a.id AS asset_id,
			a.owner_id,
			a.title,
			a.created_at,
			h.phash
		 FROM asset_hashes h
		 JOIN assets a ON a.id = h.asset_id
		 WHERE h.phash IS NOT NULL
		 ORDER BY a.id ASC`
	);

	return rows.map((row) => ({
		...mapAssetMatchRow(row),
		phash: row.phash,
	}));
}

function mapAssetMetadataRow(row) {
	if (!row) {
		return null;
	}

	const metadataJson = row.metadata_json ? JSON.parse(row.metadata_json) : null;
	const derivedPixelCount = row.width && row.height ? row.width * row.height : null;
	const pixelCount = metadataJson?.pixelCount ?? derivedPixelCount;
	const patterns = metadataJson?.patterns || [];

	return {
		assetId: row.asset_id,
		width: row.width,
		height: row.height,
		camera: row.camera,
		location: row.location,
		createdDate: row.created_date,
		pixelCount,
		patterns,
		metadataJson,
	};
}

async function upsertAssetMetadata({ assetId, width, height, camera, location, createdDate, pixelCount, patterns, metadataJson }) {
	const normalizedMetadataJson = {
		...(metadataJson || {}),
		pixelCount: pixelCount ?? metadataJson?.pixelCount ?? (width && height ? width * height : null),
		patterns: patterns || metadataJson?.patterns || [],
	};

	await run(
		`INSERT INTO asset_metadata (
			asset_id,
			width,
			height,
			camera,
			location,
			created_date,
			metadata_json
		) VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(asset_id) DO UPDATE SET
			width = excluded.width,
			height = excluded.height,
			camera = excluded.camera,
			location = excluded.location,
			created_date = excluded.created_date,
			metadata_json = excluded.metadata_json`,
		[
			assetId,
			width ?? null,
			height ?? null,
			camera || null,
			location || null,
			createdDate || null,
			JSON.stringify(normalizedMetadataJson),
		]
	);

	const row = await get(
		`SELECT asset_id, width, height, camera, location, created_date, metadata_json
		 FROM asset_metadata
		 WHERE asset_id = ?
		 LIMIT 1`,
		[assetId]
	);

	return mapAssetMetadataRow(row);
}

async function getAssetMetadataByAssetId(assetId) {
	const row = await get(
		`SELECT asset_id, width, height, camera, location, created_date, metadata_json
		 FROM asset_metadata
		 WHERE asset_id = ?
		 LIMIT 1`,
		[assetId]
	);

	return mapAssetMetadataRow(row);
}

module.exports = {
	getAssetById,
	getAssetsByOwnerId,
	getAssetByIdAndOwnerId,
	getGlobalFingerprintCandidates,
	createAsset,
	upsertAssetHash,
	updateAssetPhash,
	upsertAssetMetadata,
	getAssetMetadataByAssetId,
	getAssetHashByAssetId,
	findAssetHashByPhash,
	findAssetMatchBySha256,
	getAssetPhashCandidates,
};
