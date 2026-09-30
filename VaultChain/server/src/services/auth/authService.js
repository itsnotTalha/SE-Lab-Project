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
		status: user.status,
		jti: crypto.randomUUID(),
		authVersion: user.authVersion || 0,
	};
}

function toPublicUser(user) {
	return {
		id: user.id,
		fullName: user.fullName,
		username: user.username,
		email: user.email,
		role: user.role,
		status: user.status,
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
 const identifier = String(payload.identifier ?? payload.email ?? payload.username ?? '').trim().toLowerCase();
 const password = String(payload.password || '');
 if (!identifier) throw createHttpError(400, 'Username or email is required');
 if (!password) throw createHttpError(400, 'Password is required');
 return { identifier, password };
}

function validateProfileInput(payload, currentUser) {
 const fullName = String(payload.fullName || payload.full_name || '').trim();
 const username = payload.username === undefined ? currentUser.username : String(payload.username).trim().toLowerCase();
 if (!fullName) throw createHttpError(400, 'Full name is required');
 if (fullName.length > 100) throw createHttpError(400, 'Full name must be 100 characters or fewer');
 if (Object.hasOwn(payload, 'email') && normalizeEmail(payload.email) !== currentUser.email) {
  throw createHttpError(400, 'Email address cannot be changed');
 }
 if (!/^[a-z0-9_]{3,30}$/.test(username)) throw createHttpError(400, 'Username must be 3–30 characters using letters, numbers, or underscores');
 if (/^user_\d+$/.test(username) && username !== currentUser.username) throw createHttpError(400, 'This username is reserved');
 return { fullName, username };
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
	const { identifier, password } = validateLoginInput(payload);
	const user = identifier.includes('@') && !identifier.startsWith('@')
		? await authRepository.findUserByEmail(identifier)
		: await authRepository.findUserByUsername(identifier.replace(/^@/, ''));

	if (!user) {
		throw createHttpError(401, 'Invalid username, email, or password');
	}

	const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

	if (!isPasswordValid) {
		throw createHttpError(401, 'Invalid username, email, or password');
	}
	if (user.status === 'suspended') {
		throw createHttpError(403, 'This account has been suspended');
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
		username: user.username,
		email: user.email,
		role: user.role,
		status: user.status,
		created_at: user.createdAt,
	};
}

async function updateProfile(userId, payload) {
	const currentUser = await authRepository.findUserById(userId);
	if (!currentUser) throw createHttpError(404, 'User not found');

 const { fullName, username } = validateProfileInput(payload, currentUser);
 let user;
 try {
  user = await authRepository.updateUserProfile(userId, { fullName, username });
 } catch (error) {
  if (error.code === 'SQLITE_CONSTRAINT' && /username/.test(error.message)) throw createHttpError(409, 'Username is already taken');
  throw error;
 }
	return toPublicUser(user);
}

async function changePassword(userId, payload) {
	const { currentPassword, newPassword } = validatePasswordChangeInput(payload);
	const user = await authRepository.findUserById(userId);
	if (!user) throw createHttpError(404, 'User not found');

	const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
	if (!isCurrentPasswordValid) throw createHttpError(401, 'Current password is incorrect');

	const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
	const result = await authRepository.updateUserPassword(userId, passwordHash, user.passwordHash);
	if (!result.changes) throw createHttpError(409, 'Account changed. Sign in again and retry.');
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
