const bcrypt = require('bcrypt');
const crypto = require('crypto');

const vaultRepository = require('../../repositories/vaultRepository');
const authService = require('../auth/authService');
const vaultAccessService = require('./vaultAccessService');

const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;
const PASSWORD_MIN_BYTES = 8;
const PASSWORD_MAX_BYTES = 72;
const ASSET_BATCH_MAX = 50;
const SALT_ROUNDS = 12;
const AUTO_LOCK_MINUTES = new Set([5, 10, 30]);

function createHttpError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

function normalizeReference(reference) {
	const normalized = String(reference || '').trim().toUpperCase();
	if (!/^VT-[A-F0-9]{6}$/.test(normalized)) throw createHttpError(404, 'Vault not found');
	return normalized;
}

function validateName(value) {
	const name = String(value ?? '').trim();
	if (!name) throw createHttpError(400, 'Vault name is required');
	if (name.length > NAME_MAX) throw createHttpError(400, `Vault name must be ${NAME_MAX} characters or fewer`);
	return name;
}

function validateDescription(value) {
	if (value == null || String(value).trim() === '') return null;
	const description = String(value).trim();
	if (description.length > DESCRIPTION_MAX) throw createHttpError(400, `Description must be ${DESCRIPTION_MAX} characters or fewer`);
	return description;
}

function validatePassword(value) {
	const password = String(value || '');
	const bytes = Buffer.byteLength(password, 'utf8');
	if (bytes < PASSWORD_MIN_BYTES) throw createHttpError(400, 'Vault password must be at least 8 characters');
	if (bytes > PASSWORD_MAX_BYTES) throw createHttpError(400, 'Vault password must be 72 bytes or fewer');
	return password;
}

function validateConfirmedPassword(password, confirmation) {
	const validated = validatePassword(password);
	if (validated !== String(confirmation || '')) throw createHttpError(400, 'New Vault passwords do not match');
	return validated;
}

function validateAutoLockMinutes(value, fallback = 10) {
	if (value == null || value === '') return fallback;
	const minutes = Number(value);
	if (!AUTO_LOCK_MINUTES.has(minutes)) throw createHttpError(400, 'Auto-lock duration must be 5, 10, or 30 minutes');
	return minutes;
}

function publicAsset(asset) {
	return {
		...asset,
		reference: `VC-A${String(asset.id).padStart(6, '0')}`,
		contentUrl: `/api/assets/${asset.id}/content`,
		vaultProtection: { passwordProtected: true, isLocked: false },
	};
}

function publicVault(vault, access, assets = []) {
	return {
		reference: vault.reference,
		name: vault.name,
		description: vault.description,
		assetCount: vault.assetCount,
		passwordProtected: access.passwordProtected,
		isLocked: access.isLocked,
		unlockExpiresAt: access.unlockExpiresAt,
		autoLockMinutes: vault.autoLockMinutes,
		createdAt: vault.createdAt,
		updatedAt: vault.updatedAt,
		assets: access.isLocked ? [] : assets.map(publicAsset),
	};
}

async function ownedVaultOrThrow(userId, reference) {
	const vault = await vaultRepository.getVaultByReferenceAndUserId(normalizeReference(reference), userId);
	if (!vault) throw createHttpError(404, 'Vault not found');
	return vault;
}

async function vaultWithAccess(vault, userId, tokenFingerprint, assetLimit = null) {
	const access = await vaultAccessService.getVaultAccess(vault, userId, tokenFingerprint);
	const assets = access.isLocked ? [] : await vaultRepository.getVaultAssets(vault.id, userId, assetLimit);
	return publicVault(vault, access, assets);
}

async function requireUnlocked(vault, userId, tokenFingerprint) {
	const access = await vaultAccessService.getVaultAccess(vault, userId, tokenFingerprint);
	if (access.isLocked) throw createHttpError(423, 'Vault is locked');
	return access;
}

async function createVault(userId, input) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	const name = validateName(input?.name);
	const description = validateDescription(input?.description);
	const passwordHash = await bcrypt.hash(validatePassword(input?.password), SALT_ROUNDS);
	const autoLockMinutes = validateAutoLockMinutes(input?.autoLockMinutes);
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const reference = `VT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
		try {
			const vault = await vaultRepository.createVault({ userId, reference, name, description, passwordHash, autoLockMinutes });
			return publicVault(vault, { passwordProtected: true, isLocked: true, unlockExpiresAt: null });
		} catch (error) {
			if (error.code !== 'SQLITE_CONSTRAINT') throw error;
		}
	}
	throw createHttpError(500, 'Unable to allocate a Vault reference');
}

async function getVaults(userId, tokenFingerprint) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	const vaults = await vaultRepository.getVaultsByUserId(userId);
	return Promise.all(vaults.map((vault) => vaultWithAccess(vault, userId, tokenFingerprint, 3)));
}

async function getVault(userId, reference, tokenFingerprint) {
	const vault = await ownedVaultOrThrow(userId, reference);
	return vaultWithAccess(vault, userId, tokenFingerprint);
}

async function unlockVault(userId, reference, password, tokenFingerprint) {
	const vault = await ownedVaultOrThrow(userId, reference);
	if (!vault.passwordHash) throw createHttpError(409, 'This legacy Vault does not have password protection configured');
	await vaultAccessService.assertUnlockAttemptAllowed(vault.id, userId);
	if (!await bcrypt.compare(String(password || ''), vault.passwordHash)) {
		const failure = await vaultAccessService.recordFailedUnlock(vault.id, userId);
		if (failure.isBlocked) throw createHttpError(429, 'Too many Vault password attempts. Try again later.');
		throw createHttpError(401, 'Incorrect Vault password');
	}
	await vaultAccessService.clearUnlockAttempts(vault.id, userId);
	await vaultAccessService.grantVaultAccess(vault, userId, tokenFingerprint);
	return vaultWithAccess(vault, userId, tokenFingerprint);
}

async function changePassword(userId, reference, input, tokenFingerprint) {
	const vault = await ownedVaultOrThrow(userId, reference);
	if (!vault.passwordHash) throw createHttpError(409, 'Set an initial password through Edit Vault');
	const newPassword = validateConfirmedPassword(input?.newPassword, input?.confirmPassword);
	await vaultAccessService.assertUnlockAttemptAllowed(vault.id, userId);
	if (!await bcrypt.compare(String(input?.currentPassword || ''), vault.passwordHash)) {
		const failure = await vaultAccessService.recordFailedUnlock(vault.id, userId);
		if (failure.isBlocked) throw createHttpError(429, 'Too many Vault password attempts. Try again later.');
		throw createHttpError(401, 'Current Vault password is incorrect');
	}
	await vaultAccessService.clearUnlockAttempts(vault.id, userId);
	const updated = await vaultRepository.setVaultSecurity(vault.id, {
		passwordHash: await bcrypt.hash(newPassword, SALT_ROUNDS),
		autoLockMinutes: validateAutoLockMinutes(input?.autoLockMinutes, vault.autoLockMinutes),
	});
	await vaultAccessService.revokeAllVaultAccess(vault.id);
	return vaultWithAccess(updated, userId, tokenFingerprint);
}

async function resetPassword(userId, reference, input, tokenFingerprint) {
	const vault = await ownedVaultOrThrow(userId, reference);
	const newPassword = validateConfirmedPassword(input?.newPassword, input?.confirmPassword);
	await vaultAccessService.assertUnlockAttemptAllowed(vault.id, userId);
	if (!await authService.verifyAccountPassword(userId, input?.accountPassword)) {
		const failure = await vaultAccessService.recordFailedUnlock(vault.id, userId);
		if (failure.isBlocked) throw createHttpError(429, 'Too many password attempts. Try again later.');
		throw createHttpError(401, 'Account password is incorrect');
	}
	await vaultAccessService.clearUnlockAttempts(vault.id, userId);
	const updated = await vaultRepository.setVaultSecurity(vault.id, {
		passwordHash: await bcrypt.hash(newPassword, SALT_ROUNDS),
		autoLockMinutes: validateAutoLockMinutes(input?.autoLockMinutes, vault.autoLockMinutes),
	});
	await vaultAccessService.revokeAllVaultAccess(vault.id);
	return vaultWithAccess(updated, userId, tokenFingerprint);
}

async function lockVault(userId, reference, tokenFingerprint) {
	const vault = await ownedVaultOrThrow(userId, reference);
	await vaultAccessService.revokeVaultAccess(vault.id, userId, tokenFingerprint);
	return vaultWithAccess(vault, userId, tokenFingerprint);
}

async function updateVault(userId, reference, input, tokenFingerprint) {
	const vault = await ownedVaultOrThrow(userId, reference);
	await requireUnlocked(vault, userId, tokenFingerprint);
	const hasName = Object.prototype.hasOwnProperty.call(input || {}, 'name');
	const hasDescription = Object.prototype.hasOwnProperty.call(input || {}, 'description');
	const hasPassword = Object.prototype.hasOwnProperty.call(input || {}, 'password');
	if (!hasName && !hasDescription && !hasPassword) throw createHttpError(400, 'Provide a name or description to update');
	if (hasPassword && vault.passwordHash) throw createHttpError(400, 'Vault password changes are not supported');
	let updated = await vaultRepository.updateVault(vault.id, {
		name: hasName ? validateName(input.name) : vault.name,
		description: hasDescription ? validateDescription(input.description) : vault.description,
	});
	if (hasPassword) updated = await vaultRepository.setVaultPassword(vault.id, await bcrypt.hash(validatePassword(input.password), SALT_ROUNDS));
	return vaultWithAccess(updated, userId, tokenFingerprint);
}

async function deleteVault(userId, reference, tokenFingerprint) {
	const vault = await ownedVaultOrThrow(userId, reference);
	await requireUnlocked(vault, userId, tokenFingerprint);
	await vaultRepository.deleteVault(vault.id);
}

function normalizeAssetIds(input) {
	if (!Array.isArray(input) || input.length === 0) throw createHttpError(400, 'Select at least one asset');
	if (input.length > ASSET_BATCH_MAX) throw createHttpError(400, `Add no more than ${ASSET_BATCH_MAX} assets at once`);
	const ids = input.map(Number);
	if (ids.some((id) => !Number.isInteger(id) || id <= 0)) throw createHttpError(400, 'Asset IDs must be positive integers');
	if (new Set(ids).size !== ids.length) throw createHttpError(400, 'Duplicate asset IDs are not allowed');
	return ids;
}

async function addAssets(userId, reference, input, tokenFingerprint) {
	const vault = await ownedVaultOrThrow(userId, reference);
	await requireUnlocked(vault, userId, tokenFingerprint);
	const assetIds = normalizeAssetIds(input?.assetIds);
	const ownedIds = await vaultRepository.getOwnedAssetsByIds(userId, assetIds);
	if (ownedIds.length !== assetIds.length) throw createHttpError(404, 'One or more assets were not found');
	const existingIds = await vaultRepository.getExistingMembershipIds(vault.id, assetIds);
	if (existingIds.length) throw createHttpError(409, 'One or more assets are already in this Vault');
	try {
		await vaultRepository.addAssets(vault.id, assetIds);
	} catch (error) {
		if (error.code === 'SQLITE_CONSTRAINT') throw createHttpError(409, 'Unable to add duplicate or unavailable assets');
		throw error;
	}
	return getVault(userId, vault.reference, tokenFingerprint);
}

async function removeAsset(userId, reference, assetId, tokenFingerprint) {
	const vault = await ownedVaultOrThrow(userId, reference);
	await requireUnlocked(vault, userId, tokenFingerprint);
	const numericAssetId = Number(assetId);
	if (!Number.isInteger(numericAssetId) || numericAssetId <= 0) throw createHttpError(400, 'Asset ID must be a positive integer');
	if (!await vaultRepository.removeAsset(vault.id, numericAssetId)) throw createHttpError(404, 'Asset is not in this Vault');
	return getVault(userId, vault.reference, tokenFingerprint);
}

async function getStats(userId) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	const stats = await vaultRepository.getVaultStats(userId);
	return { ...stats, unorganizedAssets: Math.max(0, stats.totalAssets - stats.organizedAssets) };
}

module.exports = {
	createVault,
	getVaults,
	getVault,
	unlockVault,
	lockVault,
	changePassword,
	resetPassword,
	updateVault,
	deleteVault,
	addAssets,
	removeAsset,
	getStats,
};
