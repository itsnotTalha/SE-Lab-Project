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

async function getWallet() {
	const data = await request('/wallet');
	return data.wallet;
}

async function getTransactions() {
	const data = await request('/wallet/transactions');
	return data.transactions;
}

async function addTransaction({ type, amount, description }) {
	return request('/wallet/transactions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ type, amount, description }),
	});
}

export const walletService = {
	getWallet,
	getTransactions,
	addTransaction,
};
