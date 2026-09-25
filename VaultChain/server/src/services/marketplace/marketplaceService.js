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
	const previewAvailable = listing.status === 'active' && !protection.isLocked;
	return {
		id: listing.id,
		reference: listing.reference,
		title: listing.title,
		description: listing.description,
		price: listing.price,
		currency: 'VaultChain Credits',
		status: listing.status,
		createdAt: listing.createdAt,
		soldAt: listing.soldAt,
		seller: {
			reference: publicOwnerReference(listing.sellerId),
			isCurrentUser: isSeller,
		},
		documentId: listing.documentId || null,
		documentPageCount: listing.documentPageCount || 1,
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
	const listing = await getInternalListing(reference);
	const publicListing = await toPublicListing(listing, userId, tokenFingerprint);
	if (userId && userId !== listing.sellerId) {
		const request = await marketplaceRepository.getLatestAccessRequestForListingAndBuyer(listing.id, userId);
		const activeGrant = await marketplaceRepository.getActiveAccessGrant({ buyerId: userId, listingId: listing.id });
		publicListing.userAccess = {
			hasActiveRequest: Boolean(request && request.status === 'pending'),
			requestStatus: request ? request.status : null,
			requestId: request ? request.id : null,
			grant: activeGrant || null,
		};
	}
	return publicListing;
}

async function createAccessRequest(userId, reference, { message } = {}) {
	const listing = await getInternalListing(reference);
	if (listing.sellerId === userId) {
		throw httpError(400, 'You cannot request access to your own listing', 'OWN_LISTING');
	}
	if (listing.status !== 'active') {
		throw httpError(409, 'Cannot request access for an inactive listing', 'LISTING_NOT_ACTIVE');
	}

	const pending = await marketplaceRepository.getPendingAccessRequest({
		listingId: listing.id,
		requesterId: userId,
	});
	if (pending) {
		throw httpError(409, 'You already have a pending access request for this listing', 'DUPLICATE_PENDING_REQUEST');
	}

	const request = await marketplaceRepository.createAccessRequest({
		listingId: listing.id,
		documentId: listing.documentId,
		requesterId: userId,
		ownerId: listing.sellerId,
		message: validateText(message, 'Message', 500, false),
	});

	return request;
}

async function getReceivedAccessRequests(ownerId) {
	return marketplaceRepository.getAccessRequestsByOwner(ownerId);
}

async function getSentAccessRequests(requesterId) {
	return marketplaceRepository.getAccessRequestsByRequester(requesterId);
}

async function getAccessRequestStatus(userId, reference) {
	const listing = await getInternalListing(reference);
	const request = await marketplaceRepository.getLatestAccessRequestForListingAndBuyer(listing.id, userId);
	const activeGrant = await marketplaceRepository.getActiveAccessGrant({ buyerId: userId, listingId: listing.id });
	return {
		listingId: listing.id,
		listingReference: listing.reference,
		request,
		grant: activeGrant,
	};
}

async function approveAccessRequest(ownerId, requestId, { accessType = 'all', canView = true, canDownload = false, pages = [], expiresAt = null } = {}) {
	const numericRequestId = Number(requestId);
	if (!Number.isInteger(numericRequestId) || numericRequestId <= 0) {
		throw httpError(400, 'Invalid request ID');
	}

	const request = await marketplaceRepository.getAccessRequestById(numericRequestId);
	if (!request) {
		throw httpError(404, 'Access request not found', 'REQUEST_NOT_FOUND');
	}
	if (request.ownerId !== ownerId) {
		throw httpError(403, 'You are not authorized to approve this access request', 'FORBIDDEN');
	}
	if (request.status !== 'pending') {
		throw httpError(409, `Cannot approve a request with status '${request.status}'`, 'REQUEST_NOT_PENDING');
	}

	const normalizedType = String(accessType || 'all').toLowerCase();
	if (!['all', 'selected', 'single'].includes(normalizedType)) {
		throw httpError(400, "Invalid accessType. Must be 'all', 'selected', or 'single'", 'INVALID_ACCESS_TYPE');
	}

	let normalizedPages = [];
	if (normalizedType === 'single') {
		if (!pages || (Array.isArray(pages) && pages.length !== 1)) {
			throw httpError(400, 'Single page access requires exactly one page number', 'INVALID_PAGES');
		}
		const pageVal = Array.isArray(pages) ? pages[0] : pages;
		const parsed = parseInt(pageVal, 10);
		if (isNaN(parsed) || parsed < 1) {
			throw httpError(400, 'Page number must be a positive integer', 'INVALID_PAGES');
		}
		normalizedPages = [parsed];
	} else if (normalizedType === 'selected') {
		if (!Array.isArray(pages) || pages.length === 0) {
			throw httpError(400, 'Selected pages access requires at least one page number', 'INVALID_PAGES');
		}
		normalizedPages = pages.map((p) => parseInt(p, 10)).filter((p) => !isNaN(p) && p > 0);
		if (normalizedPages.length === 0) {
			throw httpError(400, 'Valid page numbers are required for selected pages access', 'INVALID_PAGES');
		}
	}

	await marketplaceRepository.updateAccessRequestStatus(numericRequestId, {
		status: 'approved',
		respondedBy: ownerId,
	});

	const grant = await marketplaceRepository.createAccessGrant({
		accessRequestId: numericRequestId,
		listingId: request.listingId,
		documentId: request.documentId,
		buyerId: request.requesterId,
		ownerId,
		accessType: normalizedType,
		canView: Boolean(canView),
		canDownload: Boolean(canDownload),
		expiresAt: expiresAt || null,
		pages: normalizedPages,
	});

	const updatedRequest = await marketplaceRepository.getAccessRequestById(numericRequestId);
	return {
		request: updatedRequest,
		grant,
	};
}

async function rejectAccessRequest(ownerId, requestId) {
	const numericRequestId = Number(requestId);
	if (!Number.isInteger(numericRequestId) || numericRequestId <= 0) {
		throw httpError(400, 'Invalid request ID');
	}

	const request = await marketplaceRepository.getAccessRequestById(numericRequestId);
	if (!request) {
		throw httpError(404, 'Access request not found', 'REQUEST_NOT_FOUND');
	}
	if (request.ownerId !== ownerId) {
		throw httpError(403, 'You are not authorized to reject this access request', 'FORBIDDEN');
	}
	if (request.status !== 'pending') {
		throw httpError(409, `Cannot reject a request with status '${request.status}'`, 'REQUEST_NOT_PENDING');
	}

	await marketplaceRepository.updateAccessRequestStatus(numericRequestId, {
		status: 'rejected',
		respondedBy: ownerId,
	});

	return marketplaceRepository.getAccessRequestById(numericRequestId);
}

async function revokeAccessGrant(ownerId, grantId) {
	const numericGrantId = Number(grantId);
	if (!Number.isInteger(numericGrantId) || numericGrantId <= 0) {
		throw httpError(400, 'Invalid grant ID');
	}

	const grant = await marketplaceRepository.getAccessGrantById(numericGrantId);
	if (!grant) {
		throw httpError(404, 'Access grant not found', 'GRANT_NOT_FOUND');
	}
	if (grant.ownerId !== ownerId) {
		throw httpError(403, 'You are not authorized to revoke this access grant', 'FORBIDDEN');
	}
	if (grant.revokedAt) {
		throw httpError(409, 'Access grant is already revoked', 'ALREADY_REVOKED');
	}

	return marketplaceRepository.revokeAccessGrant(numericGrantId, ownerId);
}

async function updateListing(userId, reference, payload, tokenFingerprint) {
	const listing = await getInternalListing(reference);
	if (listing.sellerId !== userId) throw httpError(404, 'Listing not found');
	if (listing.status !== 'active') throw httpError(409, 'Only active listings can be updated');
	const result = await marketplaceRepository.updateActiveListing(listing.reference, userId, {
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

module.exports = {
	createListing, getListings, getListing, updateListing, deleteListing,
	getListingContent, purchaseListing, getOwnershipHistory,
	toPublicListing, createUniqueReference,
	createAccessRequest, getReceivedAccessRequests, getSentAccessRequests,
	getAccessRequestStatus, approveAccessRequest, rejectAccessRequest,
	revokeAccessGrant,
};
