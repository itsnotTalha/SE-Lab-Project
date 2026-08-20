const { asyncHandler } = require('../../middleware/asyncHandler');
const walletService = require('../../services/wallet/walletService');

const getWallet = asyncHandler(async (req, res) => {
	const wallet = await walletService.getWallet(req.user.id);

	res.status(200).json({
		success: true,
		wallet: {
			balance: wallet.balance,
			currency: wallet.currency,
		},
	});
});

const getTransactions = asyncHandler(async (req, res) => {
	const transactions = await walletService.getTransactions(req.user.id);

	res.status(200).json({
		success: true,
		transactions,
	});
});

const addTransaction = asyncHandler(async (req, res) => {
	const { type, amount, description, referenceId } = req.body;
	const result = await walletService.addTransaction(req.user.id, { type, amount, description, referenceId });

	res.status(201).json({
		success: true,
		message: 'Transaction recorded successfully',
		wallet: {
			balance: result.wallet.balance,
			currency: result.wallet.currency,
		},
		transaction: result.transaction,
	});
});

module.exports = {
	getWallet,
	getTransactions,
	addTransaction,
};
