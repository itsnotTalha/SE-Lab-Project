const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { after, before, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-marketplace-preview-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'workflow.sqlite');
process.env.UPLOAD_DIRECTORY = path.join(testDirectory, 'uploads');
process.env.CHECK_UPLOAD_DIRECTORY = path.join(testDirectory, 'checks');
process.env.JWT_SECRET = 'vaultchain-marketplace-preview-test-secret';

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

test('named and anonymous listings enforce buyer-specific approval, revocation, and listing lifecycle', async () => {
	async function register(name, email) {
		return expectStatus(await api('/auth/register', { method: 'POST', json: { fullName: name, email, password: 'PreviewPass123!' } }), 201).token;
	}
	const seller = await register('Preview Seller', 'preview-seller@example.test');
	const buyer = await register('Interested Buyer', 'preview-buyer@example.test');
	const stranger = await register('Other Buyer', 'preview-other@example.test');
	const assetId = expectStatus(await api('/assets/upload', { token: seller, method: 'POST', form: imageForm({ title: 'Preview asset', filename: 'preview.png' }) }), 201).asset.id;
	const create = (payload = {}) => api('/marketplace/listings', { token: seller, method: 'POST', json: { assetId, title: 'Preview listing', price: 20, ...payload } });
	const publicListing = expectStatus(await create(), 201).listing;
	const base = (listing) => `/marketplace/listings/${listing.reference}`;
	const view = async (listing, token = buyer) => expectStatus(await api(base(listing), { token }), 200).listing;
	assert.equal((await view(publicListing)).seller.name, 'Preview Seller');
	assert.equal((await view(publicListing)).seller.isAnonymous, false);
	assert.equal((await api(`${base(publicListing)}/content`, { token: buyer })).status, 200);
	assert.equal((await api(`${base(publicListing)}/preview-requests`, { token: buyer, method: 'POST' })).status, 400);
	assert.equal((await api(base(publicListing), { token: buyer, method: 'PATCH', json: { isAnonymous: true } })).status, 404);
	assert.equal((await api(base(publicListing), { token: seller, method: 'PATCH', json: { isAnonymous: 'false' } })).status, 400);
	expectStatus(await api(base(publicListing), { token: seller, method: 'PATCH', json: { isAnonymous: true } }), 200);
	const anonymous = await view(publicListing);
	assert.equal(anonymous.seller.name, null);
	assert.equal(anonymous.seller.reference, null);
	assert.equal(anonymous.seller.isAnonymous, true);
	assert.doesNotMatch(JSON.stringify(anonymous), /Preview Seller|preview-seller|sellerId/);
	const listings = expectStatus(await api('/marketplace/listings', { token: buyer }), 200).listings;
	assert.equal(listings[0].seller.name, null);
	expectStatus(await api(base(publicListing), { token: seller, method: 'PATCH', json: { isAnonymous: false } }), 200);
	assert.equal((await view(publicListing)).seller.name, 'Preview Seller');
	expectStatus(await api(base(publicListing), { token: seller, method: 'DELETE' }), 200);

	const vault = expectStatus(await api('/vaults', { token: seller, method: 'POST', json: { name: 'Preview Vault', password: 'VaultPass123!', autoLockMinutes: 10 } }), 201).vault;
	const unlock = () => api(`/vaults/${vault.reference}/unlock`, { token: seller, method: 'POST', json: { password: 'VaultPass123!' } });
	const lock = () => api(`/vaults/${vault.reference}/lock`, { token: seller, method: 'POST' });
	expectStatus(await unlock(), 200);
	expectStatus(await api(`/vaults/${vault.reference}/assets`, { token: seller, method: 'POST', json: { assetIds: [assetId] } }), 200);
	assert.equal((await create({ isAnonymous: 'yes' })).status, 400);
	const listing = expectStatus(await create({ isAnonymous: true }), 201).listing;
	assert.equal(listing.asset.previewRequiresApproval, true);
	assert.equal((await view(listing)).asset.previewAvailable, false);
	assert.equal((await view(listing)).asset.contentUrl, null);
	assert.equal((await view(listing)).seller.name, null);
	const requestPath = `${base(listing)}/preview-requests`;
	assert.equal((await api(requestPath, { method: 'POST' })).status, 401);
	assert.equal((await api(requestPath, { token: seller, method: 'POST' })).status, 400);
	const [one, two] = await Promise.all([api(requestPath, { token: buyer, method: 'POST' }), api(requestPath, { token: buyer, method: 'POST' })]);
	const request = expectStatus(one, 200).request;
	assert.deepEqual(expectStatus(two, 200).request, request);
	assert.equal(request.status, 'pending');
	assert.equal((await view(listing, seller)).pendingPreviewRequests, 1);
	assert.equal((await view(listing)).previewRequest.status, 'pending');
	assert.equal((await view(listing, stranger)).previewRequest, null);
	assert.equal((await api(requestPath, { token: buyer })).status, 404);
	assert.equal((await api(requestPath, { token: stranger })).status, 404);
	const inbox = expectStatus(await api(requestPath, { token: seller }), 200).requests;
	assert.equal(inbox.length, 1);
	assert.equal(inbox[0].buyerName, 'Interested Buyer');
	const decide = (status, token = seller, id = request.id) => api(`${requestPath}/${id}`, { token, method: 'PATCH', json: { status } });
	assert.equal((await decide('approved', buyer)).status, 404);
	assert.equal((await decide('approved', stranger)).status, 404);
	assert.equal((await decide('invalid')).status, 400);
	assert.equal((await decide('approved', seller, 99999)).status, 404);
	assert.equal((await api(`${base(listing)}/content`, { token: buyer })).status, 423);
	expectStatus(await lock(), 200);
	assert.equal((await decide('approved')).status, 423);
	expectStatus(await unlock(), 200);
	expectStatus(await decide('approved'), 200);
	expectStatus(await lock(), 200);
	assert.equal((await view(listing)).asset.previewAvailable, true);
	assert.equal((await view(listing)).asset.isLocked, false);
	assert.deepEqual((await api(`${base(listing)}/content`, { token: buyer })).body, imageBuffer);
	assert.equal((await api(`${base(listing)}/content`, { token: stranger })).status, 423);
	assert.equal((await api(`/assets/${assetId}/content`, { token: buyer })).status, 404);
	assert.equal((await api(`${base(listing)}/content`, { token: seller })).status, 423);
	// Revocation is allowed even while the seller's Vault is locked.
	expectStatus(await decide('revoked'), 200);
	assert.equal((await api(`${base(listing)}/content`, { token: buyer })).status, 423);
	assert.equal((await view(listing)).asset.previewAvailable, false);
	assert.equal(expectStatus(await api(requestPath, { token: buyer, method: 'POST' }), 200).request.status, 'revoked');
	const otherRequest = expectStatus(await api(requestPath, { token: stranger, method: 'POST' }), 200).request;
	expectStatus(await decide('denied', seller, otherRequest.id), 200);
	assert.equal((await view(listing, stranger)).previewRequest.status, 'denied');
	expectStatus(await unlock(), 200);
	expectStatus(await decide('approved'), 200);
	// Removing the original Vault does not make this listing's preview public.
	expectStatus(await api(`/vaults/${vault.reference}`, { token: seller, method: 'DELETE' }), 204);
	assert.equal((await view(listing, stranger)).asset.previewAvailable, false);
	assert.equal((await api(`${base(listing)}/content`, { token: stranger })).status, 423);
	expectStatus(await api(base(listing), { token: seller, method: 'DELETE' }), 200);
	assert.equal((await api(`${base(listing)}/content`, { token: buyer })).status, 404);
	assert.equal((await decide('approved')).status, 409);
	assert.equal((await api(requestPath, { token: buyer, method: 'POST' })).status, 409);

	// A new listing gets its own approvals, never grants from an old listing.
	const nextVault = expectStatus(await api('/vaults', { token: seller, method: 'POST', json: { name: 'Next Vault', password: 'VaultPass123!', autoLockMinutes: 10 } }), 201).vault;
	expectStatus(await api(`/vaults/${nextVault.reference}/unlock`, { token: seller, method: 'POST', json: { password: 'VaultPass123!' } }), 200);
	expectStatus(await api(`/vaults/${nextVault.reference}/assets`, { token: seller, method: 'POST', json: { assetIds: [assetId] } }), 200);
	const nextListing = expectStatus(await create(), 201).listing;
	assert.equal((await view(nextListing)).previewRequest, null);
	assert.equal((await api(`${base(nextListing)}/content`, { token: buyer })).status, 423);
	assert.equal((await api(`${base(nextListing)}/preview-requests/${request.id}`, { token: seller, method: 'PATCH', json: { status: 'approved' } })).status, 404);
	const nextRequest = expectStatus(await api(`${base(nextListing)}/preview-requests`, { token: buyer, method: 'POST' }), 200).request;
	expectStatus(await api(`${base(nextListing)}/preview-requests/${nextRequest.id}`, { token: seller, method: 'PATCH', json: { status: 'approved' } }), 200);
	expectStatus(await api('/wallet/transactions', { token: stranger, method: 'POST', json: { type: 'deposit', amount: 100, description: 'Preview test deposit' } }), 201);
	expectStatus(await api(`${base(nextListing)}/purchase`, { token: stranger, method: 'POST' }), 200);
	assert.equal((await api(`${base(nextListing)}/content`, { token: buyer })).status, 404);
	assert.equal((await view(nextListing)).asset.previewAvailable, false);
	assert.equal((await api(`${base(nextListing)}/preview-requests/${nextRequest.id}`, { token: seller, method: 'PATCH', json: { status: 'approved' } })).status, 404);
});
