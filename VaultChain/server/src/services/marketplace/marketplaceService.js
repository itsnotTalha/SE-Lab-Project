const crypto = require('crypto');

const assetRepository = require('../../repositories/assetRepository');
const marketplaceRepository = require('../../repositories/marketplaceRepository');
const vaultAccessService = require('../vault/vaultAccessService');

const LISTING_REFERENCE = /^ML-[A-F0-9]{6}$/;

function httpError(status, message, code) {
	const error = new Error(message);
	error.status = status;
	error.code = code;
	return error;
}

function publicOwnerReference(ownerId) {
	const secret = process.env.PUBLIC_ID_SECRET || process.env.JWT_SECRET || 'vaultchain-development-secret';
	const digest = crypto.createHmac('sha256', secret).update(`owner:${ownerId}`).digest('hex').slice(0, 8).toUpperCase();
	return `VC-${digest}`;
}

function publicAssetReference(assetId) {
	return `VC-A${String(assetId).padStart(6, '0')}`;
}

function validateReference(reference) {
	const normalized = String(reference || '').trim().toUpperCase();
	if (!LISTING_REFERENCE.test(normalized)) throw httpError(404, 'Listing not found', 'LISTING_NOT_FOUND');
	return normalized;
}

function validateText(value, label, maximum, required = true) {
	const normalized = String(value || '').trim();
	if (required && !normalized) throw httpError(400, `${label} is required`);
	if (normalized.length > maximum) throw httpError(400, `${label} must be ${maximum} characters or fewer`);
	return normalized || null;
}

function validatePrice(price) {
	const number = Number(price);
	if (!Number.isFinite(number) || number <= 0 || number > 1000000000) {
		throw httpError(400, 'Price must be a positive number');
	}
	if (Math.abs(number * 100 - Math.round(number * 100)) > 1e-8) throw httpError(400, 'Price may have at most two decimal places');
	return number;
}

async function createUniqueReference(prefix) {
	for (let attempt = 0; attempt < 8; attempt += 1) {
		const reference = `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
		if (!await marketplaceRepository.getListingByReference(reference)) return reference;
	}
	throw httpError(503, 'Could not allocate a listing reference');
}

function createTransactionReference() {
	return `TX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function toPublicListing(listing, requesterId, tokenFingerprint) {
	const isSeller = requesterId === listing.sellerId;
	let protection = { passwordProtected: false, isLocked: false };
	if (listing.status === 'active' && listing.asset.ownerId === listing.sellerId) {
		protection = await vaultAccessService.getAssetProtection(listing.sellerId, listing.assetId, isSeller ? tokenFingerprint : null);
	}
	const previewAvailable = listing.status === 'active' && !protection.isLocked;
	return {
		reference: listing.reference,
		title: listing.title,
		description: listing.description,
		price: listing.price,
		currency: 'VaultChain Credits',
		status: listing.status,
		createdAt: listing.createdAt,
		soldAt: listing.soldAt,
		seller: { reference: publicOwnerReference(listing.sellerId), isCurrentUser: isSeller },
		asset: {
			id: isSeller ? listing.assetId : null,
			reference: publicAssetReference(listing.assetId),
			title: listing.asset.title,
			category: protection.isLocked ? null : listing.asset.category,
			mimeType: protection.isLocked ? null : listing.asset.mimeType,
			fileSize: protection.isLocked ? null : listing.asset.fileSize,
			width: previewAvailable ? listing.asset.width : null,
			height: previewAvailable ? listing.asset.height : null,
			previewAvailable,
			contentUrl: previewAvailable ? `/api/marketplace/listings/${listing.reference}/content` : null,
			passwordProtected: protection.passwordProtected,
			isLocked: protection.isLocked,
		},
	};
}

async function getInternalListing(reference) {
	const listing = await marketplaceRepository.getListingByReference(validateReference(reference));
	if (!listing) throw httpError(404, 'Listing not found', 'LISTING_NOT_FOUND');
	return listing;
}

async function createListing(userId, tokenFingerprint, { assetId, title, description, price }) {
	const numericAssetId = Number(assetId);
	if (!Number.isInteger(numericAssetId) || numericAssetId <= 0) throw httpError(400, 'assetId is required');
	const asset = await assetRepository.getAssetByIdAndOwnerId(numericAssetId, userId);
	if (!asset) throw httpError(404, 'Asset not found');
	await vaultAccessService.assertAssetUnlocked(userId, numericAssetId, tokenFingerprint);
	if (await marketplaceRepository.getActiveListingForAsset(numericAssetId)) {
		throw httpError(409, 'This asset already has an active listing', 'DUPLICATE_LISTING');
	}
	try {
		const listing = await marketplaceRepository.createListing({
			reference: await createUniqueReference('ML'),
			assetId: numericAssetId,
			sellerId: userId,
			title: validateText(title, 'Title', 120),
			description: validateText(description, 'Description', 1000, false),
			price: validatePrice(price),
		});
		return toPublicListing(listing, userId, tokenFingerprint);
	} catch (error) {
		if (error.code === 'SQLITE_CONSTRAINT') throw httpError(409, 'This asset already has an active listing', 'DUPLICATE_LISTING');
		throw error;
	}
}

async function getListings(userId, tokenFingerprint) {
	const listings = await marketplaceRepository.getListings();
	return Promise.all(listings.map((listing) => toPublicListing(listing, userId, tokenFingerprint)));
}

async function getListing(reference, userId, tokenFingerprint) {
	return toPublicListing(await getInternalListing(reference), userId, tokenFingerprint);
}

async function updateListing(userId, reference, payload, tokenFingerprint) {
	const listing = await getInternalListing(reference);
	if (listing.sellerId !== userId) throw httpError(404, 'Listing not found');
	if (listing.status !== 'active') throw httpError(409, 'Only active listings can be updated');
	const result = await marketplaceRepository.updateActiveListing(listing.reference, userId, {
		price: payload.price == null ? null : validatePrice(payload.price),
		title: payload.title == null ? null : validateText(payload.title, 'Title', 120),
		description: payload.description == null ? null : validateText(payload.description, 'Description', 1000, false),
	});
	if (!result.changes) throw httpError(409, 'Listing is no longer active');
	return toPublicListing(result.listing, userId, tokenFingerprint);
}

async function deleteListing(userId, reference, tokenFingerprint) {
	const listing = await getInternalListing(reference);
	if (listing.sellerId !== userId) throw httpError(404, 'Listing not found');
	if (listing.status !== 'active') throw httpError(409, 'Only active listings can be cancelled');
	const result = await marketplaceRepository.cancelListing(listing.reference, userId);
	if (!result.changes) throw httpError(409, 'Listing is no longer active');
	return toPublicListing(result.listing, userId, tokenFingerprint);
}

async function getListingContent(reference, userId, tokenFingerprint) {
	const listing = await getInternalListing(reference);
	if (listing.status !== 'active' || listing.asset.ownerId !== listing.sellerId) {
		throw httpError(404, 'Listing content not found');
	}
	const accessFingerprint = userId === listing.sellerId ? tokenFingerprint : null;
	await vaultAccessService.assertAssetUnlocked(listing.sellerId, listing.assetId, accessFingerprint);
	return listing.asset;
}

async function purchaseListing(userId, reference) {
	const receipt = await marketplaceRepository.purchaseListing({
		reference: validateReference(reference),
		buyerId: userId,
		transactionReference: createTransactionReference(),
	});
	return {
		transactionReference: receipt.transactionReference,
		listingReference: receipt.listingReference,
		asset: { reference: publicAssetReference(receipt.assetId), title: receipt.assetTitle },
		previousOwner: publicOwnerReference(receipt.previousOwnerId),
		newOwner: publicOwnerReference(receipt.newOwnerId),
		price: receipt.price,
		currency: 'VaultChain Credits',
		completedAt: receipt.completedAt,
		buyerBalance: receipt.buyerBalance,
	};
}

async function getOwnershipHistory(userId, assetId) {
	const numericId = Number(assetId);
	const asset = await assetRepository.getAssetByIdAndOwnerId(numericId, userId);
	if (!asset) throw httpError(404, 'Asset not found');
	return (await marketplaceRepository.getOwnershipHistory(numericId)).map((record) => ({
		transactionReference: record.transactionReference,
		listingReference: record.listingReference,
		price: record.price,
		currency: 'VaultChain Credits',
		transferType: record.transferType,
		transferredAt: record.transferredAt,
		previousOwner: record.previousOwnerId ? publicOwnerReference(record.previousOwnerId) : null,
		newOwner: record.newOwnerId ? publicOwnerReference(record.newOwnerId) : null,
	}));
}

module.exports = {
	createListing, getListings, getListing, updateListing, deleteListing,
	getListingContent, purchaseListing, getOwnershipHistory,
};
