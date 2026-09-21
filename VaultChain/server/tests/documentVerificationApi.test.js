const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { after, before, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-document-verification-api-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'verification.sqlite');
process.env.DOCUMENT_UPLOAD_DIRECTORY = path.join(testDirectory, 'documents');
process.env.JWT_SECRET = 'vaultchain-document-verification-test-secret';

const app = require('../src/app');
const { database } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/initDatabase');
const documentRepository = require('../src/repositories/documentRepository');

let server;
let baseUrl;

async function api(pathname, { token, method = 'GET', json } = {}) {
	const headers = {};
	if (token) headers.Authorization = `Bearer ${token}`;
	if (json !== undefined) headers['Content-Type'] = 'application/json';
	const response = await fetch(`${baseUrl}/api${pathname}`, {
		method,
		headers,
		body: json === undefined ? undefined : JSON.stringify(json),
	});
	return { status: response.status, body: await response.json() };
}

function expectStatus(response, status) {
	assert.equal(response.status, status, JSON.stringify(response.body));
	return response.body;
}

async function createDocument(ownerId, name, text = null) {
	const document = await documentRepository.createDocument({
		ownerId,
		originalName: name,
		storedName: name,
		filePath: path.join(testDirectory, name),
		mimeType: 'application/pdf',
		fileSize: 1,
		sha256Hash: 'a'.repeat(64),
	});
	if (text != null) {
		await documentRepository.saveOcrResult(document.id, ownerId, { text, confidence: 99, pageCount: 1 });
	}
	return document;
}

before(async () => {
	await initializeDatabase();
	server = app.listen(0, '127.0.0.1');
	await once(server, 'listening');
	baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
	if (server?.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
	await new Promise((resolve) => database.close(resolve));
	fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('document verification API classifies results and protects owner-scoped history', async () => {
	const owner = expectStatus(await api('/auth/register', {
		method: 'POST',
		json: { fullName: 'Verification Owner', email: 'verification-owner@example.test', password: 'DocumentPass123!' },
	}), 201);
	const other = expectStatus(await api('/auth/register', {
		method: 'POST',
		json: { fullName: 'Verification Other', email: 'verification-other@example.test', password: 'DocumentPass123!' },
	}), 201);

	const target = await createDocument(owner.user.id, 'target.pdf', 'Original contract text');
	const exactReference = await createDocument(owner.user.id, 'exact.pdf', ' original   contract\ntext ');
	const changedReference = await createDocument(owner.user.id, 'changed.pdf', 'Changed contract text');
	const pendingReference = await createDocument(owner.user.id, 'pending.pdf');
	const foreignReference = await createDocument(other.user.id, 'foreign.pdf', 'Original contract text');

	assert.equal((await api(`/documents/${target.id}/verify`, { method: 'POST', json: { referenceDocumentId: exactReference.id } })).status, 401);
	const original = expectStatus(await api(`/documents/${target.id}/verify`, {
		token: owner.token,
		method: 'POST',
		json: { referenceDocumentId: exactReference.id },
	}), 201).verification;
	assert.equal(original.status, 'original');
	assert.equal(original.semanticHashMatch, true);
	assert.equal(original.similarityScore, 1);

	const modified = expectStatus(await api(`/documents/${target.id}/verify`, {
		token: owner.token,
		method: 'POST',
		json: { referenceDocumentId: changedReference.id },
	}), 201).verification;
	assert.equal(modified.status, 'modified');
	assert.equal(modified.semanticHashMatch, false);
	assert.ok(modified.similarityScore > 0 && modified.similarityScore < 1);

	const unknown = expectStatus(await api(`/documents/${target.id}/verify`, {
		token: owner.token,
		method: 'POST',
		json: { referenceDocumentId: pendingReference.id },
	}), 201).verification;
	assert.equal(unknown.status, 'unknown');
	assert.equal(unknown.semanticHashMatch, null);
	assert.equal(unknown.similarityScore, null);

	assert.equal((await api(`/documents/${target.id}/verify`, {
		token: owner.token,
		method: 'POST',
		json: { referenceDocumentId: target.id },
	})).status, 400);
	assert.equal((await api(`/documents/${target.id}/verify`, {
		token: owner.token,
		method: 'POST',
		json: { referenceDocumentId: foreignReference.id },
	})).status, 404);
	assert.equal((await api(`/documents/${target.id}/report`, { token: other.token })).status, 404);

	const history = expectStatus(await api(`/documents/${target.id}/report`, { token: owner.token }), 200).history;
	assert.deepEqual(history.map((entry) => entry.status), ['unknown', 'modified', 'original']);
});
