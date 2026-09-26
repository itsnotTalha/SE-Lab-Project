const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const { documentUploadDirectory } = require('../../middleware/upload');
const documentRepository = require('../../repositories/documentRepository');
const marketplaceRepository = require('../../repositories/marketplaceRepository');
const { generateFileSha256 } = require('../hashing/sha256Service');
const { generateTextSha256 } = require('../hashing/textHashService');
const { extractDocumentText } = require('../ocr/ocrService');

function httpError(status, message, details = {}) {
	const error = new Error(message);
	error.status = status;
	Object.assign(error, details);
	return error;
}

function documentId(value) {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) throw httpError(404, 'Document not found');
	return id;
}

function safeOriginalName(value) {
	return path.basename(String(value || 'document')).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'document';
}

function contentPath(document) {
	return path.resolve(documentUploadDirectory, path.basename(document.storedName));
}

function publicDocument(document, includeOcr = false) {
	return {
		id: document.id,
		reference: `DOC-${String(document.id).padStart(6, '0')}`,
		originalName: document.originalName,
		mimeType: document.mimeType,
		fileSize: document.fileSize,
		sha256: document.sha256Hash,
		textSha256: document.textSha256 || document.semanticHash || null,
		semanticHash: document.semanticHash || document.textSha256 || null,
		pageCount: document.pageCount,
		language: document.language,
		ocrStatus: document.ocrStatus,
		ocrProcessedAt: document.ocrProcessedAt,
		description: document.description || null,
		category: document.category || (document.mimeType?.startsWith('image/') ? 'image' : 'pdf'),
		createdAt: document.createdAt,
		contentUrl: `/api/documents/${document.id}/content`,
		...(includeOcr ? { extractedText: document.extractedText || '', ocrError: document.ocrError || null, confidence: document.confidence } : {}),
	};
}

async function ownedDocument(userId, id) {
	const document = await documentRepository.getDocumentByIdAndOwnerId(documentId(id), userId);
	if (!document) throw httpError(404, 'Document not found');
	return document;
}

function safeOcrError(error) {
	if (/limited to \d+ pages/.test(error.message || '')) return error.message;
	return 'Text extraction failed. You can retry OCR.';
}

async function processOcr(userId, id, checkContentDuplicate = false) {
	const document = await ownedDocument(userId, id);
	await documentRepository.setOcrStatus(document.id, userId, 'processing');
	try {
		const result = await extractDocumentText({ filePath: contentPath(document), mimeType: document.mimeType });
		const textSha256 = generateTextSha256(result.text);

		if (checkContentDuplicate && textSha256) {
			const contentDuplicate = await documentRepository.findDocumentByTextHash(textSha256, document.id);
			if (contentDuplicate) {
				await deleteDocument(userId, document.id);
				throw httpError(409, 'Duplicate document detected: identical text content already exists', {
					duplicate: {
						isDuplicate: true,
						duplicateType: 'content',
						matchPercentage: 100,
						exactMatch: false,
						textContentMatch: true,
						textSha256,
						existingDocument: {
							id: contentDuplicate.id,
							reference: `DOC-${String(contentDuplicate.id).padStart(6, '0')}`,
							originalName: contentDuplicate.originalName,
							createdAt: contentDuplicate.createdAt,
							pageCount: contentDuplicate.pageCount,
						},
					},
				});
			}
		}

		await documentRepository.saveOcrResult(document.id, userId, {
			...result,
			textSha256,
			semanticHash: textSha256,
		});
	} catch (error) {
		if (error.status === 409) throw error;
		await documentRepository.setOcrStatus(document.id, userId, 'failed', safeOcrError(error));
	}
	return publicDocument(await ownedDocument(userId, document.id), true);
}

async function uploadDocument(userId, file, metadata = {}) {
	if (!file) throw httpError(400, 'Document file is required');
	const fileSha256 = await generateFileSha256(file.path);

	const existingDocument = await documentRepository.findDocumentBySha256(fileSha256);
	if (existingDocument) {
		await fs.unlink(file.path).catch(() => {});
		throw httpError(409, 'Duplicate document detected: exact file has already been uploaded', {
			duplicate: {
				isDuplicate: true,
				duplicateType: 'exact',
				matchPercentage: 100,
				exactMatch: true,
				textContentMatch: true,
				sha256: fileSha256,
				existingDocument: {
					id: existingDocument.id,
					reference: `DOC-${String(existingDocument.id).padStart(6, '0')}`,
					originalName: existingDocument.originalName,
					createdAt: existingDocument.createdAt,
					pageCount: existingDocument.pageCount,
					ocrStatus: existingDocument.ocrStatus,
				},
			},
		});
	}

	const resolvedCategory = metadata.category === 'image' || file.mimetype?.startsWith('image/') ? 'image' : 'pdf';
	const resolvedName = safeOriginalName(metadata.name || metadata.title || metadata.originalName || file.originalname);
	const resolvedDescription = typeof metadata.description === 'string' ? metadata.description.trim().slice(0, 1000) : null;

	let document;
	try {
		document = await documentRepository.createDocument({
			ownerId: userId,
			originalName: resolvedName,
			storedName: path.basename(file.filename),
			filePath: file.path,
			mimeType: file.mimetype,
			fileSize: file.size,
			sha256Hash: fileSha256,
			description: resolvedDescription,
			category: resolvedCategory,
		});
	} catch (error) {
		await fs.unlink(file.path).catch(() => {});
		throw error;
	}
	return processOcr(userId, document.id, true);
}

function listOptions(query = {}) {
	const value = (name) => {
		if (Array.isArray(query[name])) throw httpError(400, `Invalid ${name} filter`);
		return String(query[name] || '').trim();
	};
	const search = value('search');
	const type = value('type').toLowerCase();
	const ocrStatus = value('ocrStatus').toLowerCase();
	if (search.length > 200) throw httpError(400, 'Search must be 200 characters or fewer');
	if (type && !['pdf', 'image'].includes(type)) throw httpError(400, 'Invalid document type filter');
	if (ocrStatus && !['pending', 'processing', 'completed', 'failed'].includes(ocrStatus)) {
		throw httpError(400, 'Invalid OCR status filter');
	}
	return { search, type, ocrStatus };
}

async function getDocuments(userId, query) {
	return (await documentRepository.getDocumentsByOwnerId(userId, listOptions(query))).map((document) => ({
		...publicDocument(document),
		matchedOcrText: document.matchedOcrText,
		ocrSnippet: document.ocrSnippet,
	}));
}

async function getDocument(userId, id) {
	return publicDocument(await ownedDocument(userId, id), true);
}

async function getOcrResult(userId, id) {
	const document = await ownedDocument(userId, id);
	return {
		status: document.ocrStatus,
		extractedText: document.extractedText || '',
		processedAt: document.ocrProcessedAt,
		error: document.ocrError || null,
		confidence: document.confidence,
	};
}

async function validateDocumentAccess(userId, id, { action = 'view', page = null } = {}) {
	const numericId = Number(id);
	if (!Number.isInteger(numericId) || numericId <= 0) {
		throw httpError(404, 'Document not found');
	}
	const document = await documentRepository.getDocumentById(numericId);
	if (!document) {
		throw httpError(404, 'Document not found');
	}

	if (document.ownerId === userId) {
		return { document, grant: null, isOwner: true };
	}

	const grant = await marketplaceRepository.getActiveAccessGrant({
		buyerId: userId,
		documentId: document.id,
	});

	if (!grant) {
		throw httpError(403, 'Access denied: No active grant for this document', { code: 'FORBIDDEN' });
	}

	if (grant.revokedAt) {
		throw httpError(403, 'Access grant has been revoked', { code: 'GRANT_REVOKED' });
	}

	if (grant.expiresAt && new Date(grant.expiresAt) <= new Date()) {
		throw httpError(403, 'Access grant has expired', { code: 'GRANT_EXPIRED' });
	}

	if (action === 'view') {
		if (!grant.canView) {
			throw httpError(403, 'View permission has not been granted for this document', { code: 'VIEW_NOT_PERMITTED' });
		}
		if (page != null) {
			const pageNum = parseInt(page, 10);
			if (isNaN(pageNum) || pageNum < 1) {
				throw httpError(400, 'Page number must be a positive integer', { code: 'INVALID_PAGE' });
			}
			if (grant.accessType !== 'all') {
				if (!grant.pages.includes(pageNum)) {
					throw httpError(403, `Access to page ${pageNum} is not permitted`, { code: 'PAGE_NOT_PERMITTED' });
				}
			}
		} else if (grant.accessType !== 'all') {
			throw httpError(403, 'Full document view not permitted. Access is restricted to specific pages.', { code: 'PAGE_NOT_PERMITTED' });
		}
	} else if (action === 'download') {
		if (!grant.canDownload) {
			throw httpError(403, 'Download permission has not been granted for this document', { code: 'DOWNLOAD_NOT_PERMITTED' });
		}
	}

	return { document, grant, isOwner: false };
}

async function getDocumentContent(userId, id, page = null) {
	const numericId = documentId(id);
	const owned = await documentRepository.getDocumentByIdAndOwnerId(numericId, userId);
	if (owned) {
		return { document: publicDocument(owned), filePath: contentPath(owned), isOwner: true };
	}

	const document = await documentRepository.getDocumentById(numericId);
	if (!document) {
		throw httpError(404, 'Document not found');
	}

	const activeGrant = await marketplaceRepository.getActiveAccessGrant({ buyerId: userId, documentId: numericId });
	if (!activeGrant) {
		throw httpError(404, 'Document not found');
	}

	const access = await validateDocumentAccess(userId, numericId, { action: 'view', page });
	return { document: publicDocument(access.document), filePath: contentPath(access.document), grant: access.grant, isOwner: false };
}

async function getProtectedPageContent(userId, id, page) {
	const numericId = documentId(id);
	const pageNum = parseInt(page, 10);
	if (isNaN(pageNum) || pageNum < 1) {
		throw httpError(400, 'Invalid page number');
	}
	const access = await validateDocumentAccess(userId, numericId, { action: 'view', page: pageNum });
	return {
		document: publicDocument(access.document),
		filePath: contentPath(access.document),
		pageNumber: pageNum,
		grant: access.grant,
		isOwner: access.isOwner,
	};
}

async function getDocumentAccessPermissions(userId, id) {
	const numericId = documentId(id);
	const document = await documentRepository.getDocumentById(numericId);
	if (!document) throw httpError(404, 'Document not found');

	if (document.ownerId === userId) {
		return {
			isOwner: true,
			canView: true,
			canDownload: true,
			accessType: 'all',
			pages: Array.from({ length: document.pageCount || 1 }, (_, i) => i + 1),
		};
	}

	const grant = await marketplaceRepository.getActiveAccessGrant({ buyerId: userId, documentId: numericId });
	if (!grant) {
		return {
			isOwner: false,
			canView: false,
			canDownload: false,
			accessType: null,
			pages: [],
		};
	}

	return {
		isOwner: false,
		canView: grant.canView,
		canDownload: grant.canDownload,
		accessType: grant.accessType,
		pages: grant.accessType === 'all'
			? Array.from({ length: document.pageCount || 1 }, (_, i) => i + 1)
			: grant.pages,
	};
}

async function deleteDocument(userId, id) {
	const document = await ownedDocument(userId, id);
	await documentRepository.deleteDocument(document.id, userId);
	await fs.unlink(contentPath(document)).catch((error) => {
		if (error.code !== 'ENOENT') void error;
	});
	const thumbPath = path.resolve(documentUploadDirectory, 'thumbnails', `thumb_${document.id}.png`);
	await fs.unlink(thumbPath).catch(() => {});
	const thumbDir = path.resolve(documentUploadDirectory, 'thumbnails');
	await fs.rmdir(thumbDir).catch(() => {});
}

async function getDocumentThumbnail(userId, id) {
	const numericId = documentId(id);
	let document;
	if (userId) {
		const doc = await documentRepository.getDocumentById(numericId);
		if (!doc) throw httpError(404, 'Document not found');
		if (doc.ownerId === userId) {
			document = doc;
		} else {
			const activeGrant = await marketplaceRepository.getActiveAccessGrant({ buyerId: userId, documentId: numericId });
			if (!activeGrant) {
				throw httpError(404, 'Document not found');
			}
			const access = await validateDocumentAccess(userId, numericId, { action: 'view' });
			if (access.grant && access.grant.accessType !== 'all' && !access.grant.pages.includes(1)) {
				throw httpError(403, 'Access to page 1 thumbnail is not permitted', { code: 'PAGE_NOT_PERMITTED' });
			}
			document = access.document;
		}
	} else {
		throw httpError(401, 'Authentication required');
	}

	const thumbDir = path.resolve(documentUploadDirectory, 'thumbnails');
	await fs.mkdir(thumbDir, { recursive: true });

	const thumbPath = path.resolve(thumbDir, `thumb_${document.id}.png`);
	try {
		await fs.access(thumbPath);
		return { filePath: thumbPath, mimeType: 'image/png' };
	} catch {
		// Needs generation
	}

	const docPath = contentPath(document);
	if (document.mimeType === 'application/pdf') {
		const tempPrefix = path.resolve(thumbDir, `temp_${document.id}_${Date.now()}`);
		try {
			await execFileAsync('pdftoppm', ['-png', '-f', '1', '-l', '1', '-r', '150', docPath, tempPrefix], { timeout: 30000 });
			const candidateName = `${tempPrefix}-1.png`;
			try {
				await fs.access(candidateName);
				await fs.rename(candidateName, thumbPath);
				return { filePath: thumbPath, mimeType: 'image/png' };
			} catch {
				const files = await fs.readdir(thumbDir);
				const match = files.find((name) => name.startsWith(path.basename(tempPrefix)) && name.endsWith('.png'));
				if (match) {
					await fs.rename(path.resolve(thumbDir, match), thumbPath);
					return { filePath: thumbPath, mimeType: 'image/png' };
				}
			}
		} catch (error) {
			console.warn(`Failed to render PDF thumbnail for document ${document.id}:`, error.message);
		}
	} else if (document.mimeType?.startsWith('image/')) {
		return { filePath: docPath, mimeType: document.mimeType };
	}

	throw httpError(404, 'Thumbnail preview not available');
}

const documentVerificationService = require('../verification/documentVerificationService');
const { encryptFile } = require('../encryption/encryptionService');

async function verifyDocument(userId, sourceId, targetId) {
	return documentVerificationService.verifyDocument(userId, documentId(sourceId), documentId(targetId));
}

async function getDocumentReport(userId, id) {
	return documentVerificationService.getDocumentReport(userId, documentId(id));
}

async function encryptAndVaultDocument(userId, id, secret = null) {
	const document = await ownedDocument(userId, id);
	const vaultDir = path.resolve(documentUploadDirectory, '../vault_encrypted');
	const targetEncryptedPath = path.resolve(vaultDir, `doc_${document.id}_${Date.now()}.enc`);
	const encResult = await encryptFile(contentPath(document), targetEncryptedPath, secret);

	const vaultItem = await documentRepository.createVaultItem({
		ownerId: userId,
		title: document.originalName,
		documentId: document.id,
		encryptedPath: encResult.encryptedPath,
		encryptionAlgorithm: encResult.algorithm,
		iv: encResult.iv,
		authTag: encResult.authTag,
	});

	return {
		id: vaultItem.id,
		documentId: document.id,
		title: vaultItem.title,
		algorithm: vaultItem.encryption_algorithm,
		iv: vaultItem.iv,
		authTag: vaultItem.auth_tag,
		createdAt: vaultItem.created_at,
	};
}

async function getDocumentVaultStatus(userId, id) {
	const document = await ownedDocument(userId, id);
	const vaultItem = await documentRepository.getVaultItemByDocumentId(document.id, userId);
	return {
		documentId: document.id,
		isVaulted: Boolean(vaultItem),
		vaultItem: vaultItem ? {
			id: vaultItem.id,
			title: vaultItem.title,
			algorithm: vaultItem.encryption_algorithm,
			createdAt: vaultItem.created_at,
		} : null,
	};
}

const assetRepository = require('../../repositories/assetRepository');
const vaultRepository = require('../../repositories/vaultRepository');
const marketplaceService = require('../marketplace/marketplaceService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function addDocumentToMarketplace(userId, id, payload = {}, tokenFingerprint = null) {
	const document = await ownedDocument(userId, id);
	let assetId = document.assetId;

	if (!assetId) {
		const createdAsset = await assetRepository.createAsset({
			ownerId: userId,
			title: payload.title?.trim() || document.originalName,
			description: payload.description?.trim() || document.description || 'Document Asset',
			category: document.category || 'document',
			fileName: document.storedName,
			filePath: document.filePath,
			fileSize: document.fileSize,
			mimeType: document.mimeType,
			status: 'verified',
		});
		assetId = createdAsset.id;
		await assetRepository.upsertAssetHash({ assetId, sha256Hash: document.sha256Hash });
	}

	let userVaults = await vaultRepository.getVaultsByUserId(userId);
	let targetVault = userVaults.find((v) => v.passwordHash);
	if (!targetVault) {
		const salt = await bcrypt.genSalt(10);
		const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), salt);
		const reference = `VT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
		targetVault = await vaultRepository.createVault({
			userId,
			reference,
			name: 'Document Security Vault',
			description: 'Automated protected vault for listed documents',
			passwordHash,
			autoLockMinutes: 10,
		});
	}
	await vaultRepository.addAssets(targetVault.id, [assetId]).catch(() => {});

	const existingListing = await marketplaceRepository.getActiveListingForAsset(assetId);
	if (existingListing) {
		return marketplaceService.toPublicListing(existingListing, userId, tokenFingerprint);
	}

	const rawPrice = payload.price ? Number(payload.price) : 50;
	const listing = await marketplaceRepository.createListing({
		reference: await marketplaceService.createUniqueReference('ML'),
		assetId,
		sellerId: userId,
		title: (payload.title || document.originalName).slice(0, 120),
		description: (payload.description || document.description || 'Document listed from Secure Vault (Locked)').slice(0, 1000),
		price: Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 50,
	});

	return marketplaceService.toPublicListing(listing, userId, tokenFingerprint);
}

const authRepository = require('../../repositories/authRepository');

async function verifyAndGetDownloadContent(userId, id, password) {
	if (!password || typeof password !== 'string') {
		throw httpError(400, 'Account password is required to download document');
	}
	const user = await authRepository.findUserById(userId);
	if (!user) {
		throw httpError(404, 'User account not found');
	}
	const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
	if (!isPasswordValid) {
		throw httpError(401, 'Incorrect account password');
	}

	const numericId = documentId(id);
	const document = await documentRepository.getDocumentById(numericId);
	if (!document) {
		throw httpError(404, 'Document not found');
	}

	if (document.ownerId !== userId) {
		await validateDocumentAccess(userId, numericId, { action: 'download' });
	}

	return {
		filePath: contentPath(document),
		fileName: document.originalName,
		mimeType: document.mimeType,
	};
}

module.exports = {
	uploadDocument,
	getDocuments,
	getDocument,
	getOcrResult,
	getDocumentContent,
	getProtectedPageContent,
	getDocumentAccessPermissions,
	validateDocumentAccess,
	processOcr,
	deleteDocument,
	verifyDocument,
	getDocumentReport,
	encryptAndVaultDocument,
	getDocumentVaultStatus,
	getDocumentThumbnail,
	addDocumentToMarketplace,
	verifyAndGetDownloadContent,
};
