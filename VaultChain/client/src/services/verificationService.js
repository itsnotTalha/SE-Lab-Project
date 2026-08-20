import { API_BASE_URL } from '../constants/api';
import { authService } from './authService';

async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers: { Authorization: `Bearer ${authService.getToken()}`, ...options.headers },
	});
	const data = await response.json();
	if (!response.ok) throw new Error(data.message || 'Verification request failed');
	return data;
}

async function create(assetId, file) {
	const body = new FormData();
	body.append('assetId', assetId);
	body.append('file', file);
	return (await request('/verifications', { method: 'POST', body })).verification;
}

async function list() {
	return (await request('/verifications')).verifications;
}

async function get(reference) {
	return (await request(`/verifications/${encodeURIComponent(reference)}`)).verification;
}

export const verificationService = { create, list, get };
