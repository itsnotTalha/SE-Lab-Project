import { API_BASE_URL } from '../constants/api';
import { authService } from './authService';

async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers: { Authorization: `Bearer ${authService.getToken()}`, ...options.headers },
	});
	const data = response.status === 204 ? null : await response.json();
	if (!response.ok) {
		const error = new Error(data?.message || 'Document request failed');
		error.status = response.status;
		error.duplicate = data?.duplicate || null;
		error.details = data?.details || null;
		throw error;
	}
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

async function upload(file, metadata = {}) {
	const body = new FormData();
	body.append('file', file);
	if (metadata.name) body.append('name', metadata.name);
	if (metadata.description) body.append('description', metadata.description);
	if (metadata.category) body.append('category', metadata.category);
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

async function verify(id, targetDocumentId) {
	return (await request(`/documents/${id}/verify`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ targetDocumentId }),
	})).verification;
}

async function getReport(id) {
	return (await request(`/documents/${id}/report`)).report;
}

async function vaultDocument(id, secret = null) {
	return (await request(`/documents/${id}/vault`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ secret }),
	})).vault;
}

async function getVaultStatus(id) {
	return (await request(`/documents/${id}/vault`)).vaultStatus;
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

async function getThumbnailObjectUrl(id) {
	const response = await fetch(`${API_BASE_URL}/documents/${id}/thumbnail`, {
		headers: { Authorization: `Bearer ${authService.getToken()}` },
	});
	if (!response.ok) {
		let message = 'Unable to load thumbnail';
		try { message = (await response.json()).message || message; } catch { /* Empty response. */ }
		throw new Error(message);
	}
	return URL.createObjectURL(await response.blob());
}

async function addToMarketplace(id, payload = {}) {
	return (await request(`/documents/${id}/marketplace`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})).listing;
}

async function downloadWithPassword(id, password, originalName) {
	const response = await fetch(`${API_BASE_URL}/documents/${id}/download`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authService.getToken()}`,
		},
		body: JSON.stringify({ password }),
	});

	if (!response.ok) {
		let message = 'Incorrect account password or download failed';
		try {
			const data = await response.json();
			if (data?.message) message = data.message;
		} catch { /* Empty */ }
		const error = new Error(message);
		error.status = response.status;
		throw error;
	}

	const blob = await response.blob();
	const downloadUrl = window.URL.createObjectURL(blob);
	const link = window.document.createElement('a');
	link.href = downloadUrl;
	link.download = originalName || 'document.pdf';
	window.document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 2000);
}

async function getPermissions(id) {
	const data = await request(`/documents/${id}/permissions`);
	return data.permissions;
}

async function getPageContentObjectUrl(id, page) {
	const response = await fetch(`${API_BASE_URL}/documents/${id}/pages/${page}`, {
		headers: { Authorization: `Bearer ${authService.getToken()}` },
	});
	if (!response.ok) {
		let message = `Unable to load document page ${page}`;
		try { message = (await response.json()).message || message; } catch { /* Empty */ }
		const error = new Error(message);
		error.status = response.status;
		throw error;
	}
	return URL.createObjectURL(await response.blob());
}

export const documentService = {
	list,
	upload,
	get,
	getOcr,
	rerunOcr,
	verify,
	getReport,
	vaultDocument,
	getVaultStatus,
	remove,
	getContentObjectUrl,
	getPageContentObjectUrl,
	getPermissions,
	getThumbnailObjectUrl,
	addToMarketplace,
	downloadWithPassword,
};
