const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-asset-api-'));
const testUploadDirectory = path.join(testDirectory, 'uploads');
const testCheckDirectory = path.join(testDirectory, 'checks');
process.env.DATABASE_PATH = path.join(testDirectory, 'test.sqlite');
process.env.UPLOAD_DIRECTORY = testUploadDirectory;
process.env.CHECK_UPLOAD_DIRECTORY = testCheckDirectory;
process.env.JWT_SECRET = 'vaultchain-asset-api-test-secret';

const { database } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/initDatabase');
const { authenticateToken } = require('../src/middleware/auth');
const assetRepository = require('../src/repositories/assetRepository');
const verificationRepository = require('../src/repositories/verificationRepository');
const dashboardRepository = require('../src/repositories/dashboardRepository');
const vaultRepository = require('../src/repositories/vaultRepository');
const marketplaceRepository = require('../src/repositories/marketplaceRepository');
const walletRepository = require('../src/repositories/walletRepository');
const assetService = require('../src/services/asset/assetService');
const authService = require('../src/services/auth/authService');
const verificationService = require('../src/services/verification/verificationService');
const vaultService = require('../src/services/vault/vaultService');
const vaultAccessService = require('../src/services/vault/vaultAccessService');
const marketplaceService = require('../src/services/marketplace/marketplaceService');
const walletService = require('../src/services/wallet/walletService');

let userA;
let userB;
let userC;
let assetId;
let fixtureBuffer;
let fixtureName;
let variants;
let unrelatedBuffer;
let exactVerificationReference;
let newerAssetId;
let photographyVaultReference;
let clientVaultReference;
let userBAssetId;
let userAFingerprint;
let userBFingerprint;

function tokenFingerprint(token) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

function createFile(filename, buffer = fixtureBuffer, mimetype = 'image/png') {
	fs.mkdirSync(testUploadDirectory, { recursive: true });
	const filePath = path.join(testUploadDirectory, filename);
	fs.writeFileSync(filePath, buffer);
	return {
		filename,
		path: filePath,
		size: buffer.length,
		mimetype,
	};
}

function createCheckFile(filename, buffer = fixtureBuffer, mimetype = 'image/png') {
	fs.mkdirSync(testCheckDirectory, { recursive: true });
	const filePath = path.join(testCheckDirectory, filename);
	fs.writeFileSync(filePath, buffer);
	return {
		filename,
		path: filePath,
		size: buffer.length,
		mimetype,
	};
}

function assertCheckDirectoryIsEmpty() {
	assert.deepEqual(fs.readdirSync(testCheckDirectory), []);
}

function crc32(buffer) {
	let crc = 0xffffffff;
	for (const byte of buffer) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function addPngTextChunk(buffer) {
	const type = Buffer.from('tEXt');
	const data = Buffer.from('VaultChain\0visual-variant');
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE(crc32(Buffer.concat([type, data])));
	const chunk = Buffer.concat([length, type, data, checksum]);
	return Buffer.concat([buffer.subarray(0, -12), chunk, buffer.subarray(-12)]);
}

function resizePng(source, width, height) {
	const resized = new PNG({ width, height });
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const sourceX = Math.min(source.width - 1, Math.floor(x * source.width / width));
			const sourceY = Math.min(source.height - 1, Math.floor(y * source.height / height));
			const sourceIndex = (sourceY * source.width + sourceX) * 4;
			const targetIndex = (y * width + x) * 4;
			for (let channel = 0; channel < 4; channel += 1) resized.data[targetIndex + channel] = source.data[sourceIndex + channel];
		}
	}
	return PNG.sync.write(resized);
}

function createImageVariants(buffer) {
	const decoded = PNG.sync.read(buffer);
	const brighter = new PNG({ width: decoded.width, height: decoded.height });
	decoded.data.copy(brighter.data);
	for (let index = 0; index < brighter.data.length; index += 4) {
		for (let channel = 0; channel < 3; channel += 1) {
			brighter.data[index + channel] = Math.min(255, Math.round(brighter.data[index + channel] * 1.05 + 5));
		}
	}

	return {
		jpeg: jpeg.encode({ data: decoded.data, width: decoded.width, height: decoded.height }, 75).data,
		resized: resizePng(decoded, Math.round(decoded.width * 0.72), Math.round(decoded.height * 0.72)),
		brighter: PNG.sync.write(brighter),
	};
}

before(async () => {
	await initializeDatabase();
	const fixtureNames = fs.readdirSync(path.resolve(__dirname, '../src/uploads'))
		.filter((name) => name.toLowerCase().endsWith('.png'));
	fixtureName = fixtureNames.includes('1785437099015-901021797.png')
		? '1785437099015-901021797.png'
		: fixtureNames[0];
	assert.ok(fixtureName, 'A PNG fixture must exist in server/src/uploads');
	fixtureBuffer = fs.readFileSync(path.resolve(__dirname, '../src/uploads', fixtureName));
	variants = createImageVariants(fixtureBuffer);
	const unrelatedName = fixtureNames.find((name) => name !== fixtureName && fs.statSync(path.resolve(__dirname, '../src/uploads', name)).size !== fixtureBuffer.length);
	assert.ok(unrelatedName, 'A distinct PNG fixture must exist for unrelated-image tests');
	unrelatedBuffer = fs.readFileSync(path.resolve(__dirname, '../src/uploads', unrelatedName));
	userA = await authService.register({ fullName: 'Asset Owner A', email: 'asset-owner-a@example.test', password: 'StrongPass123!' });
	userB = await authService.register({ fullName: 'Asset Owner B', email: 'asset-owner-b@example.test', password: 'StrongPass123!' });
	userC = await authService.register({ fullName: 'Asset Buyer C', email: 'asset-buyer-c@example.test', password: 'StrongPass123!' });
	userAFingerprint = tokenFingerprint(userA.token);
	userBFingerprint = tokenFingerprint(userB.token);
});

after(async () => {
	await new Promise((resolve) => database.close(resolve));
	fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('authentication middleware rejects missing credentials and accepts a valid JWT', () => {
	let missingTokenError;
	authenticateToken({ headers: {} }, {}, (error) => { missingTokenError = error; });
	assert.equal(missingTokenError.status, 401);
	assert.equal(missingTokenError.message, 'Unauthorized');

	const request = { headers: { authorization: `Bearer ${userA.token}` } };
	let validTokenError;
	authenticateToken(request, {}, (error) => { validTokenError = error; });
	assert.equal(validTokenError, undefined);
	assert.equal(request.user.id, userA.user.id);
	assert.equal(request.authTokenFingerprint, userAFingerprint);
});

test('upload still creates hashes and metadata without exposing a filesystem path', async () => {
	const result = await assetService.uploadAsset(userA.user.id, {
		title: 'Owner A asset',
		category: 'image',
		description: 'Asset API integration fixture',
		file: createFile('owner-a-fixture.png'),
	});
	assert.ok(result.asset.id);
	assert.equal(result.asset.filePath, undefined);
	assert.ok(result.hash.sha256);
	assert.ok(result.hash.phash);
	assert.equal(result.asset.hasMetadata, true);
	assetId = result.asset.id;
});

test('asset list is owner-scoped, omits private paths, and returns newest first', async () => {
	const newerAsset = await assetRepository.createAsset({
		ownerId: userA.user.id,
		title: 'Newer asset',
		description: null,
		category: 'image',
		fileName: 'newer.png',
		filePath: path.join(testUploadDirectory, 'newer.png'),
		fileSize: 100,
		mimeType: 'image/png',
	});
	newerAssetId = newerAsset.id;

	const ownerAssets = await assetService.getAssets(userA.user.id);
	assert.equal(ownerAssets.length, 2);
	assert.equal(ownerAssets[0].id, newerAsset.id);
	assert.equal(ownerAssets[1].id, assetId);
	assert.equal(ownerAssets[0].filePath, undefined);
	assert.equal(ownerAssets[0].ownerId, undefined);

	const otherAssets = await assetService.getAssets(userB.user.id);
	assert.deepEqual(otherAssets, []);
});

test('asset detail, hash, metadata, and content lookup enforce ownership', async () => {
	const detail = await assetService.getAsset(userA.user.id, assetId);
	assert.equal(detail.id, assetId);
	assert.ok((await assetService.getAssetHash(userA.user.id, assetId, userAFingerprint)).sha256Hash);
	assert.ok((await assetService.getAssetMetadata(userA.user.id, assetId)).width);
	assert.equal((await assetService.getOwnedAssetOrThrow(userA.user.id, assetId)).id, assetId);

	for (const operation of [
		() => assetService.getAsset(userB.user.id, assetId),
		() => assetService.getAssetHash(userB.user.id, assetId),
		() => assetService.getAssetMetadata(userB.user.id, assetId),
		() => assetService.getOwnedAssetOrThrow(userB.user.id, assetId),
	]) {
		await assert.rejects(operation, (error) => error.status === 404 && error.message === 'Asset not found');
	}
});

test('ownership check finds the current user exact match and removes its temporary file', async () => {
	const result = await assetService.checkAssetOwnership(userA.user.id, createCheckFile('owner-a-exact.png'));
	assert.equal(result.match, true);
	assert.equal(result.matchType, 'exact');
	assert.equal(result.asset.id, assetId);
	assert.equal(result.asset.title, 'Owner A asset');
	assert.deepEqual(result.asset.owner, { isCurrentUser: true, label: 'You' });
	assert.match(result.checked.sha256, /^[a-f0-9]{64}$/);
	assert.equal(result.checked.phash, null);
	assertCheckDirectoryIsEmpty();
});

test('cross-owner ownership match is pseudonymous and does not leak private asset data', async () => {
	const result = await assetService.checkAssetOwnership(userB.user.id, createCheckFile('owner-b-check.png'));
	assert.equal(result.match, true);
	assert.equal(result.matchType, 'exact');
	assert.equal(result.asset.id, null);
	assert.equal(result.asset.title, null);
	assert.equal(result.asset.owner.isCurrentUser, false);
	assert.match(result.asset.owner.label, /^VC-[A-F0-9]{8}$/);
	assert.match(result.asset.reference, /^VC-A\d{6}$/);
	const serialized = JSON.stringify(result.asset);
	assert.doesNotMatch(serialized, /asset-owner-a@example\.test|Asset Owner A|owner-a-fixture|uploads/i);
	assert.equal(result.asset.fileName, undefined);
	assert.equal(result.asset.filePath, undefined);
	assert.equal(result.asset.sha256, undefined);
	assert.equal(result.asset.phash, undefined);
	assertCheckDirectoryIsEmpty();
});

test('ownership check reports an identical perceptual fingerprint when SHA-256 differs', async () => {
	const visualVariant = addPngTextChunk(fixtureBuffer);
	const result = await assetService.checkAssetOwnership(userB.user.id, createCheckFile('visual-variant.png', visualVariant));
	assert.equal(result.match, true);
	assert.equal(result.matchType, 'perceptual');
	assert.equal(result.similarity, 'identical');
	assert.equal(result.distance, 0);
	assert.equal(result.threshold, 6);
	assert.equal(result.hashBits, 256);
	assert.notEqual(result.checked.sha256, (await assetService.getAssetHash(userA.user.id, assetId)).sha256Hash);
	assert.equal(result.asset.owner.isCurrentUser, false);
	assertCheckDirectoryIsEmpty();
});

test('JPEG recompression produces a strong perceptual match with a different SHA-256', async () => {
	const result = await assetService.checkAssetOwnership(userB.user.id, createCheckFile('recompressed.jpg', variants.jpeg, 'image/jpeg'));
	assert.equal(result.matchType, 'perceptual');
	assert.equal(result.similarity, 'strong');
	assert.equal(result.distance, 2);
	assert.equal(result.hashBits, 256);
	assertCheckDirectoryIsEmpty();
});

test('resizing produces a strong cross-owner perceptual match without private identity data', async () => {
	const result = await assetService.checkAssetOwnership(userB.user.id, createCheckFile('resized.png', variants.resized));
	assert.equal(result.matchType, 'perceptual');
	assert.equal(result.similarity, 'strong');
	assert.equal(result.distance, 2);
	assert.equal(result.asset.id, null);
	assert.equal(result.asset.title, null);
	assert.match(result.asset.owner.label, /^VC-[A-F0-9]{8}$/);
	assert.doesNotMatch(JSON.stringify(result.asset), /asset-owner-a@example\.test|Asset Owner A|uploads/i);
	assertCheckDirectoryIsEmpty();
});

test('small brightness modification is evaluated as a perceptual rather than SHA match', async () => {
	const result = await assetService.checkAssetOwnership(userB.user.id, createCheckFile('brighter.png', variants.brighter));
	assert.equal(result.matchType, 'perceptual');
	assert.equal(result.similarity, 'identical');
	assert.equal(result.distance, 0);
	assert.notEqual(result.checked.sha256, (await assetService.getAssetHash(userA.user.id, assetId)).sha256Hash);
	assertCheckDirectoryIsEmpty();
});

test('ownership check returns generated fingerprints without registering a no-match image', async () => {
	const uploadFixtures = fs.readdirSync(path.resolve(__dirname, '../src/uploads'))
		.filter((name) => name.toLowerCase().endsWith('.png') && name !== fixtureName);
	let result;
	for (const [index, name] of uploadFixtures.entries()) {
		const candidate = fs.readFileSync(path.resolve(__dirname, '../src/uploads', name));
		result = await assetService.checkAssetOwnership(userB.user.id, createCheckFile(`no-match-${index}.png`, candidate));
		if (!result.match) break;
	}
	assert.ok(result, 'At least one additional PNG fixture must be available');
	assert.equal(result.match, false);
	assert.equal(result.asset, null);
	assert.match(result.checked.sha256, /^[a-f0-9]{64}$/);
	assert.ok(result.checked.phash);
	assert.deepEqual(await assetService.getAssets(userB.user.id), []);
	assertCheckDirectoryIsEmpty();
});

test('verification saves an exact report against the selected owned asset', async () => {
	const verification = await verificationService.verifyAsset(userA.user.id, {
		assetId,
		file: createCheckFile('verification-exact.png'),
	});
	assert.match(verification.reference, /^VR-[A-F0-9]{6}$/);
	assert.equal(verification.result, 'exact');
	assert.equal(verification.fingerprints.sha256Match, true);
	assert.equal(verification.fingerprints.hashBits, 256);
	assert.equal(verification.registeredAsset.id, assetId);
	assert.equal(verification.comparison.fileName, 'verification-exact.png');
	assert.equal(JSON.stringify(verification).includes(testUploadDirectory), false);
	exactVerificationReference = verification.reference;
	assertCheckDirectoryIsEmpty();
});

test('verification classification follows cryptographic and configured perceptual boundaries', () => {
	assert.equal(verificationService.classifyResult(true, 200).result, 'exact');
	assert.equal(verificationService.classifyResult(false, 6).result, 'strong_visual');
	assert.equal(verificationService.classifyResult(false, 7).result, 'possible_visual');
	assert.equal(verificationService.classifyResult(false, 12).result, 'possible_visual');
	assert.equal(verificationService.classifyResult(false, 13).result, 'no_match');
});

test('verification classifies deterministic JPEG, resize, and brightness variants as strong visual evidence', async () => {
	for (const [name, buffer, mimetype] of [
		['verification-recompressed.jpg', variants.jpeg, 'image/jpeg'],
		['verification-resized.png', variants.resized, 'image/png'],
		['verification-brighter.png', variants.brighter, 'image/png'],
	]) {
		const verification = await verificationService.verifyAsset(userA.user.id, {
			assetId,
			file: createCheckFile(name, buffer, mimetype),
		});
		assert.equal(verification.result, 'strong_visual');
		assert.equal(verification.fingerprints.sha256Match, false);
		assert.ok(verification.fingerprints.perceptualDistance <= verification.fingerprints.strongThreshold);
		assert.equal(verification.fingerprints.hashBits, 256);
		assertCheckDirectoryIsEmpty();
	}
});

test('verification classifies an unrelated image as no meaningful match', async () => {
	const verification = await verificationService.verifyAsset(userA.user.id, {
		assetId,
		file: createCheckFile('verification-unrelated.png', unrelatedBuffer),
	});
	assert.equal(verification.result, 'no_match');
	assert.equal(verification.fingerprints.sha256Match, false);
	assert.ok(verification.fingerprints.perceptualDistance > verification.fingerprints.possibleThreshold);
	assertCheckDirectoryIsEmpty();
});

test('verification rejects another user asset and creates no report', async () => {
	const before = await verificationService.getVerifications(userB.user.id);
	await assert.rejects(
		() => verificationService.verifyAsset(userB.user.id, {
			assetId,
			file: createCheckFile('unauthorized-verification.png'),
		}),
		(error) => error.status === 404 && error.message === 'Asset not found'
	);
	assert.deepEqual(await verificationService.getVerifications(userB.user.id), before);
	assertCheckDirectoryIsEmpty();
});

test('verification history and report details are isolated by asset owner', async () => {
	const ownerHistory = await verificationService.getVerifications(userA.user.id);
	assert.ok(ownerHistory.length >= 5);
	assert.equal(ownerHistory.every((report) => report.registeredAsset.id === assetId), true);
	assert.deepEqual(await verificationService.getVerifications(userB.user.id), []);
	const detail = await verificationService.getVerification(userA.user.id, exactVerificationReference);
	assert.equal(detail.result, 'exact');
	await assert.rejects(
		() => verificationService.getVerification(userB.user.id, exactVerificationReference),
		(error) => error.status === 404 && error.message === 'Verification report not found'
	);
});

test('verification removes its temporary file when report persistence fails', async () => {
	const originalCreate = verificationRepository.createVerificationReport;
	verificationRepository.createVerificationReport = async () => { throw new Error('Forced persistence failure'); };
	try {
		await assert.rejects(
			() => verificationService.verifyAsset(userA.user.id, {
				assetId,
				file: createCheckFile('failed-verification.png', variants.resized),
			}),
			/Forced persistence failure/
		);
	} finally {
		verificationRepository.createVerificationReport = originalCreate;
	}
	assertCheckDirectoryIsEmpty();
});

test('creates, lists, and retrieves owner-scoped Vaults with safe references', async () => {
	const photography = await vaultService.createVault(userA.user.id, { name: '  Photography  ', description: 'Original photo assets', password: 'PhotoVault123!' });
	const clientWork = await vaultService.createVault(userA.user.id, { name: 'Client Work', description: '', password: 'ClientVault123!' });
	photographyVaultReference = photography.reference;
	clientVaultReference = clientWork.reference;
	assert.match(photography.reference, /^VT-[A-F0-9]{6}$/);
	assert.equal(photography.name, 'Photography');
	assert.equal(photography.description, 'Original photo assets');
	assert.equal(photography.isLocked, true);
	assert.equal(photography.autoLockMinutes, 10);
	assert.equal(JSON.stringify(photography).includes('passwordHash'), false);
	assert.doesNotMatch(JSON.stringify(photography), /PhotoVault123!/);
	const storedVault = await vaultRepository.getVaultByReferenceAndUserId(photography.reference, userA.user.id);
	assert.match(storedVault.passwordHash, /^\$2[aby]\$/);
	assert.notEqual(storedVault.passwordHash, 'PhotoVault123!');
	assert.equal((await vaultService.getVaults(userA.user.id, userAFingerprint)).length, 2);
	assert.deepEqual(await vaultService.getVaults(userB.user.id, userBFingerprint), []);
	assert.equal((await vaultService.getVault(userA.user.id, photography.reference, userAFingerprint)).name, 'Photography');
	await assert.rejects(() => vaultService.getVault(userB.user.id, photography.reference, userBFingerprint), (error) => error.status === 404);
	await assert.rejects(() => vaultService.unlockVault(userA.user.id, photography.reference, 'wrong-password', userAFingerprint), (error) => error.status === 401);
	await assert.rejects(() => vaultService.unlockVault(userB.user.id, photography.reference, 'PhotoVault123!', userBFingerprint), (error) => error.status === 404);
	const unlocked = await vaultService.unlockVault(userA.user.id, photography.reference, 'PhotoVault123!', userAFingerprint);
	assert.equal(unlocked.isLocked, false);
	assert.ok(unlocked.unlockExpiresAt);
	await vaultService.unlockVault(userA.user.id, clientWork.reference, 'ClientVault123!', userAFingerprint);
});

test('repeated wrong Vault passwords are rate limited before a later successful unlock', async () => {
	process.env.VAULT_UNLOCK_MAX_ATTEMPTS = '3';
	process.env.VAULT_UNLOCK_BLOCK_SECONDS = '1';
	process.env.VAULT_UNLOCK_WINDOW_SECONDS = '60';
	await vaultService.lockVault(userA.user.id, photographyVaultReference, userAFingerprint);
	for (let attempt = 0; attempt < 2; attempt += 1) {
		await assert.rejects(
			() => vaultService.unlockVault(userA.user.id, photographyVaultReference, 'wrong-password', userAFingerprint),
			(error) => error.status === 401
		);
	}
	await assert.rejects(
		() => vaultService.unlockVault(userA.user.id, photographyVaultReference, 'wrong-password', userAFingerprint),
		(error) => error.status === 429
	);
	await assert.rejects(
		() => vaultService.unlockVault(userA.user.id, photographyVaultReference, 'PhotoVault123!', userAFingerprint),
		(error) => error.status === 429
	);
	await new Promise((resolve) => setTimeout(resolve, 1100));
	assert.equal((await vaultService.unlockVault(userA.user.id, photographyVaultReference, 'PhotoVault123!', userAFingerprint)).isLocked, false);
	delete process.env.VAULT_UNLOCK_MAX_ATTEMPTS;
	delete process.env.VAULT_UNLOCK_BLOCK_SECONDS;
	delete process.env.VAULT_UNLOCK_WINDOW_SECONDS;
});

test('updates an owned Vault and rejects cross-owner update attempts', async () => {
	const updated = await vaultService.updateVault(userA.user.id, photographyVaultReference, { name: 'Photography Archive' }, userAFingerprint);
	assert.equal(updated.name, 'Photography Archive');
	assert.equal(updated.description, 'Original photo assets');
	await assert.rejects(
		() => vaultService.updateVault(userB.user.id, photographyVaultReference, { name: 'Tampered' }, userBFingerprint),
		(error) => error.status === 404
	);
});

test('adds multiple owned assets without copying asset records and updates real dashboard counts', async () => {
	const beforeAssets = await assetService.getAssets(userA.user.id);
	const vault = await vaultService.addAssets(userA.user.id, photographyVaultReference, { assetIds: [assetId, newerAssetId] }, userAFingerprint);
	assert.equal(vault.assetCount, 2);
	assert.deepEqual(new Set(vault.assets.map((asset) => asset.id)), new Set([assetId, newerAssetId]));
	assert.equal((await assetService.getAssets(userA.user.id)).length, beforeAssets.length);
	const summary = await dashboardRepository.getSummary(userA.user.id);
	assert.equal(summary.totalVaults, 2);
	assert.equal(summary.totalOrganizedAssets, 2);
});

test('server-side Vault grants protect assets, require every Vault, expire, lock manually, and clear on logout', async () => {
	await vaultService.addAssets(userA.user.id, clientVaultReference, { assetIds: [assetId] }, userAFingerprint);

	await vaultService.lockVault(userA.user.id, photographyVaultReference, userAFingerprint);
	const lockedAsset = await assetService.getAsset(userA.user.id, assetId, userAFingerprint);
	assert.equal(lockedAsset.vaultProtection.isLocked, true);
	assert.equal(lockedAsset.contentUrl, null);
	assert.equal(lockedAsset.width, null);
	assert.equal((await vaultService.getVault(userA.user.id, photographyVaultReference, userAFingerprint)).assets.length, 0);
	for (const operation of [
		() => assetService.assertAssetUnlocked(userA.user.id, assetId, userAFingerprint),
		() => assetService.getAssetHash(userA.user.id, assetId, userAFingerprint),
		() => assetService.getAssetMetadata(userA.user.id, assetId, userAFingerprint),
	]) await assert.rejects(operation, (error) => error.status === 423);
	await assert.rejects(
		() => verificationService.verifyAsset(userA.user.id, { assetId, tokenFingerprint: userAFingerprint, file: createCheckFile('locked-verification.png') }),
		(error) => error.status === 423
	);
	assertCheckDirectoryIsEmpty();
	const ownershipResult = await assetService.checkAssetOwnership(userA.user.id, createCheckFile('locked-ownership.png'));
	assert.equal(ownershipResult.matchType, 'exact');
	assert.equal(ownershipResult.asset.filePath, undefined);
	assert.equal(ownershipResult.asset.metadata, undefined);

	await vaultService.unlockVault(userA.user.id, photographyVaultReference, 'PhotoVault123!', userAFingerprint);
	assert.equal((await vaultAccessService.assertAssetUnlocked(userA.user.id, assetId, userAFingerprint)).isLocked, false);
	await vaultService.lockVault(userA.user.id, clientVaultReference, userAFingerprint);
	await assert.rejects(() => assetService.assertAssetUnlocked(userA.user.id, assetId, userAFingerprint), (error) => error.status === 423);
	await vaultService.unlockVault(userA.user.id, clientVaultReference, 'ClientVault123!', userAFingerprint);

	process.env.VAULT_UNLOCK_TTL_SECONDS = '1';
	await vaultService.lockVault(userA.user.id, photographyVaultReference, userAFingerprint);
	await vaultService.unlockVault(userA.user.id, photographyVaultReference, 'PhotoVault123!', userAFingerprint);
	await new Promise((resolve) => setTimeout(resolve, 1100));
	assert.equal((await vaultService.getVault(userA.user.id, photographyVaultReference, userAFingerprint)).isLocked, true);
	delete process.env.VAULT_UNLOCK_TTL_SECONDS;
	await vaultService.unlockVault(userA.user.id, photographyVaultReference, 'PhotoVault123!', userAFingerprint);

	await vaultAccessService.revokeTokenAccess(userA.user.id, userAFingerprint);
	await assert.rejects(() => assetService.assertAssetUnlocked(userA.user.id, assetId, userAFingerprint), (error) => error.status === 423);
	const freshLogin = await authService.login({ email: 'asset-owner-a@example.test', password: 'StrongPass123!' });
	assert.notEqual(tokenFingerprint(freshLogin.token), userAFingerprint);
	assert.equal((await vaultService.getVault(userA.user.id, photographyVaultReference, tokenFingerprint(freshLogin.token))).isLocked, true);
	await vaultService.unlockVault(userA.user.id, photographyVaultReference, 'PhotoVault123!', userAFingerprint);
	await vaultService.unlockVault(userA.user.id, clientVaultReference, 'ClientVault123!', userAFingerprint);
});

test('password change and account-authenticated reset revoke every session without leaking credentials', async () => {
	const secondLogin = await authService.login({ email: 'asset-owner-a@example.test', password: 'StrongPass123!' });
	const secondFingerprint = tokenFingerprint(secondLogin.token);
	await vaultService.unlockVault(userA.user.id, photographyVaultReference, 'PhotoVault123!', secondFingerprint);
	const changed = await vaultService.changePassword(userA.user.id, photographyVaultReference, {
		currentPassword: 'PhotoVault123!',
		newPassword: 'ChangedPhoto123!',
		confirmPassword: 'ChangedPhoto123!',
		autoLockMinutes: 30,
	}, userAFingerprint);
	assert.equal(changed.isLocked, true);
	assert.equal(changed.autoLockMinutes, 30);
	assert.doesNotMatch(JSON.stringify(changed), /PhotoVault123|ChangedPhoto123|passwordHash|password_hash/);
	assert.equal((await vaultService.getVault(userA.user.id, photographyVaultReference, secondFingerprint)).isLocked, true);
	await assert.rejects(() => vaultService.unlockVault(userA.user.id, photographyVaultReference, 'PhotoVault123!', userAFingerprint), (error) => error.status === 401);
	assert.equal((await vaultService.unlockVault(userA.user.id, photographyVaultReference, 'ChangedPhoto123!', userAFingerprint)).isLocked, false);
	await assert.rejects(
		() => vaultService.changePassword(userB.user.id, photographyVaultReference, { currentPassword: 'ChangedPhoto123!', newPassword: 'NoAccess123!', confirmPassword: 'NoAccess123!' }, userBFingerprint),
		(error) => error.status === 404
	);

	await assert.rejects(
		() => vaultService.resetPassword(userA.user.id, photographyVaultReference, { accountPassword: 'wrong-account-password', newPassword: 'ResetPhoto123!', confirmPassword: 'ResetPhoto123!' }, userAFingerprint),
		(error) => error.status === 401
	);
	const reset = await vaultService.resetPassword(userA.user.id, photographyVaultReference, {
		accountPassword: 'StrongPass123!',
		newPassword: 'ResetPhoto123!',
		confirmPassword: 'ResetPhoto123!',
		autoLockMinutes: 5,
	}, userAFingerprint);
	assert.equal(reset.isLocked, true);
	assert.equal(reset.autoLockMinutes, 5);
	assert.doesNotMatch(JSON.stringify(reset), /StrongPass123|ResetPhoto123|passwordHash|password_hash/);
	await assert.rejects(() => vaultService.unlockVault(userA.user.id, photographyVaultReference, 'ChangedPhoto123!', userAFingerprint), (error) => error.status === 401);
	assert.equal((await vaultService.unlockVault(userA.user.id, photographyVaultReference, 'ResetPhoto123!', userAFingerprint)).isLocked, false);
	await assert.rejects(
		() => vaultService.resetPassword(userB.user.id, photographyVaultReference, { accountPassword: 'StrongPass123!', newPassword: 'NoAccess123!', confirmPassword: 'NoAccess123!' }, userBFingerprint),
		(error) => error.status === 404
	);
});

test('rejects duplicate Vault membership and foreign asset injection', async () => {
	await assert.rejects(
		() => vaultService.addAssets(userA.user.id, photographyVaultReference, { assetIds: [assetId] }, userAFingerprint),
		(error) => error.status === 409
	);
	const foreignAsset = await assetRepository.createAsset({
		ownerId: userB.user.id,
		title: 'Foreign asset',
		description: null,
		category: 'image',
		fileName: 'foreign.png',
		filePath: path.join(testUploadDirectory, 'foreign.png'),
		fileSize: 10,
		mimeType: 'image/png',
	});
	userBAssetId = foreignAsset.id;
	await assert.rejects(
		() => vaultService.addAssets(userA.user.id, photographyVaultReference, { assetIds: [foreignAsset.id] }, userAFingerprint),
		(error) => error.status === 404
	);
	assert.equal((await vaultService.getVault(userA.user.id, photographyVaultReference, userAFingerprint)).assetCount, 2);
});

test('removes only Vault membership while preserving asset, hashes, and verification reports', async () => {
	const reportsBefore = await verificationService.getVerifications(userA.user.id);
	const updated = await vaultService.removeAsset(userA.user.id, photographyVaultReference, assetId, userAFingerprint);
	assert.equal(updated.assets.some((asset) => asset.id === assetId), false);
	assert.equal((await assetService.getAsset(userA.user.id, assetId)).id, assetId);
	assert.ok((await assetService.getAssetHash(userA.user.id, assetId, userAFingerprint)).sha256Hash);
	assert.equal((await verificationService.getVerifications(userA.user.id)).length, reportsBefore.length);
	await vaultService.addAssets(userA.user.id, photographyVaultReference, { assetIds: [assetId] }, userAFingerprint);
});

test('deletes a Vault and memberships without deleting contained assets or verification evidence', async () => {
	await assert.rejects(() => vaultService.deleteVault(userB.user.id, photographyVaultReference, userBFingerprint), (error) => error.status === 404);
	const reportsBefore = await verificationService.getVerifications(userA.user.id);
	await vaultService.deleteVault(userA.user.id, photographyVaultReference, userAFingerprint);
	await assert.rejects(() => vaultService.getVault(userA.user.id, photographyVaultReference, userAFingerprint), (error) => error.status === 404);
	assert.equal((await assetService.getAsset(userA.user.id, assetId)).id, assetId);
	assert.ok((await assetService.getAssetHash(userA.user.id, assetId, userAFingerprint)).phash);
	assert.equal((await verificationService.getVerifications(userA.user.id)).length, reportsBefore.length);
});

test('asset row deletion cascades Vault membership without leaving a broken relation', async () => {
	const assetCountBefore = (await vaultService.getVault(userA.user.id, clientVaultReference, userAFingerprint)).assetCount;
	const temporaryAsset = await assetRepository.createAsset({
		ownerId: userA.user.id,
		title: 'Temporary membership asset',
		description: null,
		category: 'image',
		fileName: 'temporary.png',
		filePath: path.join(testUploadDirectory, 'temporary.png'),
		fileSize: 10,
		mimeType: 'image/png',
	});
	await vaultService.addAssets(userA.user.id, clientVaultReference, { assetIds: [temporaryAsset.id] }, userAFingerprint);
	await new Promise((resolve, reject) => database.run('DELETE FROM assets WHERE id = ?', [temporaryAsset.id], (error) => error ? reject(error) : resolve()));
	assert.equal((await vaultService.getVault(userA.user.id, clientVaultReference, userAFingerprint)).assetCount, assetCountBefore);
	assert.deepEqual(await vaultRepository.getExistingMembershipIds((await vaultRepository.getVaultByReferenceAndUserId(clientVaultReference, userA.user.id)).id, [temporaryAsset.id]), []);
});

test('duplicate detection remains active across accounts', async () => {
	await assert.rejects(
		() => assetService.uploadAsset(userB.user.id, {
			title: 'Duplicate attempt',
			category: 'image',
			description: null,
			file: createFile('owner-b-duplicate.png'),
		}),
		(error) => error.status === 409
			&& /already uploaded/i.test(error.message)
			&& !error.message.includes(String(assetId))
	);
});

test('assets remain available after a fresh login', async () => {
	const login = await authService.login({ email: 'asset-owner-a@example.test', password: 'StrongPass123!' });
	assert.ok(login.token);
	const assets = await assetService.getAssets(login.user.id);
	assert.equal(assets.some((asset) => asset.id === assetId), true);
});

test('marketplace creation requires ownership, unlocked Vault access, and one active listing per asset', async () => {
	await assert.rejects(
		() => marketplaceService.createListing(userA.user.id, userAFingerprint, { assetId: userBAssetId, title: 'Not mine', description: '', price: 25 }),
		(error) => error.status === 404
	);
	await vaultService.lockVault(userA.user.id, clientVaultReference, userAFingerprint);
	await assert.rejects(
		() => marketplaceService.createListing(userA.user.id, userAFingerprint, { assetId, title: 'Protected original', description: 'A registered original', price: 125 }),
		(error) => error.status === 423
	);
	await vaultService.unlockVault(userA.user.id, clientVaultReference, 'ClientVault123!', userAFingerprint);
	const listing = await marketplaceService.createListing(userA.user.id, userAFingerprint, {
		assetId, title: 'Protected original', description: 'A registered original', price: 125,
	});
	assert.match(listing.reference, /^ML-[A-F0-9]{6}$/);
	assert.equal(listing.seller.isCurrentUser, true);
	assert.match(listing.seller.reference, /^VC-[A-F0-9]{8}$/);
	assert.equal(listing.currency, 'VaultChain Credits');
	assert.doesNotMatch(JSON.stringify(listing), /asset-owner-a@example\.test|Asset Owner A|filePath|passwordHash|password_hash/i);
	await assert.rejects(
		() => marketplaceService.createListing(userA.user.id, userAFingerprint, { assetId, title: 'Duplicate', description: '', price: 10 }),
		(error) => error.status === 409 && error.code === 'DUPLICATE_LISTING'
	);
	const buyerView = await marketplaceService.getListing(listing.reference, userB.user.id, userBFingerprint);
	assert.equal(buyerView.seller.isCurrentUser, false);
	assert.equal(buyerView.asset.id, null);
	assert.equal(buyerView.asset.isLocked, true);
	assert.equal(buyerView.asset.contentUrl, null);
	assert.equal(buyerView.asset.mimeType, null);
	assert.equal(buyerView.asset.fileSize, null);
	assert.equal(buyerView.asset.width, null);
	await assert.rejects(
		() => marketplaceService.deleteListing(userB.user.id, listing.reference, userBFingerprint),
		(error) => error.status === 404
	);
	await assert.rejects(
		() => marketplaceService.getListingContent(listing.reference, userB.user.id, userBFingerprint),
		(error) => error.status === 423
	);
});

test('purchase validation prevents self-purchase and insufficient-credit partial changes', async () => {
	const listing = (await marketplaceRepository.getActiveListingForAsset(assetId));
	await assert.rejects(
		() => marketplaceService.purchaseListing(userA.user.id, listing.reference),
		(error) => error.status === 409 && error.code === 'OWN_LISTING'
	);
	const ownerBefore = (await assetRepository.getAssetById(assetId)).ownerId;
	const sellerBalanceBefore = (await walletRepository.getWalletByUserId(userA.user.id)).balance;
	await assert.rejects(
		() => marketplaceService.purchaseListing(userB.user.id, listing.reference),
		(error) => error.status === 400 && error.code === 'INSUFFICIENT_BALANCE'
	);
	assert.equal((await assetRepository.getAssetById(assetId)).ownerId, ownerBefore);
	assert.equal((await walletRepository.getWalletByUserId(userA.user.id)).balance, sellerBalanceBefore);
	assert.equal((await marketplaceRepository.getListingByReference(listing.reference)).status, 'active');
});

test('purchase atomically transfers ownership, balances, Vault membership, and persistent history', async () => {
	await walletService.addTransaction(userB.user.id, { type: 'deposit', amount: 500, description: 'Test credit allocation' });
	const listing = await marketplaceRepository.getActiveListingForAsset(assetId);
	const assetBefore = await assetRepository.getAssetById(assetId);
	const hashBefore = await assetRepository.getAssetHashByAssetId(assetId);
	const metadataBefore = await assetRepository.getAssetMetadataByAssetId(assetId);
	const reportsBefore = await verificationService.getVerifications(userA.user.id);
	const receipt = await marketplaceService.purchaseListing(userB.user.id, listing.reference);
	assert.match(receipt.transactionReference, /^TX-[A-F0-9]{6}$/);
	assert.equal(receipt.asset.reference, `VC-A${String(assetId).padStart(6, '0')}`);
	assert.equal(receipt.price, 125);
	assert.equal(receipt.buyerBalance, 375);
	assert.equal((await walletRepository.getWalletByUserId(userA.user.id)).balance, 125);
	assert.equal((await walletRepository.getWalletByUserId(userB.user.id)).balance, 375);
	const assetAfter = await assetRepository.getAssetById(assetId);
	assert.equal(assetAfter.ownerId, userB.user.id);
	assert.equal(assetAfter.filePath, assetBefore.filePath);
	assert.deepEqual(await assetRepository.getAssetHashByAssetId(assetId), hashBefore);
	assert.deepEqual(await assetRepository.getAssetMetadataByAssetId(assetId), metadataBefore);
	assert.equal((await marketplaceRepository.getListingByReference(listing.reference)).status, 'sold');
	assert.equal((await vaultService.getVault(userA.user.id, clientVaultReference, userAFingerprint)).assetCount, 0);
	assert.equal((await assetService.getAssets(userA.user.id, userAFingerprint)).some((asset) => asset.id === assetId), false);
	assert.equal((await assetService.getAssets(userB.user.id, userBFingerprint)).some((asset) => asset.id === assetId), true);
	assert.equal((await verificationService.getVerifications(userA.user.id)).length, reportsBefore.length);
	assert.equal((await dashboardRepository.getSummary(userA.user.id)).totalVerificationReports, reportsBefore.length);
	const history = await marketplaceService.getOwnershipHistory(userB.user.id, assetId);
	assert.equal(history.length, 1);
	assert.equal(history[0].transactionReference, receipt.transactionReference);
	assert.match(history[0].previousOwner, /^VC-[A-F0-9]{8}$/);
	assert.match(history[0].newOwner, /^VC-[A-F0-9]{8}$/);
	assert.doesNotMatch(JSON.stringify(history), /@example\.test|Asset Owner/);
	await assert.rejects(() => marketplaceService.getOwnershipHistory(userA.user.id, assetId), (error) => error.status === 404);
	await assert.rejects(() => vaultService.getVault(userB.user.id, clientVaultReference, userBFingerprint), (error) => error.status === 404);
	await assert.rejects(() => marketplaceService.purchaseListing(userC.user.id, listing.reference), (error) => error.status === 409);
	const buyerTransactions = await walletService.getTransactions(userB.user.id);
	const sellerTransactions = await walletService.getTransactions(userA.user.id);
	assert.ok(buyerTransactions.some((transaction) => transaction.type === 'purchase' && transaction.referenceId === receipt.transactionReference));
	assert.ok(sellerTransactions.some((transaction) => transaction.type === 'sale' && transaction.referenceId === receipt.transactionReference));
	const ownership = await assetService.checkAssetOwnership(userB.user.id, createCheckFile('buyer-ownership.png'));
	assert.equal(ownership.asset.owner.isCurrentUser, true);
	assert.equal(ownership.asset.id, assetId);
});

test('concurrent purchases serialize so exactly one buyer succeeds', async () => {
	await walletService.addTransaction(userC.user.id, { type: 'deposit', amount: 500, description: 'Test credit allocation' });
	const listing = await marketplaceService.createListing(userA.user.id, userAFingerprint, {
		assetId: newerAssetId, title: 'Concurrent sale', description: '', price: 50,
	});
	const results = await Promise.allSettled([
		marketplaceService.purchaseListing(userB.user.id, listing.reference),
		marketplaceService.purchaseListing(userC.user.id, listing.reference),
	]);
	assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
	assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.status === 409).length, 1);
	const sold = await marketplaceRepository.getListingByReference(listing.reference);
	assert.equal(sold.status, 'sold');
	assert.ok([userB.user.id, userC.user.id].includes((await assetRepository.getAssetById(newerAssetId)).ownerId));
	assert.equal((await marketplaceRepository.getOwnershipHistory(newerAssetId)).length, 1);
});

test('forced persistence failure rolls the complete purchase transaction back', async () => {
	const rollbackAsset = await assetRepository.createAsset({
		ownerId: userA.user.id, title: 'Rollback asset', description: null, category: 'image',
		fileName: 'rollback.png', filePath: path.join(testUploadDirectory, 'rollback.png'), fileSize: 10, mimeType: 'image/png',
	});
	const listing = await marketplaceService.createListing(userA.user.id, userAFingerprint, {
		assetId: rollbackAsset.id, title: 'Rollback test', description: '', price: 25,
	});
	await vaultService.addAssets(userA.user.id, clientVaultReference, { assetIds: [rollbackAsset.id] }, userAFingerprint);
	const buyerBefore = (await walletRepository.getWalletByUserId(userB.user.id)).balance;
	const sellerBefore = (await walletRepository.getWalletByUserId(userA.user.id)).balance;
	await new Promise((resolve, reject) => database.run(
		`CREATE TRIGGER fail_marketplace_history BEFORE INSERT ON ownership_history
		 BEGIN SELECT RAISE(ABORT, 'forced ownership history failure'); END`,
		(error) => error ? reject(error) : resolve()
	));
	try {
		await assert.rejects(() => marketplaceService.purchaseListing(userB.user.id, listing.reference), /forced ownership history failure/);
	} finally {
		await new Promise((resolve, reject) => database.run('DROP TRIGGER fail_marketplace_history', (error) => error ? reject(error) : resolve()));
	}
	assert.equal((await walletRepository.getWalletByUserId(userB.user.id)).balance, buyerBefore);
	assert.equal((await walletRepository.getWalletByUserId(userA.user.id)).balance, sellerBefore);
	assert.equal((await assetRepository.getAssetById(rollbackAsset.id)).ownerId, userA.user.id);
	assert.equal((await marketplaceRepository.getListingByReference(listing.reference)).status, 'active');
	assert.deepEqual(await marketplaceRepository.getOwnershipHistory(rollbackAsset.id), []);
	assert.equal((await vaultService.getVault(userA.user.id, clientVaultReference, userAFingerprint)).assets.some((asset) => asset.id === rollbackAsset.id), true);
	const cancelled = await marketplaceService.deleteListing(userA.user.id, listing.reference, userAFingerprint);
	assert.equal(cancelled.status, 'cancelled');
});
