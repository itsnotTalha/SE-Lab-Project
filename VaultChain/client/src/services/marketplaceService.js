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

function buildQuery(filters = {}) {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(filters)) {
		if (value !== '' && value != null) {
			params.set(key, value);
		}
	}

	const query = params.toString();

	return query ? `?${query}` : '';
}

async function getListings(filters) {
	const data = await request(`/marketplace/listings${buildQuery(filters)}`);

	return { listings: data.listings, pagination: data.pagination };
}

async function getListingById(id) {
	const data = await request(`/marketplace/listings/${id}`);
	return data.listing;
}

async function getMyListings() {
	const data = await request('/marketplace/listings/mine');
	return data.listings;
}

async function getListableAssets() {
	const data = await request('/marketplace/listable-assets');
	return data.assets;
}

async function getTrades() {
	const data = await request('/marketplace/trades');
	return data.trades;
}

async function createListing(payload) {
	const data = await request('/marketplace/listings', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return data.listing;
}

async function placeBid(id, amount) {
	return request(`/marketplace/listings/${id}/bids`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ amount }),
	});
}

async function getBids(id) {
	const data = await request(`/marketplace/listings/${id}/bids`);
	return data.bids;
}

async function cancelAuction(id) {
	const data = await request(`/marketplace/listings/${id}/cancel`, { method: 'POST' });
	return data.listing;
}

async function fractionalizeAsset(assetId, totalShares) {
	return request(`/marketplace/assets/${assetId}/fractionalize`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ totalShares }),
	});
}

async function getShares(assetId) {
	return request(`/marketplace/assets/${assetId}/shares`);
}

async function updateListing(id, { price, status, description }) {
	const data = await request(`/marketplace/listings/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ price, status, description }),
	});
	return data.listing;
}

async function deleteListing(id) {
	const data = await request(`/marketplace/listings/${id}`, {
		method: 'DELETE',
	});
	return data.listing;
}

async function buyListing(id) {
	const data = await request(`/marketplace/listings/${id}/buy`, {
		method: 'POST',
	});
	return data.purchase;
}

export const marketplaceService = {
	getListings,
	getListingById,
	getMyListings,
	getListableAssets,
	getTrades,
	createListing,
	updateListing,
	deleteListing,
	buyListing,
	placeBid,
	getBids,
	cancelAuction,
	fractionalizeAsset,
	getShares,
};
