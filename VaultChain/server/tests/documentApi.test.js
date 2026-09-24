const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { after, before, test } = require('node:test');

const OCR_IMAGE = fs.readFileSync(path.resolve(__dirname, '../src/uploads/1785433463116-711316499.png'));

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-documents-'));
const documentDirectory = path.join(testDirectory, 'documents');
process.env.DATABASE_PATH = path.join(testDirectory, 'documents.sqlite');
process.env.DOCUMENT_UPLOAD_DIRECTORY = documentDirectory;
process.env.JWT_SECRET = 'vaultchain-document-test-secret';

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

function uploadForm(name, type, buffer) {
	const form = new FormData();
	form.set('file', new Blob([buffer], { type }), name);
	return form;
}

function expectStatus(response, status) {
	assert.equal(response.status, status, JSON.stringify(response.body));
	return response.body;
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

test('document upload, OCR, listing, ownership, content, failure preservation, and deletion', async () => {
	const owner = expectStatus(await api('/auth/register', {
		method: 'POST',
		json: { fullName: 'Document Owner', email: 'document-owner@example.test', password: 'DocumentPass123!' },
	}), 201);
	const other = expectStatus(await api('/auth/register', {
		method: 'POST',
		json: { fullName: 'Other User', email: 'document-other@example.test', password: 'DocumentPass123!' },
	}), 201);

	assert.equal((await api('/documents', { method: 'POST', form: uploadForm('private.pdf', 'application/pdf', digitalPdf('private')) })).status, 401);
	assert.equal((await api('/documents', { token: owner.token, method: 'POST', form: uploadForm('unsafe.txt', 'text/plain', Buffer.from('not allowed')) })).status, 400);
	assert.equal((await api('/documents', { token: owner.token, method: 'POST', form: uploadForm('unsafe.png', 'image/png', OCR_IMAGE) })).status, 400);

	const architectureDoc = expectStatus(await api('/documents', { token: owner.token, method: 'POST', form: uploadForm('architecture.pdf', 'application/pdf', digitalPdf('System Architecture Overview')) }), 201).document;
	assert.equal(architectureDoc.ocrStatus, 'completed');
	assert.match(architectureDoc.sha256, /^[a-f0-9]{64}$/);
	assert.match(architectureDoc.extractedText, /System Architecture/i);
	assert.equal(architectureDoc.pageCount, 1);
	assert.doesNotMatch(JSON.stringify(architectureDoc), /filePath|storedName|ownerId/);

	const pdf = expectStatus(await api('/documents', { token: owner.token, method: 'POST', form: uploadForm('digital.pdf', 'application/pdf', digitalPdf('DIGITAL PDF TEXT')) }), 201).document;
	assert.equal(pdf.ocrStatus, 'completed');
	assert.match(pdf.extractedText, /DIGITAL PDF TEXT/);
	assert.equal(pdf.pageCount, 1);

	const duplicateRes = await api('/documents', {
		token: owner.token,
		method: 'POST',
		form: uploadForm('duplicate-digital.pdf', 'application/pdf', digitalPdf('DIGITAL PDF TEXT')),
	});
	assert.equal(duplicateRes.status, 409);
	assert.equal(duplicateRes.body.duplicate?.isDuplicate, true);
	assert.equal(duplicateRes.body.duplicate?.duplicateType, 'exact');
	assert.equal(duplicateRes.body.duplicate?.exactMatch, true);

	const failed = expectStatus(await api('/documents', { token: owner.token, method: 'POST', form: uploadForm('broken.pdf', 'application/pdf', Buffer.from('%PDF-1.4 broken content')) }), 201).document;
	assert.equal(failed.ocrStatus, 'failed');
	assert.match(failed.ocrError, /retry/i);
	assert.equal(expectStatus(await api(`/documents/${failed.id}`, { token: owner.token }), 200).document.id, failed.id);
	assert.equal((await api(`/documents/${failed.id}/content`, { token: owner.token })).status, 200);

	const ownerList = expectStatus(await api('/documents', { token: owner.token }), 200).documents;
	assert.deepEqual(ownerList.map((document) => document.id), [failed.id, pdf.id, architectureDoc.id]);
	assert.equal(ownerList.some((document) => Object.hasOwn(document, 'extractedText')), false);
	assert.deepEqual(expectStatus(await api('/documents', { token: other.token }), 200).documents, []);

	const otherDocument = expectStatus(await api('/documents', {
		token: other.token,
		method: 'POST',
		form: uploadForm('private-electricity.pdf', 'application/pdf', digitalPdf('CONFIDENTIAL ELECTRICITY INVOICE')),
	}), 201).document;
	const filenameSearch = expectStatus(await api('/documents?search=digital', { token: owner.token }), 200).documents;
	assert.deepEqual(filenameSearch.map((document) => document.id), [pdf.id]);
	const ocrSearch = expectStatus(await api('/documents?search=architecture', { token: owner.token }), 200).documents;
	assert.deepEqual(ocrSearch.map((document) => document.id), [architectureDoc.id]);
	assert.equal(ocrSearch[0].matchedOcrText, true);
	assert.match(ocrSearch[0].ocrSnippet, /System Architecture/i);
	assert.equal(Object.hasOwn(ocrSearch[0], 'extractedText'), false);
	assert.deepEqual(expectStatus(await api('/documents?search=does-not-exist', { token: owner.token }), 200).documents, []);
	assert.deepEqual(expectStatus(await api('/documents?search=%25_', { token: owner.token }), 200).documents, []);
	assert.deepEqual(expectStatus(await api('/documents?search=electricity', { token: owner.token }), 200).documents, []);
	const otherSearch = expectStatus(await api('/documents?search=electricity', { token: other.token }), 200).documents;
	assert.deepEqual(otherSearch.map((document) => document.id), [otherDocument.id]);
	assert.match(otherSearch[0].ocrSnippet, /ELECTRICITY INVOICE/);

	assert.deepEqual(expectStatus(await api('/documents?type=pdf', { token: owner.token }), 200).documents.map((document) => document.id), [failed.id, pdf.id, architectureDoc.id]);
	assert.deepEqual(expectStatus(await api('/documents?ocrStatus=failed', { token: owner.token }), 200).documents.map((document) => document.id), [failed.id]);
	assert.deepEqual(expectStatus(await api('/documents?ocrStatus=completed', { token: owner.token }), 200).documents.map((document) => document.id), [pdf.id, architectureDoc.id]);

	const ownerDashboard = expectStatus(await api('/dashboard/summary', { token: owner.token }), 200).summary;
	const otherDashboard = expectStatus(await api('/dashboard/summary', { token: other.token }), 200).summary;
	assert.equal(ownerDashboard.totalDocuments, 3);
	assert.deepEqual(ownerDashboard.recentDocuments.map((document) => document.id), [failed.id, pdf.id, architectureDoc.id]);
	assert.equal(ownerDashboard.recentDocuments.some((document) => document.id === otherDocument.id), false);
	assert.equal(otherDashboard.totalDocuments, 1);
	assert.deepEqual(otherDashboard.recentDocuments.map((document) => document.id), [otherDocument.id]);
	assert.equal(JSON.stringify(ownerDashboard).includes('private-electricity'), false);

	for (const endpoint of [`/documents/${architectureDoc.id}`, `/documents/${architectureDoc.id}/content`, `/documents/${architectureDoc.id}/ocr`]) {
		assert.equal((await api(endpoint, { token: other.token })).status, 404);
	}
	assert.equal((await api(`/documents/${architectureDoc.id}/ocr`, { token: other.token, method: 'POST' })).status, 404);
	assert.equal((await api(`/documents/${architectureDoc.id}`, { token: other.token, method: 'DELETE' })).status, 404);

	const content = await api(`/documents/${architectureDoc.id}/content`, { token: owner.token });
	assert.equal(content.status, 200);
	assert.match(content.type, /application\/pdf/);
	const ocr = expectStatus(await api(`/documents/${architectureDoc.id}/ocr`, { token: owner.token }), 200).ocr;
	assert.equal(ocr.status, 'completed');
	assert.match(ocr.extractedText, /System Architecture/i);
	assert.ok(ocr.processedAt);

	for (const document of [architectureDoc, pdf, failed]) {
		expectStatus(await api(`/documents/${document.id}`, { token: owner.token, method: 'DELETE' }), 204);
	}
	expectStatus(await api(`/documents/${otherDocument.id}`, { token: other.token, method: 'DELETE' }), 204);
	assert.deepEqual(expectStatus(await api('/documents', { token: owner.token }), 200).documents, []);
	assert.deepEqual(fs.readdirSync(documentDirectory), []);
});
