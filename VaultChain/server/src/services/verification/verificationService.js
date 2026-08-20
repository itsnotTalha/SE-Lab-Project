const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const { STRONG_MATCH_MAX, POSSIBLE_MATCH_MAX } = require('../../config/perceptualMatching');
const assetRepository = require('../../repositories/assetRepository');
const verificationRepository = require('../../repositories/verificationRepository');
const assetService = require('../asset/assetService');
const { calculatePhashHammingDistance } = require('../hashing/phashComparisonService');
const { generatePhash } = require('../hashing/phashService');
const { generateSha256Hash } = require('../hashing/sha256Service');
const { extractImageMetadata } = require('../metadata/metadataService');
const { compareMetadata, safeMetadataEvidence } = require('./metadataComparisonService');

function createHttpError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

function verificationReference(id) {
	const secret = process.env.PUBLIC_ID_SECRET || process.env.JWT_SECRET || 'vaultchain-development-secret';
	return `VR-${crypto.createHmac('sha256', secret).update(`verification:${id}`).digest('hex').slice(0, 6).toUpperCase()}`;
}

function safeFileName(file) {
	const name = path.basename(String(file.originalname || file.filename || 'comparison-image'));
	return name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'comparison-image';
}

function classifyResult(sha256Match, distance) {
	if (sha256Match) return { result: 'exact', similarity: 'exact' };
	if (distance <= STRONG_MATCH_MAX) return { result: 'strong_visual', similarity: 'strong' };
	if (distance <= POSSIBLE_MATCH_MAX) return { result: 'possible_visual', similarity: 'possible' };
	return { result: 'no_match', similarity: 'none' };
}

function publicReport(row, detailed = true) {
	const base = {
		reference: verificationReference(row.id),
		result: row.status,
		createdAt: row.createdAt,
		registeredAsset: {
			id: row.assetId,
			reference: `VC-A${String(row.assetId).padStart(6, '0')}`,
			title: row.assetTitle,
			fileName: row.assetFileName,
			contentUrl: `/api/assets/${row.assetId}/content`,
		},
		fingerprints: row.report.fingerprints,
	};
	if (!detailed) return base;
	return {
		...base,
		registeredAsset: { ...base.registeredAsset, ...row.report.registeredAsset },
		comparison: row.report.comparison,
		metadataDifferences: row.report.metadataDifferences || [],
		warnings: row.report.warnings || [],
	};
}

async function verifyAsset(userId, { assetId, file }) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	if (!file) throw createHttpError(400, 'Comparison image is required');

	try {
		const numericAssetId = Number(assetId);
		if (!Number.isInteger(numericAssetId) || numericAssetId <= 0) {
			throw createHttpError(400, 'A valid registered asset is required');
		}

		const asset = await assetService.getOwnedAssetOrThrow(userId, numericAssetId);
		if (!asset.sha256Hash || !asset.phash) {
			throw createHttpError(422, 'The registered asset does not have complete fingerprints');
		}

		let registeredMetadata = null;
		try {
			registeredMetadata = await assetRepository.getAssetMetadataByAssetId(asset.id);
		} catch {
			registeredMetadata = null;
		}

		let comparisonMetadata = { width: null, height: null, patterns: [], metadataJson: {} };
		const warnings = [];
		try {
			comparisonMetadata = await extractImageMetadata(file.path);
		} catch {
			warnings.push('Fingerprint comparison completed, but some comparison metadata could not be extracted.');
		}

		const [comparisonSha256, comparisonPhash] = await Promise.all([
			generateSha256Hash({ filePath: file.path, metadata: comparisonMetadata }),
			generatePhash({ filePath: file.path, mimeType: file.mimetype }),
		]);
		const sha256Match = comparisonSha256 === asset.sha256Hash;
		let perceptualDistance;
		try {
			perceptualDistance = calculatePhashHammingDistance(asset.phash, comparisonPhash);
		} catch {
			throw createHttpError(422, 'The registered asset has an invalid perceptual fingerprint');
		}

		const classification = classifyResult(sha256Match, perceptualDistance);
		const registeredEvidence = safeMetadataEvidence(registeredMetadata || asset, asset.mimeType, asset.fileSize);
		const comparisonEvidence = safeMetadataEvidence(comparisonMetadata, file.mimetype, file.size);
		const report = {
			registeredAsset: {
				width: asset.width ?? registeredMetadata?.width ?? null,
				height: asset.height ?? registeredMetadata?.height ?? null,
				mimeType: asset.mimeType,
				fileSize: asset.fileSize,
				registeredAt: asset.createdAt,
			},
			comparison: {
				fileName: safeFileName(file),
				mimeType: file.mimetype,
				fileSize: file.size,
				width: comparisonMetadata.width ?? null,
				height: comparisonMetadata.height ?? null,
			},
			fingerprints: {
				sha256Match,
				perceptualDistance,
				hashBits: asset.phash.length * 4,
				similarity: classification.similarity,
				strongThreshold: STRONG_MATCH_MAX,
				possibleThreshold: POSSIBLE_MATCH_MAX,
			},
			metadataDifferences: compareMetadata(registeredEvidence, comparisonEvidence),
			warnings,
		};

		const saved = await verificationRepository.createVerificationReport({
			userId,
			assetId: asset.id,
			verificationType: 'image_comparison',
			sha256Match,
			status: classification.result,
			report,
		});
		return publicReport(saved);
	} finally {
		if (file?.path) await fs.unlink(file.path).catch(() => {});
	}
}

async function getVerifications(userId) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	return (await verificationRepository.getVerificationReportsByOwnerId(userId))
		.map((row) => publicReport(row, false));
}

async function getVerification(userId, reference) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	const normalized = String(reference || '').trim().toUpperCase();
	const row = (await verificationRepository.getVerificationReportsByOwnerId(userId))
		.find((candidate) => verificationReference(candidate.id) === normalized);
	if (!row) throw createHttpError(404, 'Verification report not found');
	return publicReport(row);
}

module.exports = {
	verifyAsset,
	getVerifications,
	getVerification,
	classifyResult,
};
