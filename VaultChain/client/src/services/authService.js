import { API_BASE_URL, AUTH_TOKEN_KEY } from '../constants/api';

function getToken() {
	return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setToken(token) {
	localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearToken() {
	localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function request(path, options) {
	const response = await fetch(`${API_BASE_URL}${path}`, options);
	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || 'Request failed');
	}

	return data;
}

async function login({ email, password }) {
	const data = await request('/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password }),
	});

	setToken(data.token);
	return data.user;
}

async function register({ fullName, email, password }) {
	const data = await request('/auth/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ fullName, email, password }),
	});

	setToken(data.token);
	return data.user;
}

async function getCurrentUser() {
	const data = await request('/auth/me', {
		headers: { Authorization: `Bearer ${getToken()}` },
	});

	return {
		id: data.user.id,
		fullName: data.user.fullName || data.user.full_name,
		email: data.user.email,
		role: data.user.role,
		createdAt: data.user.createdAt || data.user.created_at,
	};
}

function logout() {
	clearToken();
}

function getCurrentUserId() {
	const token = getToken();

	if (!token) {
		return null;
	}

	try {
		const payload = JSON.parse(atob(token.split('.')[1]));
		return payload.id ?? null;
	} catch {
		return null;
	}
}

export const authService = {
	login,
	register,
	logout,
	getCurrentUser,
	getCurrentUserId,
	getToken,
	isAuthenticated: () => Boolean(getToken()),
};
