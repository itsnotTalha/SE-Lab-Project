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
		throw new Error(data.message || 'Request failed');
	}

	return data;
}

async function getListings() {
	const data = await request('/marketplace/listings');
	return data.listings;
}

async function getListing(reference) {
	const data = await request(`/marketplace/listings/${reference}`);
	return data.listing;
}

async function createListing({ assetId, title, description, price }) {
	const data = await request('/marketplace/listings', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ assetId, title, description, price }),
	});
	return data.listing;
}

async function updateListing(reference, payload) {
	const data = await request(`/marketplace/listings/${reference}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return data.listing;
}

async function deleteListing(reference) {
	const data = await request(`/marketplace/listings/${reference}`, {
		method: 'DELETE',
	});
	return data.listing;
}

async function purchaseListing(reference) {
	const data = await request(`/marketplace/listings/${reference}/purchase`, { method: 'POST' });
	return data.receipt;
}

async function getContentObjectUrl(reference) {
	const response = await fetch(`${API_BASE_URL}/marketplace/listings/${reference}/content`, {
		headers: { Authorization: `Bearer ${authService.getToken()}` },
	});
	if (!response.ok) {
		let message = 'Unable to load listing preview';
		try { message = (await response.json()).message || message; } catch { /* Empty response. */ }
		throw new Error(message);
	}
	return URL.createObjectURL(await response.blob());
}

async function createAccessRequest(reference, message = '') {
	const data = await request(`/marketplace/listings/${reference}/requests`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ message }),
	});
	return data.request;
}

async function getAccessRequestStatus(reference) {
	return await request(`/marketplace/listings/${reference}/requests/status`);
}

async function getReceivedAccessRequests() {
	const data = await request('/marketplace/requests/received');
	return data.requests;
}

async function getSentAccessRequests() {
	const data = await request('/marketplace/requests/sent');
	return data.requests;
}

async function approveAccessRequest(requestId, payload = {}) {
	return await request(`/marketplace/requests/${requestId}/approve`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
}

async function rejectAccessRequest(requestId) {
	const data = await request(`/marketplace/requests/${requestId}/reject`, {
		method: 'POST',
	});
	return data.request;
}

async function revokeAccessGrant(grantId) {
	const data = await request(`/marketplace/grants/${grantId}/revoke`, {
		method: 'POST',
	});
	return data.grant;
}

export const marketplaceService = {
	getListings,
	getListing,
	createListing,
	updateListing,
	deleteListing,
	purchaseListing,
	getContentObjectUrl,
	createAccessRequest,
	getAccessRequestStatus,
	getReceivedAccessRequests,
	getSentAccessRequests,
	approveAccessRequest,
	rejectAccessRequest,
	revokeAccessGrant,
};
