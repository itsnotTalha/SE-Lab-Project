const jwt = require('jsonwebtoken');

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
		next();
	} catch (error) {
		error.status = 401;
		error.message = 'Invalid or expired token';
		next(error);
	}
}

module.exports = { authenticateToken };