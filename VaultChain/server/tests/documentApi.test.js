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

function digitalPdf(text, pageCount = 1) {
	const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>'];
	const kids = [];
	for (let page = 0; page < pageCount; page++) {
		const pageId = objects.length + 1;
		kids.push(`${pageId} 0 R`);
		const content = `BT /F1 16 Tf 72 720 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`;
		objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`);
		objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
	}
	objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`;
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

	assert.equal((await api('/documents', { method: 'POST', form: uploadForm('private.png', 'image/png', OCR_IMAGE) })).status, 401);
	assert.equal((await api('/documents', { token: owner.token, method: 'POST', form: uploadForm('unsafe.txt', 'text/plain', Buffer.from('not allowed')) })).status, 400);

	const image = expectStatus(await api('/documents', { token: owner.token, method: 'POST', form: uploadForm('ocr-image.png', 'image/png', OCR_IMAGE) }), 201).document;
	assert.equal(image.ocrStatus, 'completed');
	assert.match(image.sha256, /^[a-f0-9]{64}$/);
	assert.match(image.extractedText, /System Architecture/i);
	assert.equal(image.pageCount, 1);
	assert.equal(image.ocrSource, 'local_tesseract');
	const savedOcr = expectStatus(await api(`/documents/${image.id}/ocr`, { token: owner.token }), 200).ocr;
	assert.equal(savedOcr.source, 'local_tesseract');
	assert.ok(savedOcr.selectionReason);
	assert.doesNotMatch(JSON.stringify(image), /filePath|storedName|ownerId/);

	const pdf = expectStatus(await api('/documents', { token: owner.token, method: 'POST', form: uploadForm('digital.pdf', 'application/pdf', digitalPdf('DIGITAL PDF TEXT')) }), 201).document;
	assert.equal(pdf.ocrStatus, 'completed');
	assert.match(pdf.extractedText, /DIGITAL PDF TEXT/);
	assert.equal(pdf.pageCount, 1);

	const failed = expectStatus(await api('/documents', { token: owner.token, method: 'POST', form: uploadForm('scan-limit.pdf', 'application/pdf', digitalPdf('', 11)) }), 201).document;
	assert.equal(failed.ocrStatus, 'failed');
	assert.match(failed.ocrError, /limited to 10 pages/i);
	assert.equal(expectStatus(await api(`/documents/${failed.id}`, { token: owner.token }), 200).document.id, failed.id);
	assert.equal((await api(`/documents/${failed.id}/content`, { token: owner.token })).status, 200);

	const ownerList = expectStatus(await api('/documents', { token: owner.token }), 200).documents;
	assert.deepEqual(ownerList.map((document) => document.id), [failed.id, pdf.id, image.id]);
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
	assert.deepEqual(ocrSearch.map((document) => document.id), [image.id]);
	assert.equal(ocrSearch[0].matchedOcrText, true);
	assert.match(ocrSearch[0].ocrSnippet, /System Architecture/i);
	assert.equal(Object.hasOwn(ocrSearch[0], 'extractedText'), false);
	assert.deepEqual(expectStatus(await api('/documents?search=does-not-exist', { token: owner.token }), 200).documents, []);
	assert.deepEqual(expectStatus(await api('/documents?search=%25_', { token: owner.token }), 200).documents, []);
	assert.deepEqual(expectStatus(await api('/documents?search=electricity', { token: owner.token }), 200).documents, []);
	const otherSearch = expectStatus(await api('/documents?search=electricity', { token: other.token }), 200).documents;
	assert.deepEqual(otherSearch.map((document) => document.id), [otherDocument.id]);
	assert.match(otherSearch[0].ocrSnippet, /ELECTRICITY INVOICE/);

	assert.deepEqual(expectStatus(await api('/documents?type=pdf', { token: owner.token }), 200).documents.map((document) => document.id), [failed.id, pdf.id]);
	assert.deepEqual(expectStatus(await api('/documents?type=image', { token: owner.token }), 200).documents.map((document) => document.id), [image.id]);
	assert.deepEqual(expectStatus(await api('/documents?ocrStatus=failed', { token: owner.token }), 200).documents.map((document) => document.id), [failed.id]);
	assert.deepEqual(expectStatus(await api('/documents?ocrStatus=completed', { token: owner.token }), 200).documents.map((document) => document.id), [pdf.id, image.id]);

	const ownerDashboard = expectStatus(await api('/dashboard/summary', { token: owner.token }), 200).summary;
	const otherDashboard = expectStatus(await api('/dashboard/summary', { token: other.token }), 200).summary;
	assert.equal(ownerDashboard.totalDocuments, 3);
	assert.deepEqual(ownerDashboard.recentDocuments.map((document) => document.id), [failed.id, pdf.id, image.id]);
	assert.equal(ownerDashboard.recentDocuments.some((document) => document.id === otherDocument.id), false);
	assert.equal(otherDashboard.totalDocuments, 1);
	assert.deepEqual(otherDashboard.recentDocuments.map((document) => document.id), [otherDocument.id]);
	assert.equal(JSON.stringify(ownerDashboard).includes('private-electricity'), false);

	for (const endpoint of [`/documents/${image.id}`, `/documents/${image.id}/content`, `/documents/${image.id}/ocr`]) {
		assert.equal((await api(endpoint, { token: other.token })).status, 404);
	}
	assert.equal((await api(`/documents/${image.id}/ocr`, { token: other.token, method: 'POST' })).status, 404);
	assert.equal((await api(`/documents/${image.id}`, { token: other.token, method: 'DELETE' })).status, 404);

	const content = await api(`/documents/${image.id}/content`, { token: owner.token });
	assert.equal(content.status, 200);
	assert.match(content.type, /image\/png/);
	assert.deepEqual(content.body, OCR_IMAGE);
	const ocr = expectStatus(await api(`/documents/${image.id}/ocr`, { token: owner.token }), 200).ocr;
	assert.equal(ocr.status, 'completed');
	assert.match(ocr.extractedText, /System Architecture/i);
	assert.ok(ocr.processedAt);

	for (const document of [image, pdf, failed]) {
		expectStatus(await api(`/documents/${document.id}`, { token: owner.token, method: 'DELETE' }), 204);
	}
	expectStatus(await api(`/documents/${otherDocument.id}`, { token: other.token, method: 'DELETE' }), 204);
	assert.deepEqual(expectStatus(await api('/documents', { token: owner.token }), 200).documents, []);
	assert.deepEqual(fs.readdirSync(documentDirectory), []);
});


test('metadata, duplicate races, content comparison, integrity changes, and report isolation', async () => {
	const register = async (email) => expectStatus(await api('/auth/register', { method: 'POST', json: { fullName: 'Verifier', email, password: 'DocumentPass123!' } }), 201).token;
	const token = await register('verify-doc@example.test');
	const other = await register('verify-other@example.test');
	const bytes = digitalPdf('Amount: 100    Approved');
	const upload = (buffer, name = 'invoice.pdf', auth = token) => api('/documents', { token: auth, method: 'POST', form: uploadForm(name, 'application/pdf', buffer) });
	const form = uploadForm('invoice.pdf', 'application/pdf', bytes);
	form.set('name', 'Invoice'); form.set('description', 'September invoice');
	const first = expectStatus(await api('/documents', { token, method: 'POST', form }), 201).document;
	assert.equal(first.description, 'September invoice');
	assert.match(first.metadataSha256, /^[a-f0-9]{64}$/);
	assert.match(first.textSha256, /^[a-f0-9]{64}$/);
	assert.match(first.extractedText, /100 {2,}Approved/);
	const verify = (id, targetDocumentId, auth = token) => api(`/documents/${id}/verify`, { token: auth, method: 'POST', json: { targetDocumentId } });
	assert.equal(expectStatus(await verify(first.id), 200).verification.status, 'original');
	assert.equal((await upload(bytes)).status, 409);
	const privateCopy = expectStatus(await upload(bytes, 'private-other.pdf', other), 201).document;
	assert.equal((await verify(first.id, privateCopy.id)).status, 404);
	assert.equal((await verify(first.id, undefined, other)).status, 404);
	assert.equal((await api(`/documents/${first.id}/report`, { token: other })).status, 404);
	const variant = expectStatus(await upload(Buffer.concat([bytes, Buffer.from('\n% revised metadata\n')]), 'variant.pdf'), 201).document;
	const comparison = expectStatus(await verify(first.id, variant.id), 200).verification;
	assert.equal(comparison.report.evidence.textMatch, true);
	assert.equal(comparison.report.evidence.sha256Match, false);
	assert.equal(comparison.report.evidence.metadataMatch, false);
	assert.equal(comparison.status, 'modified');
	const changed = expectStatus(await upload(digitalPdf('Amount: 900    Approved'), 'changed.pdf'), 201).document;
	assert.equal(expectStatus(await verify(first.id, changed.id), 200).verification.report.evidence.textMatch, false);
	const races = await Promise.all([upload(digitalPdf('Concurrent upload')), upload(digitalPdf('Concurrent upload'))]);
	assert.deepEqual(races.map((response) => response.status).sort(), [201, 409]);
	const repository = require('../src/repositories/documentRepository');
	const stored = await repository.getDocumentByIdAndOwnerId(first.id, JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).id);
	fs.appendFileSync(stored.filePath, '\n% tampered');
	assert.equal(expectStatus(await verify(first.id), 200).verification.report.evidence.sourceIntegrity.fileMatch, false);
	fs.writeFileSync(stored.filePath, bytes);
	await new Promise((resolve, reject) => database.run('UPDATE documents SET description = ? WHERE id = ?', ['Altered', first.id], (err) => err ? reject(err) : resolve()));
	assert.equal(expectStatus(await verify(first.id), 200).verification.report.evidence.sourceIntegrity.metadataMatch, false);
	fs.unlinkSync(stored.filePath);
	const missing = expectStatus(await verify(first.id), 200).verification;
	assert.equal(missing.status, 'modified');
	assert.equal(missing.report.evidence.sourceIntegrity.fileMatch, false);
	assert.equal(expectStatus(await api(`/documents/${first.id}/report`, { token }), 200).report.id, missing.id);
	const beforeFiles = fs.readdirSync(documentDirectory).sort();
	assert.equal((await upload(Buffer.from('not a PDF'))).status, 400);
	assert.deepEqual(fs.readdirSync(documentDirectory).sort(), beforeFiles);
});

test('mixed PDF retains all page boundaries, column spacing, scanned text, and original bytes', async () => {
	const token = expectStatus(await api('/auth/register', { method: 'POST', json: { fullName: 'Layout Owner', email: 'layout@example.test', password: 'DocumentPass123!' } }), 201).token;
	const bytes = fs.readFileSync(path.join(__dirname, 'fixtures/mixed-document.pdf'));
	const document = expectStatus(await api('/documents', { token, method: 'POST', form: uploadForm('mixed.pdf', 'application/pdf', bytes) }), 201).document;
	assert.equal(document.ocrStatus, 'completed');
	assert.equal(document.pageCount, 3);
	const pages = document.extractedText.split('\f');
	assert.equal(pages.length, 3);
	assert.match(pages[0], /FIRST PAGE {2,}AMOUNT/);
	assert.match(pages[0], /Invoice {2,}100/);
	assert.match(pages[1], /SCANNED SECOND PAGE/);
	assert.match(pages[2], /FINAL PAGE/);
	assert.deepEqual((await api(`/documents/${document.id}/content`, { token })).body, bytes);
	const retry = expectStatus(await api(`/documents/${document.id}/ocr`, { token, method: 'POST' }), 200).document;
	assert.equal(retry.textSha256, document.textSha256);
	assert.equal(retry.metadataSha256, document.metadataSha256);
});


test('damaged image data reports OCR failure without crashing the API and remains retryable', async () => {
	const token = expectStatus(await api('/auth/register', { method: 'POST', json: { fullName: 'Damaged Scan', email: 'damaged@example.test', password: 'DocumentPass123!' } }), 201).token;
	const damaged = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const document = expectStatus(await api('/documents', { token, method: 'POST', form: uploadForm('damaged.png', 'image/png', damaged) }), 201).document;
	assert.equal(document.ocrStatus, 'failed');
	assert.match(document.ocrError, /retry/i);
	assert.equal(document.textSha256, null);
	const retry = expectStatus(await api(`/documents/${document.id}/ocr`, { token, method: 'POST' }), 200).document;
	assert.equal(retry.ocrStatus, 'failed');
	assert.deepEqual((await api(`/documents/${document.id}/content`, { token })).body, damaged);
	assert.equal((await api('/documents', { token })).status, 200);
	expectStatus(await api(`/documents/${document.id}`, { token, method: 'DELETE' }), 204);
});
