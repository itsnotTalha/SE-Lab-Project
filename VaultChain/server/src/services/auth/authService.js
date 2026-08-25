const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const authRepository = require('../../repositories/authRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'vaultchain-development-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

function createHttpError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

function normalizeEmail(email) {
	return String(email || '').trim().toLowerCase();
}

function buildTokenPayload(user) {
	return {
		id: user.id,
		email: user.email,
		role: user.role,
		jti: crypto.randomUUID(),
	};
}

function toPublicUser(user) {
	return {
		id: user.id,
		fullName: user.fullName,
		email: user.email,
		role: user.role,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}

function signToken(user) {
	return jwt.sign(buildTokenPayload(user), JWT_SECRET, {
		expiresIn: JWT_EXPIRES_IN,
	});
}

function validateRegisterInput(payload) {
	const fullName = String(payload.fullName || payload.full_name || '').trim();
	const email = normalizeEmail(payload.email);
	const password = String(payload.password || '');

	if (!fullName) {
		throw createHttpError(400, 'Full name is required');
	}

	if (!email) {
		throw createHttpError(400, 'Email is required');
	}

	if (!/^\S+@\S+\.\S+$/.test(email)) {
		throw createHttpError(400, 'Email is invalid');
	}

	if (!password) {
		throw createHttpError(400, 'Password is required');
	}

	if (password.length < 8) {
		throw createHttpError(400, 'Password must be at least 8 characters long');
	}

	return { fullName, email, password };
}

function validateLoginInput(payload) {
	const email = normalizeEmail(payload.email);
	const password = String(payload.password || '');

	if (!email) {
		throw createHttpError(400, 'Email is required');
	}

	if (!password) {
		throw createHttpError(400, 'Password is required');
	}

	return { email, password };
}

function validateProfileInput(payload) {
	const fullName = String(payload.fullName || payload.full_name || '').trim();
	const email = normalizeEmail(payload.email);

	if (!fullName) throw createHttpError(400, 'Full name is required');
	if (fullName.length > 100) throw createHttpError(400, 'Full name must be 100 characters or fewer');
	if (!email) throw createHttpError(400, 'Email is required');
	if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) throw createHttpError(400, 'Email is invalid');

	return { fullName, email };
}

function validatePasswordChangeInput(payload) {
	const currentPassword = String(payload.currentPassword || '');
	const newPassword = String(payload.newPassword || '');

	if (!currentPassword) throw createHttpError(400, 'Current password is required');
	if (!newPassword) throw createHttpError(400, 'New password is required');
	if (newPassword.length < 8) throw createHttpError(400, 'New password must be at least 8 characters long');
	if (newPassword === currentPassword) throw createHttpError(400, 'New password must be different from the current password');

	return { currentPassword, newPassword };
}

async function register(payload) {
	const { fullName, email, password } = validateRegisterInput(payload);

	const existingUser = await authRepository.findUserByEmail(email);

	if (existingUser) {
		throw createHttpError(409, 'Email is already registered');
	}

	const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
	const user = await authRepository.createUserWithWallet({
		fullName,
		email,
		passwordHash,
	});

	return {
		user: toPublicUser(user),
		token: signToken(user),
	};
}

async function login(payload) {
	const { email, password } = validateLoginInput(payload);
	const user = await authRepository.findUserByEmail(email);

	if (!user) {
		throw createHttpError(401, 'Invalid email or password');
	}

	const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

	if (!isPasswordValid) {
		throw createHttpError(401, 'Invalid email or password');
	}

	return {
		user: toPublicUser(user),
		token: signToken(user),
	};
}

async function getAuthenticatedUser(userId) {
	const user = await authRepository.findUserById(userId);

	if (!user) {
		throw createHttpError(404, 'User not found');
	}

	return {
		id: user.id,
		full_name: user.fullName,
		email: user.email,
		role: user.role,
		created_at: user.createdAt,
	};
}

async function updateProfile(userId, payload) {
	const currentUser = await authRepository.findUserById(userId);
	if (!currentUser) throw createHttpError(404, 'User not found');

	const { fullName, email } = validateProfileInput(payload);
	const emailOwner = await authRepository.findUserByEmail(email);
	if (emailOwner && emailOwner.id !== userId) throw createHttpError(409, 'Email is already registered');

	const user = await authRepository.updateUserProfile(userId, { fullName, email });
	return toPublicUser(user);
}

async function changePassword(userId, payload) {
	const { currentPassword, newPassword } = validatePasswordChangeInput(payload);
	const user = await authRepository.findUserById(userId);
	if (!user) throw createHttpError(404, 'User not found');

	const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
	if (!isCurrentPasswordValid) throw createHttpError(401, 'Current password is incorrect');

	const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
	await authRepository.updateUserPassword(userId, passwordHash);
}

async function verifyAccountPassword(userId, password) {
	const user = await authRepository.findUserById(userId);
	if (!user) throw createHttpError(404, 'User not found');
	return bcrypt.compare(String(password || ''), user.passwordHash);
}

module.exports = {
	register,
	login,
	getAuthenticatedUser,
	updateProfile,
	changePassword,
	verifyAccountPassword,
};
