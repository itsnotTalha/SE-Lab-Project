const walletRepository = require('../../repositories/walletRepository');

const CREDIT_TYPES = new Set(['deposit', 'sale']);
const DEBIT_TYPES = new Set(['withdrawal', 'purchase']);

async function getWalletOrThrow(userId) {
	const wallet = await walletRepository.getWalletByUserId(userId);

	if (!wallet) {
		const error = new Error('Wallet not found');
		error.status = 404;
		throw error;
	}

	return wallet;
}

async function getWallet(userId) {
	return getWalletOrThrow(userId);
}

async function getTransactions(userId) {
	const wallet = await getWalletOrThrow(userId);

	return walletRepository.getTransactionsByWalletId(wallet.id);
}

function validateTransactionInput({ type, amount }) {
	if (!CREDIT_TYPES.has(type) && !DEBIT_TYPES.has(type)) {
		const error = new Error('Type must be one of deposit, withdrawal, purchase, sale');
		error.status = 400;
		throw error;
	}

	const numericAmount = Number(amount);

	if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
		const error = new Error('Amount must be a positive number');
		error.status = 400;
		throw error;
	}

	return numericAmount;
}

async function addTransaction(userId, { type, amount, description, referenceId }) {
	const numericAmount = validateTransactionInput({ type, amount });
	const wallet = await getWalletOrThrow(userId);
	const signedAmount = CREDIT_TYPES.has(type) ? numericAmount : -numericAmount;

	return walletRepository.createTransaction({
		walletId: wallet.id,
		type,
		amount: numericAmount,
		signedAmount,
		description,
		referenceId,
	});
}

module.exports = {
	getWallet,
	getTransactions,
	addTransaction,
};
