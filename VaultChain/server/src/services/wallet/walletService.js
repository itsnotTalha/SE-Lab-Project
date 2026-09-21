const walletRepository = require('../../repositories/walletRepository');

const CREDIT_TYPES = new Set(['deposit', 'sale']);
const DEBIT_TYPES = new Set(['withdrawal', 'purchase']);

// "purchase" and "sale" rows record a completed marketplace settlement, so
// they are written by the marketplace service inside the settlement
// transaction and are not accepted from this endpoint. Otherwise any user
// could credit themselves a sale that never happened.
const USER_SUBMITTABLE_TYPES = new Set(['deposit', 'withdrawal']);
const SETTLEMENT_ONLY_TYPES = new Set(['purchase', 'sale']);

const MAX_TRANSACTION_AMOUNT = 1_000_000;

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
	if (SETTLEMENT_ONLY_TYPES.has(type)) {
		const error = new Error(`${type} entries are recorded by the marketplace when a sale completes`);
		error.status = 403;
		throw error;
	}

	if (!USER_SUBMITTABLE_TYPES.has(type)) {
		const error = new Error('Type must be one of deposit, withdrawal');
		error.status = 400;
		throw error;
	}

	const numericAmount = Number(amount);

	if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
		const error = new Error('Amount must be a positive number');
		error.status = 400;
		throw error;
	}

	if (numericAmount > MAX_TRANSACTION_AMOUNT) {
		const error = new Error(`Amount must not be greater than ${MAX_TRANSACTION_AMOUNT}`);
		error.status = 400;
		throw error;
	}

	// Balances are held to two decimal places.
	return Math.round(numericAmount * 100) / 100;
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
