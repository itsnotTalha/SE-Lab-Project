const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const authRepository = require('../repositories/authRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'vaultchain-development-secret';

async function authenticateToken(req, res, next) {
	const authorizationHeader = req.headers.authorization || '';
	const [scheme, token] = authorizationHeader.split(' ');

	if (scheme !== 'Bearer' || !token) {
		const error = new Error('Unauthorized');
		error.status = 401;
		next(error);
		return;
	}

	let decoded;
	try {
		decoded = jwt.verify(token, JWT_SECRET);
	} catch (error) {
		error.status = 401;
		error.message = 'Invalid or expired token';
		next(error);
		return;
	}

	try {
		const currentUser = await authRepository.findUserById(decoded.id);
		if (!currentUser) {
			const error = new Error('Account no longer exists');
			error.status = 401;
			throw error;
		}
		if (currentUser.status === 'suspended') {
			const error = new Error('This account has been suspended');
			error.status = 403;
			throw error;
		}

		// Identity comes from the signed token; mutable authorization state comes
		// from the database so promotions, demotions, and suspensions take effect
		// without waiting for the JWT to expire.
		req.user = {
			...decoded,
			id: currentUser.id,
			email: currentUser.email,
			role: currentUser.role,
			status: currentUser.status,
		};
		req.authTokenFingerprint = crypto.createHash('sha256').update(token).digest('hex');
		next();
	} catch (error) {
		next(error);
	}
}

function authorizeRoles(...roles) {
	const allowed = roles.map((role) => String(role).toUpperCase());
	return (req, res, next) => {
		if (!req.user || !allowed.includes(String(req.user.role || '').toUpperCase())) {
			const error = new Error('You do not have permission to perform this action');
			error.status = 403;
			next(error);
			return;
		}
		next();
	};
}

module.exports = { authenticateToken, authorizeRoles };
