const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { after, before, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-mkt-tests-'));
const uploadDirectory = path.join(testDirectory, 'uploads');
process.env.DATABASE_PATH = path.join(testDirectory, 'marketplace.sqlite');
process.env.UPLOAD_DIRECTORY = uploadDirectory;
process.env.DOCUMENT_UPLOAD_DIRECTORY = path.join(testDirectory, 'documents');
process.env.JWT_SECRET = 'vaultchain-marketplace-test-secret';

const app = require('../src/app');
const { database } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/initDatabase');

let server;
let baseUrl;

function digitalPdf(text) {
	const content = `BT /F1 24 Tf 72 720 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`;
	const objects = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
		`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
	];
	let pdf = '%PDF-1.4\n';
	const offsets = [0];
	objects.forEach((object, index) => {
		offsets.push(Buffer.byteLength(pdf));
		pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
	});
	const xref = Buffer.byteLength(pdf);
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
	return Buffer.from(pdf);
}

function uploadForm(name, type, buffer) {
	const form = new FormData();
	form.set('file', new Blob([buffer], { type }), name);
	return form;
}

async function api(pathname, { token, method = 'GET', form, json } = {}) {
	const headers = {};
	if (token) headers.Authorization = `Bearer ${token}`;
	if (json !== undefined) headers['Content-Type'] = 'application/json';
	const response = await fetch(`${baseUrl}/api${pathname}`, {
		method,
		headers,
		body: form || (json === undefined ? undefined : JSON.stringify(json)),
	});
	const type = response.headers.get('content-type') || '';
	const body = response.status === 204
		? null
		: type.includes('application/json')
			? await response.json()
			: Buffer.from(await response.arrayBuffer());
	return { status: response.status, body, type };
}

function expectStatus(response, status) {
	assert.equal(response.status, status, JSON.stringify(response.body));
	return response.body;
}

before(async () => {
	fs.mkdirSync(uploadDirectory, { recursive: true });
	await initializeDatabase();
	server = app.listen(0, '127.0.0.1');
	await once(server, 'listening');
	baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
	if (server?.listening) {
		await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
	}
	await new Promise((resolve) => database.close(resolve));
	fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('marketplace access request, approval, rejection, and grant workflow', async () => {
	const seller = expectStatus(await api('/auth/register', {
		method: 'POST',
		json: { fullName: 'Seller User', email: 'seller@example.test', password: 'Password123!' },
	}), 201);

	const buyer = expectStatus(await api('/auth/register', {
		method: 'POST',
		json: { fullName: 'Buyer User', email: 'buyer@example.test', password: 'Password123!' },
	}), 201);

	// Seller uploads document and lists it
	const docRes = expectStatus(await api('/documents', {
		token: seller.token,
		method: 'POST',
		form: uploadForm('seller-doc.pdf', 'application/pdf', digitalPdf('Protected Seller Document Content')),
	}), 201).document;

	const listingRes = expectStatus(await api(`/documents/${docRes.id}/marketplace`, {
		token: seller.token,
		method: 'POST',
		json: { title: 'Rare Document Asset', description: 'Exclusive collection', price: 100 },
	}), 201);
	const listing = listingRes.listing;
	assert.match(listing.reference, /^ML-[A-F0-9]{6}$/);

	// 1. Seller cannot request access to their own listing
	const ownReq = await api(`/marketplace/listings/${listing.reference}/requests`, {
		token: seller.token,
		method: 'POST',
		json: { message: 'Can I see my own doc?' },
	});
	assert.equal(ownReq.status, 400);

	// 2. Buyer submits access request
	const reqRes = expectStatus(await api(`/marketplace/listings/${listing.reference}/requests`, {
		token: buyer.token,
		method: 'POST',
		json: { message: 'Please grant access to review page 1' },
	}), 201);
	assert.equal(reqRes.success, true);
	assert.equal(reqRes.request.status, 'pending');
	assert.equal(reqRes.request.message, 'Please grant access to review page 1');
	const requestId = reqRes.request.id;

	// 3. Buyer cannot create duplicate pending request
	const dupReq = await api(`/marketplace/listings/${listing.reference}/requests`, {
		token: buyer.token,
		method: 'POST',
		json: { message: 'Duplicate attempt' },
	});
	assert.equal(dupReq.status, 409);
	assert.equal(dupReq.body.code, 'DUPLICATE_PENDING_REQUEST');

	// 4. Seller checks received requests
	const receivedRes = expectStatus(await api('/marketplace/requests/received', {
		token: seller.token,
	}), 200);
	assert.equal(receivedRes.requests.length, 1);
	assert.equal(receivedRes.requests[0].id, requestId);
	assert.equal(receivedRes.requests[0].requesterName, 'Buyer User');

	// 5. Buyer checks sent requests
	const sentRes = expectStatus(await api('/marketplace/requests/sent', {
		token: buyer.token,
	}), 200);
	assert.equal(sentRes.requests.length, 1);
	assert.equal(sentRes.requests[0].id, requestId);

	// 6. Check listing status endpoint
	const statusRes = expectStatus(await api(`/marketplace/listings/${listing.reference}/requests/status`, {
		token: buyer.token,
	}), 200);
	assert.equal(statusRes.request.status, 'pending');

	// 7. Non-owner cannot approve request
	const unauthApprove = await api(`/marketplace/requests/${requestId}/approve`, {
		token: buyer.token,
		method: 'POST',
		json: { accessType: 'single', pages: [1], canView: true },
	});
	assert.equal(unauthApprove.status, 403);

	// 8. Seller approves request with single page access
	const approveRes = expectStatus(await api(`/marketplace/requests/${requestId}/approve`, {
		token: seller.token,
		method: 'POST',
		json: {
			accessType: 'single',
			pages: [1],
			canView: true,
			canDownload: false,
		},
	}), 200);
	assert.equal(approveRes.success, true);
	assert.equal(approveRes.request.status, 'approved');
	assert.equal(approveRes.grant.accessType, 'single');
	assert.equal(approveRes.grant.canView, true);
	assert.equal(approveRes.grant.canDownload, false);
	assert.deepEqual(approveRes.grant.pages, [1]);
	const grantId = approveRes.grant.id;

	// 9. Seller revokes access grant
	const revokeRes = expectStatus(await api(`/marketplace/grants/${grantId}/revoke`, {
		token: seller.token,
		method: 'POST',
	}), 200);
	assert.equal(revokeRes.success, true);
	assert.ok(revokeRes.grant.revokedAt);

	// 10. Test rejection workflow: Buyer submits second request now that previous is approved
	const req2 = expectStatus(await api('/marketplace/requests', {
		token: buyer.token,
		method: 'POST',
		json: { reference: listing.reference, message: 'Second request' },
	}), 201);

	const rejectRes = expectStatus(await api(`/marketplace/requests/${req2.request.id}/reject`, {
		token: seller.token,
		method: 'POST',
	}), 200);
	assert.equal(rejectRes.success, true);
	assert.equal(rejectRes.request.status, 'rejected');
});
