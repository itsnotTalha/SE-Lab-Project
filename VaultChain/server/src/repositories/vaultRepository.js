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
		passwordHash: row.password_hash,
		autoLockMinutes: Number(row.auto_lock_minutes || 10),
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

async function createVault({ userId, reference, name, description, passwordHash, autoLockMinutes }) {
	const result = await run(
		`INSERT INTO vaults (user_id, public_reference, name, description, password_hash, auto_lock_minutes)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		[userId, reference, name, description, passwordHash, autoLockMinutes]
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

async function setVaultPassword(id, passwordHash) {
	await run('UPDATE vaults SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [passwordHash, id]);
	return getVaultById(id);
}

async function setVaultSecurity(id, { passwordHash, autoLockMinutes }) {
	await run(
		'UPDATE vaults SET password_hash = ?, auto_lock_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
		[passwordHash, autoLockMinutes, id]
	);
	return getVaultById(id);
}

async function updateAutoLockMinutes(id, autoLockMinutes) {
	await run('UPDATE vaults SET auto_lock_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [autoLockMinutes, id]);
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

async function upsertUnlockSession({ vaultId, userId, tokenFingerprint, expiresAt }) {
	await run(
		`INSERT INTO vault_unlock_sessions (vault_id, user_id, token_fingerprint, expires_at)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(vault_id, token_fingerprint) DO UPDATE SET
			user_id = excluded.user_id,
			expires_at = excluded.expires_at,
			created_at = CURRENT_TIMESTAMP`,
		[vaultId, userId, tokenFingerprint, expiresAt]
	);
}

async function getUnlockSession(vaultId, userId, tokenFingerprint) {
	return get(
		`SELECT expires_at FROM vault_unlock_sessions
		 WHERE vault_id = ? AND user_id = ? AND token_fingerprint = ?
		 LIMIT 1`,
		[vaultId, userId, tokenFingerprint]
	);
}

async function deleteUnlockSession(vaultId, userId, tokenFingerprint) {
	return run(
		'DELETE FROM vault_unlock_sessions WHERE vault_id = ? AND user_id = ? AND token_fingerprint = ?',
		[vaultId, userId, tokenFingerprint]
	);
}

async function deleteUnlockSessionsByToken(userId, tokenFingerprint) {
	return run(
		'DELETE FROM vault_unlock_sessions WHERE user_id = ? AND token_fingerprint = ?',
		[userId, tokenFingerprint]
	);
}

async function deleteUnlockSessionsByVault(vaultId) {
	return run('DELETE FROM vault_unlock_sessions WHERE vault_id = ?', [vaultId]);
}

async function deleteExpiredUnlockSessions(now) {
	return run('DELETE FROM vault_unlock_sessions WHERE expires_at <= ?', [now]);
}

async function getProtectingVaultsForAsset(userId, assetId, tokenFingerprint) {
	return all(
		`SELECT v.id, v.public_reference, v.name, v.password_hash, s.expires_at
		 FROM vault_assets va
		 JOIN vaults v ON v.id = va.vault_id
		 LEFT JOIN vault_unlock_sessions s
			ON s.vault_id = v.id AND s.user_id = v.user_id AND s.token_fingerprint = ?
		 WHERE va.asset_id = ? AND v.user_id = ? AND v.password_hash IS NOT NULL
		 ORDER BY v.id ASC`,
		[tokenFingerprint || '', assetId, userId]
	);
}

async function getUnlockAttempts(vaultId, userId) {
	return get(
		`SELECT attempt_count, window_started_at, blocked_until
		 FROM vault_unlock_attempts WHERE vault_id = ? AND user_id = ? LIMIT 1`,
		[vaultId, userId]
	);
}

async function saveUnlockAttempts({ vaultId, userId, attemptCount, windowStartedAt, blockedUntil }) {
	return run(
		`INSERT INTO vault_unlock_attempts (vault_id, user_id, attempt_count, window_started_at, blocked_until)
		 VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT(vault_id, user_id) DO UPDATE SET
			attempt_count = excluded.attempt_count,
			window_started_at = excluded.window_started_at,
			blocked_until = excluded.blocked_until,
			updated_at = CURRENT_TIMESTAMP`,
		[vaultId, userId, attemptCount, windowStartedAt, blockedUntil]
	);
}

async function clearUnlockAttempts(vaultId, userId) {
	return run('DELETE FROM vault_unlock_attempts WHERE vault_id = ? AND user_id = ?', [vaultId, userId]);
}

module.exports = {
	createVault,
	getVaultsByUserId,
	getVaultByReferenceAndUserId,
	updateVault,
	setVaultPassword,
	setVaultSecurity,
	updateAutoLockMinutes,
	deleteVault,
	getVaultAssets,
	getOwnedAssetsByIds,
	getExistingMembershipIds,
	addAssets,
	removeAsset,
	getVaultStats,
	upsertUnlockSession,
	getUnlockSession,
	deleteUnlockSession,
	deleteUnlockSessionsByToken,
	deleteUnlockSessionsByVault,
	deleteExpiredUnlockSessions,
	getProtectingVaultsForAsset,
	getUnlockAttempts,
	saveUnlockAttempts,
	clearUnlockAttempts,
};
