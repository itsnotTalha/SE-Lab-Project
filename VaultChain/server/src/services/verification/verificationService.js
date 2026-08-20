const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const { STRONG_MATCH_MAX, POSSIBLE_MATCH_MAX } = require('../../config/perceptualMatching');
const assetRepository = require('../../repositories/assetRepository');
const verificationRepository = require('../../repositories/verificationRepository');
const assetService = require('../asset/assetService');
const vaultAccessService = require('../vault/vaultAccessService');
const { calculatePhashHammingDistance } = require('../hashing/phashComparisonService');
const { generatePhash } = require('../hashing/phashService');
const { generateSha256Hash } = require('../hashing/sha256Service');
const { extractImageMetadata } = require('../metadata/metadataService');

const MAX_MATCHES = 5;

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

function rankFingerprintCandidates(comparisonSha256, comparisonPhash, candidates) {
	const hashBits = comparisonPhash.length * 4;
	const ranked = [];
	for (const candidate of candidates) {
		const sha256Match = comparisonSha256 === candidate.sha256Hash;
		let distance;
		try {
			distance = sha256Match ? 0 : calculatePhashHammingDistance(comparisonPhash, candidate.phash);
		} catch {
			if (!sha256Match) continue;
			distance = 0;
		}
		const classification = classifyResult(sha256Match, distance);
		ranked.push({
			assetId: candidate.assetId,
			ownerId: candidate.ownerId,
			registeredAt: candidate.registeredAt,
			sha256Match,
			distance,
			hashBits,
			matchType: classification.result,
		});
	}
	ranked.sort((first, second) => Number(second.sha256Match) - Number(first.sha256Match)
		|| first.distance - second.distance
		|| first.assetId - second.assetId);
	return ranked;
}

async function publicGlobalMatch(match, userId, tokenFingerprint, detailed) {
	const isCurrentUser = match.ownerId === userId;
	const result = {
		rank: match.rank,
		matchType: match.matchType,
		assetReference: assetService.publicAssetReference(match.assetId),
		ownerReference: isCurrentUser ? 'You' : assetService.publicOwnerReference(match.ownerId),
		ownerIsCurrentUser: isCurrentUser,
		sha256Match: Boolean(match.sha256Match),
		distance: match.distance,
		hashBits: match.hashBits,
		registeredAt: match.registeredAt || null,
	};
	if (!detailed || !isCurrentUser) return result;
	const asset = await assetRepository.getAssetByIdAndOwnerId(match.assetId, userId);
	if (!asset) return result;
	const protection = await vaultAccessService.getAssetProtection(userId, asset.id, tokenFingerprint);
	if (protection.isLocked) return result;
	return {
		...result,
		asset: {
			id: asset.id,
			title: asset.title,
			mimeType: asset.mimeType,
			contentUrl: `/api/assets/${asset.id}/content`,
		},
	};
}

async function publicGlobalReport(row, userId, tokenFingerprint, detailed) {
	const storedMatches = Array.isArray(row.report.matches) ? row.report.matches : [];
	const matches = await Promise.all(storedMatches.map((match) => publicGlobalMatch(match, userId, tokenFingerprint, detailed)));
	const report = {
		reference: verificationReference(row.id),
		result: matches.length ? 'matches_found' : 'no_match',
		createdAt: row.createdAt,
		matches,
		thresholds: {
			strong: row.report.thresholds?.strong ?? STRONG_MATCH_MAX,
			possible: row.report.thresholds?.possible ?? POSSIBLE_MATCH_MAX,
			maxResults: row.report.thresholds?.maxResults ?? MAX_MATCHES,
			hashBits: row.report.thresholds?.hashBits ?? 256,
		},
		nearestDistance: row.report.nearestDistance ?? null,
		candidateCount: row.report.candidateCount ?? null,
	};
	if (detailed) report.comparison = row.report.comparison || null;
	return report;
}

async function publicLegacyReport(row, userId, tokenFingerprint, detailed) {
	let registeredAsset = {
		reference: row.assetId ? assetService.publicAssetReference(row.assetId) : null,
	};
	if (detailed && row.assetId && row.assetOwnerId === userId) {
		const protection = await vaultAccessService.getAssetProtection(userId, row.assetId, tokenFingerprint);
		if (!protection.isLocked) {
			registeredAsset = {
				...registeredAsset,
				id: row.assetId,
				title: row.assetTitle,
				fileName: row.assetFileName,
				contentUrl: `/api/assets/${row.assetId}/content`,
				...row.report.registeredAsset,
			};
		}
	}
	return {
		reference: verificationReference(row.id),
		result: row.status,
		createdAt: row.createdAt,
		registeredAsset,
		fingerprints: row.report.fingerprints || {},
		...(detailed ? {
			comparison: row.report.comparison,
			metadataDifferences: row.report.metadataDifferences || [],
			warnings: row.report.warnings || [],
		} : {}),
	};
}

async function publicReport(row, userId, tokenFingerprint, detailed = true) {
	if (row.verificationType === 'global_image_search') {
		return publicGlobalReport(row, userId, tokenFingerprint, detailed);
	}
	return publicLegacyReport(row, userId, tokenFingerprint, detailed);
}

async function verifyImage(userId, { file, tokenFingerprint }) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	if (!file) throw createHttpError(400, 'Comparison image is required');
	try {
		let comparisonMetadata = { width: null, height: null, metadataJson: {} };
		try { comparisonMetadata = await extractImageMetadata(file.path); } catch { /* Fingerprint search can continue. */ }
		const [comparisonSha256, comparisonPhash, candidates] = await Promise.all([
			generateSha256Hash({ filePath: file.path, metadata: comparisonMetadata }),
			generatePhash({ filePath: file.path, mimeType: file.mimetype }),
			assetRepository.getGlobalFingerprintCandidates(),
		]);
		const ranked = rankFingerprintCandidates(comparisonSha256, comparisonPhash, candidates);
		const meaningful = ranked
			.filter((match) => match.sha256Match || match.distance <= POSSIBLE_MATCH_MAX)
			.slice(0, MAX_MATCHES)
			.map((match, index) => ({ ...match, rank: index + 1 }));
		const nearestDistance = meaningful.length ? null : ranked[0]?.distance ?? null;
		const report = {
			comparison: {
				fileName: safeFileName(file),
				mimeType: file.mimetype,
				fileSize: file.size,
				width: comparisonMetadata.width ?? null,
				height: comparisonMetadata.height ?? null,
			},
			matches: meaningful,
			nearestDistance,
			candidateCount: candidates.length,
			thresholds: { strong: STRONG_MATCH_MAX, possible: POSSIBLE_MATCH_MAX, maxResults: MAX_MATCHES, hashBits: comparisonPhash.length * 4 },
		};
		const saved = await verificationRepository.createVerificationReport({
			userId,
			assetId: meaningful[0]?.assetId ?? null,
			verificationType: 'global_image_search',
			sha256Match: Boolean(meaningful[0]?.sha256Match),
			status: meaningful.length ? 'matches_found' : 'no_match',
			report,
		});
		return publicReport(saved, userId, tokenFingerprint, true);
	} finally {
		if (file?.path) await fs.unlink(file.path).catch(() => {});
	}
}

async function getVerifications(userId, tokenFingerprint) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	return Promise.all((await verificationRepository.getVerificationReportsByOwnerId(userId))
		.map((row) => publicReport(row, userId, tokenFingerprint, false)));
}

async function getVerification(userId, reference, tokenFingerprint) {
	if (!userId) throw createHttpError(401, 'Unauthorized');
	const normalized = String(reference || '').trim().toUpperCase();
	const row = (await verificationRepository.getVerificationReportsByOwnerId(userId))
		.find((candidate) => verificationReference(candidate.id) === normalized);
	if (!row) throw createHttpError(404, 'Verification report not found');
	return publicReport(row, userId, tokenFingerprint, true);
}

module.exports = {
	verifyImage,
	verifyAsset: verifyImage,
	getVerifications,
	getVerification,
	classifyResult,
	rankFingerprintCandidates,
};
