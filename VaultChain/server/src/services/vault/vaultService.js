const crypto = require('crypto');

const vaultRepository = require('../../repositories/vaultRepository');

const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;
const ASSET_BATCH_MAX = 50;

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

function publicAsset(asset) {
	return {
		...asset,
		reference: `VC-A${String(asset.id).padStart(6, '0')}`,
		contentUrl: `/api/assets/${asset.id}/content`,
	};
}

function publicVault(vault, assets = []) {
	return {
		reference: vault.reference,
		name: vault.name,
		description: vault.description,
		assetCount: vault.assetCount,
		createdAt: vault.createdAt,
		updatedAt: vault.updatedAt,
		assets: assets.map(publicAsset),
	};
}

async function ownedVaultOrThrow(userId, reference) {
	const vault = await vaultRepository.getVaultByReferenceAndUserId(normalizeReference(reference), userId);
	if (!vault) throw createHttpError(404, 'Vault not found');
	return vault;
}

async function createVault(userId, input) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	const name = validateName(input?.name);
	const description = validateDescription(input?.description);
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const reference = `VT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
		try {
			return publicVault(await vaultRepository.createVault({ userId, reference, name, description }));
		} catch (error) {
			if (error.code !== 'SQLITE_CONSTRAINT') throw error;
		}
	}
	throw createHttpError(500, 'Unable to allocate a Vault reference');
}

async function getVaults(userId) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	const vaults = await vaultRepository.getVaultsByUserId(userId);
	return Promise.all(vaults.map(async (vault) => publicVault(
		vault,
		await vaultRepository.getVaultAssets(vault.id, userId, 3)
	)));
}

async function getVault(userId, reference) {
	const vault = await ownedVaultOrThrow(userId, reference);
	return publicVault(vault, await vaultRepository.getVaultAssets(vault.id, userId));
}

async function updateVault(userId, reference, input) {
	const vault = await ownedVaultOrThrow(userId, reference);
	const hasName = Object.prototype.hasOwnProperty.call(input || {}, 'name');
	const hasDescription = Object.prototype.hasOwnProperty.call(input || {}, 'description');
	if (!hasName && !hasDescription) throw createHttpError(400, 'Provide a name or description to update');
	const updated = await vaultRepository.updateVault(vault.id, {
		name: hasName ? validateName(input.name) : vault.name,
		description: hasDescription ? validateDescription(input.description) : vault.description,
	});
	return publicVault(updated, await vaultRepository.getVaultAssets(vault.id, userId));
}

async function deleteVault(userId, reference) {
	const vault = await ownedVaultOrThrow(userId, reference);
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

async function addAssets(userId, reference, input) {
	const vault = await ownedVaultOrThrow(userId, reference);
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
	return getVault(userId, vault.reference);
}

async function removeAsset(userId, reference, assetId) {
	const vault = await ownedVaultOrThrow(userId, reference);
	const numericAssetId = Number(assetId);
	if (!Number.isInteger(numericAssetId) || numericAssetId <= 0) throw createHttpError(400, 'Asset ID must be a positive integer');
	if (!await vaultRepository.removeAsset(vault.id, numericAssetId)) throw createHttpError(404, 'Asset is not in this Vault');
	return getVault(userId, vault.reference);
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
	updateVault,
	deleteVault,
	addAssets,
	removeAsset,
	getStats,
};
