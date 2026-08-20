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

async function getListingById(id) {
	const data = await request(`/marketplace/listings/${id}`);
	return data.listing;
}

async function createListing({ assetId, listingType, price }) {
	const data = await request('/marketplace/listings', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ assetId, listingType, price }),
	});
	return data.listing;
}

async function updateListing(id, { price, status }) {
	const data = await request(`/marketplace/listings/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ price, status }),
	});
	return data.listing;
}

async function deleteListing(id) {
	const data = await request(`/marketplace/listings/${id}`, {
		method: 'DELETE',
	});
	return data.listing;
}

export const marketplaceService = {
	getListings,
	getListingById,
	createListing,
	updateListing,
	deleteListing,
};
