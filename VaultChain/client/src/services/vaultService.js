import { API_BASE_URL } from '../constants/api';
import { authService } from './authService';

async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${authService.getToken()}`,
			...(options.body ? { 'Content-Type': 'application/json' } : {}),
			...options.headers,
		},
	});
	if (response.status === 204) return null;
	const data = await response.json();
	if (!response.ok) throw new Error(data.message || 'Vault request failed');
	return data;
}

async function getVaults() {
	const data = await request('/vaults');
	return { vaults: data.vaults, stats: data.stats };
}
async function getVault(reference) { return (await request(`/vaults/${encodeURIComponent(reference)}`)).vault; }
async function createVault(input) { return (await request('/vaults', { method: 'POST', body: JSON.stringify(input) })).vault; }
async function updateVault(reference, input) { return (await request(`/vaults/${encodeURIComponent(reference)}`, { method: 'PATCH', body: JSON.stringify(input) })).vault; }
async function deleteVault(reference) { return request(`/vaults/${encodeURIComponent(reference)}`, { method: 'DELETE' }); }
async function unlockVault(reference, password) { return (await request(`/vaults/${encodeURIComponent(reference)}/unlock`, { method: 'POST', body: JSON.stringify({ password }) })).vault; }
async function lockVault(reference) { return (await request(`/vaults/${encodeURIComponent(reference)}/lock`, { method: 'POST', body: JSON.stringify({}) })).vault; }
async function changePassword(reference, input) { return (await request(`/vaults/${encodeURIComponent(reference)}/change-password`, { method: 'POST', body: JSON.stringify(input) })).vault; }
async function resetPassword(reference, input) { return (await request(`/vaults/${encodeURIComponent(reference)}/reset-password`, { method: 'POST', body: JSON.stringify(input) })).vault; }
async function addAssets(reference, assetIds) { return (await request(`/vaults/${encodeURIComponent(reference)}/assets`, { method: 'POST', body: JSON.stringify({ assetIds }) })).vault; }
async function removeAsset(reference, assetId) { return (await request(`/vaults/${encodeURIComponent(reference)}/assets/${assetId}`, { method: 'DELETE' })).vault; }

export const vaultService = { getVaults, getVault, createVault, updateVault, deleteVault, unlockVault, lockVault, changePassword, resetPassword, addAssets, removeAsset };
