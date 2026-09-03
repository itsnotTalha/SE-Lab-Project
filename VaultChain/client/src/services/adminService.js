import { API_BASE_URL } from '../constants/api';
import { authService } from './authService';

async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}/admin${path}`, {
		...options,
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getToken()}`, ...options.headers },
	});
	const data = response.status === 204 ? null : await response.json();
	if (!response.ok) throw new Error(data.message || 'Admin request failed');
	return data;
}

function query(range = {}) {
	const params = new URLSearchParams();
	if (range.range) params.set('range', range.range);
	if (range.from) params.set('from', range.from);
	if (range.to) params.set('to', range.to);
	const value = params.toString();
	return value ? `?${value}` : '';
}

export const adminService = {
	getOverview: async (range) => (await request(`/overview${query(range)}`)).overview,
	getRevenue: async (range) => (await request(`/revenue${query(range)}`)).revenue,
	getMarketplace: async (range) => (await request(`/marketplace${query(range)}`)).marketplace,
	getTransactions: async (range) => (await request(`/transactions${query(range)}`)).transactions,
	getUsers: async (range) => (await request(`/users${query(range)}`)).users,
	getAssets: async (range) => (await request(`/assets${query(range)}`)).assets,
	getVerification: async (range) => (await request(`/verification${query(range)}`)).verification,
	getAnalytics: async (range) => (await request(`/analytics${query(range)}`)).analytics,
	getSecurity: async () => (await request('/security')).security,
	getNotifications: async () => (await request('/notifications')).notifications,
	markNotificationsRead: async () => request('/notifications/read', { method: 'PATCH' }),
	getLogs: async () => (await request('/logs')).logs,
	getSettings: async () => (await request('/settings')).settings,
	updateMarketplaceSettings: async (settings) => request('/settings/marketplace', { method: 'PATCH', body: JSON.stringify(settings) }),
	updateUser: async (id, changes) => (await request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })).user,
	updateListing: async (id, status) => (await request(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })).listing,
	updateAsset: async (id, status) => (await request(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })).asset,
};
