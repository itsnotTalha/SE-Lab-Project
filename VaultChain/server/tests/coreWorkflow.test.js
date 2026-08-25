const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { after, before, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-core-workflow-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'workflow.sqlite');
process.env.UPLOAD_DIRECTORY = path.join(testDirectory, 'uploads');
process.env.CHECK_UPLOAD_DIRECTORY = path.join(testDirectory, 'checks');
process.env.JWT_SECRET = 'vaultchain-core-workflow-test-secret';

const app = require('../src/app');
const { database } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/initDatabase');

let baseUrl;
let server;
let imageBuffer;

async function api(pathname, { token, method = 'GET', json, form } = {}) {
	const headers = {};
	if (token) headers.Authorization = `Bearer ${token}`;
	if (json !== undefined) headers['Content-Type'] = 'application/json';
	const response = await fetch(`${baseUrl}/api${pathname}`, {
		method,
		headers,
		body: form || (json === undefined ? undefined : JSON.stringify(json)),
	});
	const contentType = response.headers.get('content-type') || '';
	let body = null;
	if (response.status !== 204) {
		body = contentType.includes('application/json')
			? await response.json()
			: Buffer.from(await response.arrayBuffer());
	}
	return { status: response.status, body };
}

function expectStatus(response, status) {
	assert.equal(response.status, status, JSON.stringify(response.body));
	return response.body;
}

function imageForm({ title, filename }) {
	const form = new FormData();
	if (title) {
		form.set('title', title);
		form.set('category', 'image');
		form.set('description', 'Core workflow integration asset');
	}
	form.set('file', new Blob([imageBuffer], { type: 'image/png' }), filename);
	return form;
}

before(async () => {
	await initializeDatabase();
	const fixtureDirectory = path.resolve(__dirname, '../src/uploads');
	const fixtureName = fs.readdirSync(fixtureDirectory).find((name) => name.endsWith('.png'));
	assert.ok(fixtureName, 'A PNG fixture is required');
	imageBuffer = fs.readFileSync(path.join(fixtureDirectory, fixtureName));
	server = app.listen(0, '127.0.0.1');
	await once(server, 'listening');
	baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
	if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
	await new Promise((resolve) => database.close(resolve));
	fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('complete authenticated asset, verification, Vault, marketplace, wallet, and dashboard journey', async () => {
	const ownerRegistration = expectStatus(await api('/auth/register', {
		method: 'POST',
		json: { fullName: 'Workflow Owner', email: 'workflow-owner@example.test', password: 'OwnerPass123!' },
	}), 201);
	assert.match(ownerRegistration.token, /\S+/);
	const ownerLogin = expectStatus(await api('/auth/login', {
		method: 'POST',
		json: { email: 'workflow-owner@example.test', password: 'OwnerPass123!' },
	}), 200);
	const ownerToken = ownerLogin.token;
	assert.equal(expectStatus(await api('/auth/me', { token: ownerToken }), 200).user.email, 'workflow-owner@example.test');

	const upload = expectStatus(await api('/assets/upload', {
		token: ownerToken,
		method: 'POST',
		form: imageForm({ title: 'Journey Asset', filename: 'journey.png' }),
	}), 201);
	const assetId = upload.asset.id;
	const storedFileName = upload.asset.fileName;
	assert.match(upload.hash.sha256, /^[a-f0-9]{64}$/);
	assert.equal(expectStatus(await api('/assets', { token: ownerToken }), 200).assets.some((asset) => asset.id === assetId), true);

	const buyerRegistration = expectStatus(await api('/auth/register', {
		method: 'POST',
		json: { fullName: 'Workflow Buyer', email: 'workflow-buyer@example.test', password: 'BuyerPass123!' },
	}), 201);
	assert.ok(buyerRegistration.user.id);
	const buyerToken = expectStatus(await api('/auth/login', {
		method: 'POST',
		json: { email: 'workflow-buyer@example.test', password: 'BuyerPass123!' },
	}), 200).token;

	const verification = expectStatus(await api('/verifications', {
		token: buyerToken,
		method: 'POST',
		form: imageForm({ filename: 'buyer-check.png' }),
	}), 201).verification;
	assert.equal(verification.result, 'matches_found');
	assert.equal(verification.matches[0].matchType, 'exact');
	assert.equal(verification.matches[0].sha256Match, true);
	assert.equal(verification.matches[0].ownerIsCurrentUser, false);
	assert.equal(verification.matches[0].asset, undefined);
	assert.doesNotMatch(JSON.stringify(verification), /Journey Asset|workflow-owner@example\.test|filePath/);
	assert.equal(JSON.stringify(verification).includes(storedFileName), false);
	assert.equal(expectStatus(await api('/verifications', { token: buyerToken }), 200).verifications.length, 1);
	assert.equal(expectStatus(await api('/verifications', { token: ownerToken }), 200).verifications.length, 0);
	assert.equal(expectStatus(await api(`/assets/${assetId}`, { token: ownerToken }), 200).asset.id, assetId);
	assert.equal((await api(`/assets/${assetId}`, { token: buyerToken })).status, 404);

	const vault = expectStatus(await api('/vaults', {
		token: ownerToken,
		method: 'POST',
		json: { name: 'Journey Vault', description: 'Protected workflow asset', password: 'VaultPass123!', autoLockMinutes: 10 },
	}), 201).vault;
	assert.match(vault.reference, /^VT-[A-F0-9]{6}$/);
	expectStatus(await api(`/vaults/${vault.reference}/unlock`, {
		token: ownerToken, method: 'POST', json: { password: 'VaultPass123!' },
	}), 200);
	expectStatus(await api(`/vaults/${vault.reference}/assets`, {
		token: ownerToken, method: 'POST', json: { assetIds: [assetId] },
	}), 200);
	expectStatus(await api(`/vaults/${vault.reference}/lock`, { token: ownerToken, method: 'POST' }), 200);
	assert.equal((await api(`/assets/${assetId}/content`, { token: ownerToken })).status, 423);
	assert.equal((await api(`/vaults/${vault.reference}/unlock`, {
		token: ownerToken, method: 'POST', json: { password: 'WrongVaultPass!' },
	})).status, 401);
	expectStatus(await api(`/vaults/${vault.reference}/unlock`, {
		token: ownerToken, method: 'POST', json: { password: 'VaultPass123!' },
	}), 200);
	assert.equal((await api(`/assets/${assetId}/content`, { token: ownerToken })).status, 200);

	const listing = expectStatus(await api('/marketplace/listings', {
		token: ownerToken,
		method: 'POST',
		json: { assetId, title: 'Journey Asset Listing', description: 'Verified original', price: 125 },
	}), 201).listing;
	assert.match(listing.reference, /^ML-[A-F0-9]{6}$/);
	const buyerView = expectStatus(await api(`/marketplace/listings/${listing.reference}`, { token: buyerToken }), 200).listing;
	assert.equal(buyerView.status, 'active');
	assert.equal(buyerView.asset.id, null);
	assert.equal(buyerView.asset.isLocked, true);
	assert.equal((await api(`/marketplace/listings/${listing.reference}/content`, { token: buyerToken })).status, 423);
	assert.doesNotMatch(JSON.stringify(buyerView), /workflow-owner@example\.test|Workflow Owner|filePath|fileName/);

	const failedPurchase = await api(`/marketplace/listings/${listing.reference}/purchase`, { token: buyerToken, method: 'POST' });
	assert.equal(failedPurchase.status, 400);
	assert.match(failedPurchase.body.message, /Insufficient/);
	const failedBuyerDashboard = expectStatus(await api('/dashboard/summary', { token: buyerToken }), 200).summary;
	const failedOwnerDashboard = expectStatus(await api('/dashboard/summary', { token: ownerToken }), 200).summary;
	assert.equal(failedBuyerDashboard.walletBalance, 0);
	assert.equal(failedOwnerDashboard.walletBalance, 0);
	assert.equal(failedOwnerDashboard.activeListings, 1);
	assert.equal(expectStatus(await api('/wallet/transactions', { token: buyerToken }), 200).transactions.length, 0);
	assert.equal(expectStatus(await api(`/marketplace/listings/${listing.reference}`, { token: buyerToken }), 200).listing.status, 'active');
	assert.equal(expectStatus(await api(`/assets/${assetId}`, { token: ownerToken }), 200).asset.id, assetId);

	const deposit = expectStatus(await api('/wallet/transactions', {
		token: buyerToken,
		method: 'POST',
		json: { type: 'deposit', amount: 500, description: 'Workflow funding' },
	}), 201);
	assert.equal(deposit.wallet.balance, 500);
	const receipt = expectStatus(await api(`/marketplace/listings/${listing.reference}/purchase`, {
		token: buyerToken, method: 'POST',
	}), 200).receipt;
	assert.match(receipt.transactionReference, /^TX-[A-F0-9]{6}$/);
	assert.equal(receipt.price, 125);
	assert.equal(receipt.buyerBalance, 375);

	assert.equal(expectStatus(await api('/wallet', { token: buyerToken }), 200).wallet.balance, 375);
	assert.equal(expectStatus(await api('/wallet', { token: ownerToken }), 200).wallet.balance, 125);
	const buyerTransactions = expectStatus(await api('/wallet/transactions', { token: buyerToken }), 200).transactions;
	const ownerTransactions = expectStatus(await api('/wallet/transactions', { token: ownerToken }), 200).transactions;
	assert.ok(buyerTransactions.some((entry) => entry.type === 'purchase' && entry.referenceId === receipt.transactionReference && entry.amount === 125));
	assert.ok(ownerTransactions.some((entry) => entry.type === 'sale' && entry.referenceId === receipt.transactionReference && entry.amount === 125));
	assert.equal(expectStatus(await api(`/marketplace/listings/${listing.reference}`, { token: ownerToken }), 200).listing.status, 'sold');
	assert.equal(expectStatus(await api('/assets', { token: ownerToken }), 200).assets.some((asset) => asset.id === assetId), false);
	assert.equal(expectStatus(await api('/assets', { token: buyerToken }), 200).assets.some((asset) => asset.id === assetId), true);

	const ownerDashboard = expectStatus(await api('/dashboard/summary', { token: ownerToken }), 200).summary;
	const buyerDashboard = expectStatus(await api('/dashboard/summary', { token: buyerToken }), 200).summary;
	assert.deepEqual(
		{ assets: ownerDashboard.totalAssets, vaults: ownerDashboard.totalVaults, listings: ownerDashboard.activeListings, verifications: ownerDashboard.totalVerificationReports, balance: ownerDashboard.walletBalance },
		{ assets: 0, vaults: 1, listings: 0, verifications: 0, balance: 125 }
	);
	assert.deepEqual(
		{ assets: buyerDashboard.totalAssets, vaults: buyerDashboard.totalVaults, listings: buyerDashboard.activeListings, verifications: buyerDashboard.totalVerificationReports, balance: buyerDashboard.walletBalance },
		{ assets: 1, vaults: 0, listings: 0, verifications: 1, balance: 375 }
	);
	assert.ok(ownerDashboard.recentActivity.some((activity) => activity.type === 'sale' && activity.reference === receipt.transactionReference));
	assert.ok(buyerDashboard.recentActivity.some((activity) => activity.type === 'purchase' && activity.reference === receipt.transactionReference));

	assert.equal((await api(`/assets/${assetId}`, { token: ownerToken })).status, 404);
	assert.equal(expectStatus(await api(`/assets/${assetId}`, { token: buyerToken }), 200).asset.id, assetId);
	assert.equal((await api('/marketplace/listings', {
		token: ownerToken, method: 'POST', json: { assetId, title: 'Invalid relist', price: 10 },
	})).status, 404);
	assert.equal(expectStatus(await api(`/vaults/${vault.reference}`, { token: ownerToken }), 200).vault.assetCount, 0);
	expectStatus(await api(`/vaults/${vault.reference}`, { token: ownerToken, method: 'DELETE' }), 204);
	assert.equal(expectStatus(await api(`/assets/${assetId}`, { token: buyerToken }), 200).asset.id, assetId);

	const buyerRelisting = expectStatus(await api('/marketplace/listings', {
		token: buyerToken,
		method: 'POST',
		json: { assetId, title: 'Buyer-owned Journey Asset', description: 'Relisted by its current owner', price: 150 },
	}), 201).listing;
	assert.equal(buyerRelisting.seller.isCurrentUser, true);
	const formerOwnerView = expectStatus(await api(`/marketplace/listings/${buyerRelisting.reference}`, { token: ownerToken }), 200).listing;
	assert.equal(formerOwnerView.asset.id, null);
	assert.doesNotMatch(JSON.stringify(formerOwnerView), /workflow-buyer@example\.test|Workflow Buyer|filePath|fileName/);
	expectStatus(await api(`/marketplace/listings/${buyerRelisting.reference}`, { token: buyerToken, method: 'DELETE' }), 200);
});
