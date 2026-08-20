const assert = require('node:assert/strict');
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
const assetService = require('../src/services/asset/assetService');
const authService = require('../src/services/auth/authService');
const verificationService = require('../src/services/verification/verificationService');
const vaultService = require('../src/services/vault/vaultService');

let userA;
let userB;
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
	assert.ok((await assetService.getAssetHash(userA.user.id, assetId)).sha256Hash);
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
	const photography = await vaultService.createVault(userA.user.id, { name: '  Photography  ', description: 'Original photo assets' });
	const clientWork = await vaultService.createVault(userA.user.id, { name: 'Client Work', description: '' });
	photographyVaultReference = photography.reference;
	clientVaultReference = clientWork.reference;
	assert.match(photography.reference, /^VT-[A-F0-9]{6}$/);
	assert.equal(photography.name, 'Photography');
	assert.equal(photography.description, 'Original photo assets');
	assert.equal((await vaultService.getVaults(userA.user.id)).length, 2);
	assert.deepEqual(await vaultService.getVaults(userB.user.id), []);
	assert.equal((await vaultService.getVault(userA.user.id, photography.reference)).name, 'Photography');
	await assert.rejects(() => vaultService.getVault(userB.user.id, photography.reference), (error) => error.status === 404);
});

test('updates an owned Vault and rejects cross-owner update attempts', async () => {
	const updated = await vaultService.updateVault(userA.user.id, photographyVaultReference, { name: 'Photography Archive' });
	assert.equal(updated.name, 'Photography Archive');
	assert.equal(updated.description, 'Original photo assets');
	await assert.rejects(
		() => vaultService.updateVault(userB.user.id, photographyVaultReference, { name: 'Tampered' }),
		(error) => error.status === 404
	);
});

test('adds multiple owned assets without copying asset records and updates real dashboard counts', async () => {
	const beforeAssets = await assetService.getAssets(userA.user.id);
	const vault = await vaultService.addAssets(userA.user.id, photographyVaultReference, { assetIds: [assetId, newerAssetId] });
	assert.equal(vault.assetCount, 2);
	assert.deepEqual(new Set(vault.assets.map((asset) => asset.id)), new Set([assetId, newerAssetId]));
	assert.equal((await assetService.getAssets(userA.user.id)).length, beforeAssets.length);
	const summary = await dashboardRepository.getSummary(userA.user.id);
	assert.equal(summary.totalVaults, 2);
	assert.equal(summary.totalOrganizedAssets, 2);
});

test('rejects duplicate Vault membership and foreign asset injection', async () => {
	await assert.rejects(
		() => vaultService.addAssets(userA.user.id, photographyVaultReference, { assetIds: [assetId] }),
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
		() => vaultService.addAssets(userA.user.id, photographyVaultReference, { assetIds: [foreignAsset.id] }),
		(error) => error.status === 404
	);
	assert.equal((await vaultService.getVault(userA.user.id, photographyVaultReference)).assetCount, 2);
});

test('removes only Vault membership while preserving asset, hashes, and verification reports', async () => {
	const reportsBefore = await verificationService.getVerifications(userA.user.id);
	const updated = await vaultService.removeAsset(userA.user.id, photographyVaultReference, assetId);
	assert.equal(updated.assets.some((asset) => asset.id === assetId), false);
	assert.equal((await assetService.getAsset(userA.user.id, assetId)).id, assetId);
	assert.ok((await assetService.getAssetHash(userA.user.id, assetId)).sha256Hash);
	assert.equal((await verificationService.getVerifications(userA.user.id)).length, reportsBefore.length);
	await vaultService.addAssets(userA.user.id, photographyVaultReference, { assetIds: [assetId] });
});

test('deletes a Vault and memberships without deleting contained assets or verification evidence', async () => {
	await assert.rejects(() => vaultService.deleteVault(userB.user.id, photographyVaultReference), (error) => error.status === 404);
	const reportsBefore = await verificationService.getVerifications(userA.user.id);
	await vaultService.deleteVault(userA.user.id, photographyVaultReference);
	await assert.rejects(() => vaultService.getVault(userA.user.id, photographyVaultReference), (error) => error.status === 404);
	assert.equal((await assetService.getAsset(userA.user.id, assetId)).id, assetId);
	assert.ok((await assetService.getAssetHash(userA.user.id, assetId)).phash);
	assert.equal((await verificationService.getVerifications(userA.user.id)).length, reportsBefore.length);
});

test('asset row deletion cascades Vault membership without leaving a broken relation', async () => {
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
	await vaultService.addAssets(userA.user.id, clientVaultReference, { assetIds: [temporaryAsset.id] });
	await new Promise((resolve, reject) => database.run('DELETE FROM assets WHERE id = ?', [temporaryAsset.id], (error) => error ? reject(error) : resolve()));
	assert.equal((await vaultService.getVault(userA.user.id, clientVaultReference)).assetCount, 0);
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
