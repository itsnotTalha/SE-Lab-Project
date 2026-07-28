const { asyncHandler } = require('../../middleware/asyncHandler');
const authService = require('../../services/auth/authService');

const register = asyncHandler(async (req, res) => {
	const result = await authService.register(req.body);

	res.status(201).json({
		success: true,
		message: 'User registered successfully',
		token: result.token,
		user: result.user,
	});
});

const login = asyncHandler(async (req, res) => {
	const result = await authService.login(req.body);

	res.status(200).json({
		success: true,
		message: 'Login successful',
		token: result.token,
		user: result.user,
	});
});

module.exports = {
	register,
	login,
};