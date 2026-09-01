import { API_BASE_URL } from '../constants/api';
import { authService } from './authService';

async function request(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}/admin${path}`, {
		...options,
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authService.getToken()}`, ...options.headers },
	});
	const data = await response.json();
	if (!response.ok) throw new Error(data.message || 'Admin request failed');
	return data;
}

export const adminService = {
	getOverview: async () => (await request('/overview')).overview,
	getUsers: async () => (await request('/users')).users,
	getTransactions: async () => (await request('/transactions')).transactions,
	getLogs: async () => (await request('/logs')).logs,
	getSettings: async () => (await request('/settings')).settings,
	updateCommission: async (percentage) => request('/settings/marketplace-commission', { method: 'PATCH', body: JSON.stringify({ percentage }) }),
	updateUser: async (id, changes) => (await request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })).user,
};
