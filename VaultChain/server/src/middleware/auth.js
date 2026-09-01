const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'vaultchain-development-secret';

function authenticateToken(req, res, next) {
	const authorizationHeader = req.headers.authorization || '';
	const [scheme, token] = authorizationHeader.split(' ');

	if (scheme !== 'Bearer' || !token) {
		const error = new Error('Unauthorized');
		error.status = 401;
		next(error);
		return;
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		req.authTokenFingerprint = crypto.createHash('sha256').update(token).digest('hex');
		next();
	} catch (error) {
		error.status = 401;
		error.message = 'Invalid or expired token';
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
