const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { after, before, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-doc-verify-'));
const documentDirectory = path.join(testDirectory, 'documents');
process.env.DATABASE_PATH = path.join(testDirectory, 'documents.sqlite');
process.env.DOCUMENT_UPLOAD_DIRECTORY = documentDirectory;
process.env.JWT_SECRET = 'vaultchain-doc-verify-secret';

const app = require('../src/app');
const { database } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/initDatabase');
const { encryptBuffer, decryptBuffer } = require('../src/services/encryption/encryptionService');

let server;
let baseUrl;

function digitalPdf(text, meta = '') {
	const content = `BT /F1 12 Tf 50 720 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`;
	const objects = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
		`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
	];
	let pdf = `%PDF-1.4\n${meta ? `% ${meta}\n` : ''}`;
	const offsets = [0];
	objects.forEach((object, index) => {
		offsets.push(Buffer.byteLength(pdf));
		pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
	});
	const xref = Buffer.byteLength(pdf);
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
	return Buffer.from(pdf);
}

function uploadForm(name, buffer) {
	const form = new FormData();
	form.set('file', new Blob([buffer], { type: 'application/pdf' }), name);
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
	return { status: response.status, body };
}

before(async () => {
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

test('document semantic verification, report generation, and AES-256 secure vault storage', async () => {
	const user = (await api('/auth/register', {
		method: 'POST',
		json: { fullName: 'Vault Verifier', email: 'verifier@example.test', password: 'VerifyPassword123!' },
	})).body;

	// 1. Upload original document
	const docA = (await api('/documents', {
		token: user.token,
		method: 'POST',
		form: uploadForm('certificate-v1.pdf', digitalPdf('Name: Tanvir Rahman Certificate ID: 12345 Department: CSE University: UIU')),
	})).body.document;
	assert.equal(docA.ocrStatus, 'completed');

	// 2. Upload modified document
	const docB = (await api('/documents', {
		token: user.token,
		method: 'POST',
		form: uploadForm('certificate-v2.pdf', digitalPdf('Name: Tanvir Rahman Certificate ID: 12345 Department: Computer Science University: UIU')),
	})).body.document;
	assert.equal(docB.ocrStatus, 'completed');

	// 3. Upload completely unrelated document
	const docC = (await api('/documents', {
		token: user.token,
		method: 'POST',
		form: uploadForm('invoice.pdf', digitalPdf('INVOICE Total Amount USD 995 Date 2026-09-24 Items: Cloud Storage Server Hosting')),
	})).body.document;
	assert.equal(docC.ocrStatus, 'completed');

	// 4. Verify modified document (docB against docA)
	const verifyRes = await api(`/documents/${docB.id}/verify`, {
		token: user.token,
		method: 'POST',
		json: { targetDocumentId: docA.id },
	});
	assert.equal(verifyRes.status, 200);
	assert.equal(verifyRes.body.success, true);
	assert.equal(verifyRes.body.verification.status, 'modified');
	assert.ok(verifyRes.body.verification.similarityScore > 0.5);
	assert.equal(verifyRes.body.verification.sha256Match, false);

	// 5. Fetch report via GET /api/documents/:id/report
	const reportRes = await api(`/documents/${docB.id}/report`, { token: user.token });
	assert.equal(reportRes.status, 200);
	assert.equal(reportRes.body.report.hasReport, true);
	assert.equal(reportRes.body.report.status, 'modified');
	assert.ok(reportRes.body.report.report.evidence.similarityPercentage);

	// 6. Verify unrelated document (docC against docA)
	const verifyUnrelated = await api(`/documents/${docC.id}/verify`, {
		token: user.token,
		method: 'POST',
		json: { targetDocumentId: docA.id },
	});
	assert.equal(verifyUnrelated.status, 200);
	assert.equal(verifyUnrelated.body.verification.status, 'unknown');
	assert.ok(verifyUnrelated.body.verification.similarityScore < 0.35);

	// 7. Secure Vault AES-256-GCM encryption
	const vaultRes = await api(`/documents/${docA.id}/vault`, {
		token: user.token,
		method: 'POST',
		json: {},
	});
	assert.equal(vaultRes.status, 201);
	assert.equal(vaultRes.body.vault.algorithm, 'aes-256-gcm');
	assert.ok(vaultRes.body.vault.iv);
	assert.ok(vaultRes.body.vault.authTag);

	// 8. Check vault status
	const vaultStatusRes = await api(`/documents/${docA.id}/vault`, { token: user.token });
	assert.equal(vaultStatusRes.status, 200);
	assert.equal(vaultStatusRes.body.vaultStatus.isVaulted, true);
	assert.equal(vaultStatusRes.body.vaultStatus.vaultItem.algorithm, 'aes-256-gcm');

	// 9. Verify AES-256-GCM cipher roundtrip
	const testPayload = Buffer.from('Confidential Vault Document Content 12345');
	const encrypted = encryptBuffer(testPayload, 'custom-vault-key-test');
	assert.notDeepEqual(encrypted.cipherText, testPayload);
	const decrypted = decryptBuffer(encrypted.cipherText, encrypted.iv, encrypted.authTag, 'custom-vault-key-test');
	assert.deepEqual(decrypted, testPayload);
});
