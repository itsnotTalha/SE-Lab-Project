import { API_BASE_URL } from '../constants/api';
import { authService } from './authService';

async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${authService.getToken()}`,
			...options.headers,
		},
	});
	const data = await response.json();

	if (!response.ok) {
		const error = new Error(data.message || 'Request failed');
		error.status = response.status;
		throw error;
	}

	return data;
}

async function getAssets() {
	const data = await request('/assets');
	return data.assets;
}

async function getAsset(id) {
	const data = await request(`/assets/${id}`);
	return data.asset;
}

async function uploadAsset({ title, category, description, file }) {
	const formData = new FormData();
	formData.append('title', title);
	formData.append('category', category);
	formData.append('description', description);
	formData.append('file', file);
	return request('/assets/upload', { method: 'POST', body: formData });
}

async function checkOwnership(file) {
	const formData = new FormData();
	formData.append('file', file);
	const data = await request('/assets/check', { method: 'POST', body: formData });
	return data.result;
}

async function getMetadata(id) {
	const data = await request(`/assets/${id}/metadata`);
	return data.metadata;
}

async function getHashes(id) {
	const data = await request(`/assets/${id}/hash`);
	return data.hashes;
}

async function getContentObjectUrl(id) {
	const response = await fetch(`${API_BASE_URL}/assets/${id}/content`, {
		headers: { Authorization: `Bearer ${authService.getToken()}` },
	});

	if (!response.ok) {
		let message = 'Unable to load asset preview';
		try {
			const data = await response.json();
			message = data.message || message;
		} catch {
			// The server may return an empty response for a missing stored file.
		}
		throw new Error(message);
	}

	return URL.createObjectURL(await response.blob());
}

export const assetService = { getAssets, getAsset, uploadAsset, checkOwnership, getMetadata, getHashes, getContentObjectUrl };
