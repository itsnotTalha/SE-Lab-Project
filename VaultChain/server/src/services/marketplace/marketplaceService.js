const crypto = require('crypto');

const assetRepository = require('../../repositories/assetRepository');
const marketplaceRepository = require('../../repositories/marketplaceRepository');
const vaultAccessService = require('../vault/vaultAccessService');
const settingsRepository = require('../../repositories/settingsRepository');

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

async function validatePrice(price) {
	const number = Number(price);
	const minimum = await settingsRepository.getNumericSetting('minimum_listing_price', 1);
	if (!Number.isFinite(number) || number < minimum || number > 1000000000) {
		throw httpError(400, `Price must be at least ${minimum}`);
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
	const request = !isSeller && listing.previewRequiresApproval
		? await marketplaceRepository.getPreviewRequest(listing.id, requesterId) : null;
	const active = listing.status === 'active' && listing.asset.ownerId === listing.sellerId;
	const previewAvailable = active && (isSeller ? !protection.isLocked : !listing.previewRequiresApproval || request?.status === 'approved');
	const previewHidden = !previewAvailable;
	return {
		reference: listing.reference,
		title: listing.title,
		description: listing.description,
		price: listing.price,
		currency: 'VaultChain Credits',
		status: listing.status,
		createdAt: listing.createdAt,
		soldAt: listing.soldAt,
		seller: {
			reference: listing.isAnonymous ? null : publicOwnerReference(listing.sellerId),
			name: listing.isAnonymous ? null : listing.sellerName,
			isAnonymous: listing.isAnonymous,
			isCurrentUser: isSeller,
		},
		previewRequest: request ? { id: request.id, status: request.status } : null,
		pendingPreviewRequests: isSeller && active ? listing.pendingPreviewRequests : 0,
		asset: {
			id: isSeller ? listing.assetId : null,
			reference: publicAssetReference(listing.assetId),
			title: listing.asset.title,
			category: previewHidden ? null : listing.asset.category,
			mimeType: previewHidden ? null : listing.asset.mimeType,
			fileSize: previewHidden ? null : listing.asset.fileSize,
			width: previewAvailable ? listing.asset.width : null,
			height: previewAvailable ? listing.asset.height : null,
			previewAvailable,
			contentUrl: previewAvailable ? `/api/marketplace/listings/${listing.reference}/content` : null,
			passwordProtected: protection.passwordProtected,
			isLocked: active && previewHidden,
			previewRequiresApproval: listing.previewRequiresApproval,
		},
	};
}

async function getInternalListing(reference) {
	const listing = await marketplaceRepository.getListingByReference(validateReference(reference));
	if (!listing) throw httpError(404, 'Listing not found', 'LISTING_NOT_FOUND');
	return listing;
}

async function createListing(userId, tokenFingerprint, { assetId, title, description, price, isAnonymous = false }) {
	if (typeof isAnonymous !== 'boolean') throw httpError(400, 'isAnonymous must be a boolean');
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
			isAnonymous,
			previewRequiresApproval: await marketplaceRepository.assetIsInVault(numericAssetId, userId),
			title: validateText(title, 'Title', 120),
			description: validateText(description, 'Description', 1000, false),
			price: await validatePrice(price),
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
	if (payload.isAnonymous !== undefined && typeof payload.isAnonymous !== 'boolean') throw httpError(400, 'isAnonymous must be a boolean');
	const result = await marketplaceRepository.updateActiveListing(listing.reference, userId, {
		isAnonymous: payload.isAnonymous,
		price: payload.price == null ? null : await validatePrice(payload.price),
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
	if (userId === listing.sellerId) {
		await vaultAccessService.assertAssetUnlocked(listing.sellerId, listing.assetId, tokenFingerprint);
	} else if (listing.previewRequiresApproval) {
		const request = await marketplaceRepository.getPreviewRequest(listing.id, userId);
		if (request?.status !== 'approved') throw httpError(423, 'Request preview access and wait for seller approval', 'PREVIEW_APPROVAL_REQUIRED');
	}
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
		platformFee: receipt.platformFee,
		sellerAmount: receipt.sellerAmount,
		currency: 'VaultChain Credits',
		completedAt: receipt.completedAt,
		buyerBalance: receipt.buyerBalance,
		sellerBalance: receipt.sellerBalance,
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




async function activeOwnedListing(reference, sellerId) {
	const listing = await getInternalListing(reference);
	if (listing.sellerId !== sellerId || listing.asset.ownerId !== sellerId) throw httpError(404, 'Listing not found');
	if (listing.status !== 'active') throw httpError(409, 'Listing is no longer active');
	return listing;
}

async function requestPreview(userId, reference) {
	const listing = await getInternalListing(reference);
	if (listing.status !== 'active' || listing.asset.ownerId !== listing.sellerId) throw httpError(409, 'Listing is no longer active');
	if (listing.sellerId === userId) throw httpError(400, 'You cannot request your own preview');
	if (!listing.previewRequiresApproval) throw httpError(400, 'This preview does not require approval');
	const request = await marketplaceRepository.createPreviewRequest(listing.id, userId);
	if (!request) throw httpError(409, 'Listing is no longer active');
	return { id: request.id, status: request.status };
}

async function getPreviewRequests(userId, reference) {
	const listing = await activeOwnedListing(reference, userId);
	return (await marketplaceRepository.getPreviewRequests(listing.id)).map((request) => ({
		id: request.id, buyerName: request.buyer_name, status: request.status,
		createdAt: request.created_at, updatedAt: request.updated_at,
	}));
}

async function decidePreviewRequest(userId, reference, requestId, status, tokenFingerprint) {
	const listing = await activeOwnedListing(reference, userId);
	if (!['approved', 'denied', 'revoked'].includes(status)) throw httpError(400, 'Invalid preview decision');
	const id = Number(requestId);
	if (!Number.isSafeInteger(id) || id <= 0) throw httpError(404, 'Preview request not found');
	if (status === 'approved') await vaultAccessService.assertAssetUnlocked(userId, listing.assetId, tokenFingerprint);
	const result = await marketplaceRepository.decidePreviewRequest(listing.id, userId, id, status);
	if (!result.changes) throw httpError(404, 'Active listing or preview request not found');
	return { id, status };
}

module.exports = {
	createListing, getListings, getListing, updateListing, deleteListing,
	getListingContent, purchaseListing, getOwnershipHistory,
	requestPreview, getPreviewRequests, decidePreviewRequest,
};
