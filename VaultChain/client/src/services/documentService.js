import { API_BASE_URL } from '../constants/api';
import { authService } from './authService';

async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers: { Authorization: `Bearer ${authService.getToken()}`, ...options.headers },
	});
	const data = response.status === 204 ? null : await response.json();
	if (!response.ok) throw new Error(data?.message || 'Document request failed');
	return data;
}

async function list(filters = {}) {
	const query = new URLSearchParams();
	for (const [name, value] of Object.entries(filters)) {
		if (value) query.set(name, value);
	}
	const suffix = query.size ? `?${query}` : '';
	return (await request(`/documents${suffix}`)).documents;
}

async function upload(file) {
	const body = new FormData();
	body.append('file', file);
	return (await request('/documents', { method: 'POST', body })).document;
}

async function get(id) {
	return (await request(`/documents/${id}`)).document;
}

async function getOcr(id) {
	return (await request(`/documents/${id}/ocr`)).ocr;
}

async function rerunOcr(id) {
	return (await request(`/documents/${id}/ocr`, { method: 'POST' })).document;
}

async function verify(id, referenceDocumentId) {
	return (await request(`/documents/${id}/verify`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ referenceDocumentId }),
	})).verification;
}

async function getReport(id) {
	return (await request(`/documents/${id}/report`)).history;
}

async function remove(id) {
	return request(`/documents/${id}`, { method: 'DELETE' });
}

async function getContentObjectUrl(id) {
	const response = await fetch(`${API_BASE_URL}/documents/${id}/content`, {
		headers: { Authorization: `Bearer ${authService.getToken()}` },
	});
	if (!response.ok) {
		let message = 'Unable to load document preview';
		try { message = (await response.json()).message || message; } catch { /* Empty response. */ }
		throw new Error(message);
	}
	return URL.createObjectURL(await response.blob());
}

async function getPreviewObjectUrl(id) {
	const response = await fetch(`${API_BASE_URL}/documents/${id}/preview`, {
		headers: { Authorization: `Bearer ${authService.getToken()}` },
	});
	if (!response.ok) {
		let message = 'Unable to load document preview';
		try { message = (await response.json()).message || message; } catch { /* Empty response. */ }
		throw new Error(message);
	}
	return URL.createObjectURL(await response.blob());
}

export const documentService = { list, upload, get, getOcr, rerunOcr, verify, getReport, remove, getContentObjectUrl, getPreviewObjectUrl };
