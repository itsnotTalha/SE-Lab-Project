const { run, get, all, withTransaction } = require('../database/database');

// Every function accepts an optional `client` so it can either run on its own
// or take part in a caller's transaction (see database.withTransaction). The
// marketplace settlement relies on this: it debits the buyer and credits the
// seller inside the same transaction that moves the asset's ownership.
const defaultClient = { run, get, all };

function mapWalletRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		userId: row.user_id,
		balance: row.balance,
		currency: 'Credits',
		createdAt: row.created_at,
	};
}

function mapTransactionRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		walletId: row.wallet_id,
		type: row.type,
		amount: row.amount,
		description: row.description,
		referenceId: row.reference_id,
		createdAt: row.created_at,
	};
}

async function getWalletByUserId(userId, client = defaultClient) {
	const row = await client.get(
		`SELECT id, user_id, balance, created_at
		 FROM wallets
		 WHERE user_id = ?
		 LIMIT 1`,
		[userId]
	);

	return mapWalletRow(row);
}

async function getWalletById(walletId, client = defaultClient) {
	const row = await client.get(
		`SELECT id, user_id, balance, created_at
		 FROM wallets
		 WHERE id = ?
		 LIMIT 1`,
		[walletId]
	);

	return mapWalletRow(row);
}

async function getTransactionsByWalletId(walletId, client = defaultClient) {
	const rows = await client.all(
		`SELECT id, wallet_id, type, amount, description, reference_id, created_at
		 FROM wallet_transactions
		 WHERE wallet_id = ?
		 ORDER BY created_at DESC, id DESC`,
		[walletId]
	);

	return rows.map(mapTransactionRow);
}

/**
 * Applies `signedAmount` to a wallet balance and writes the matching ledger
 * row. Refuses to take a balance below zero, so a debit can never overdraw.
 *
 * Must be called with the `client` of an open transaction.
 */
async function applyBalanceChange({ walletId, type, signedAmount, amount, description, referenceId }, client) {
	if (!client) {
		throw new Error('applyBalanceChange must run inside a transaction');
	}

	const wallet = await client.get('SELECT id, balance FROM wallets WHERE id = ? LIMIT 1', [walletId]);

	if (!wallet) {
		const error = new Error('Wallet not found');
		error.status = 404;
		throw error;
	}

	// Balances are rounded to whole credit cents so repeated arithmetic on
	// SQLite REAL columns cannot drift (for example 0.1 + 0.2).
	const newBalance = Math.round((wallet.balance + signedAmount) * 100) / 100;

	if (newBalance < 0) {
		const error = new Error('Insufficient wallet balance');
		error.status = 400;
		throw error;
	}

	await client.run('UPDATE wallets SET balance = ? WHERE id = ?', [newBalance, walletId]);

	const transactionResult = await client.run(
		`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
		 VALUES (?, ?, ?, ?, ?)`,
		[walletId, type, amount, description || null, referenceId || null]
	);

	const transactionRow = await client.get(
		`SELECT id, wallet_id, type, amount, description, reference_id, created_at
		 FROM wallet_transactions
		 WHERE id = ?
		 LIMIT 1`,
		[transactionResult.lastID]
	);

	return {
		wallet: await getWalletById(walletId, client),
		transaction: mapTransactionRow(transactionRow),
	};
}

async function createTransaction({ walletId, type, signedAmount, amount, description, referenceId }) {
	return withTransaction((client) =>
		applyBalanceChange({ walletId, type, signedAmount, amount, description, referenceId }, client)
	);
}

module.exports = {
	getWalletByUserId,
	getWalletById,
	getTransactionsByWalletId,
	applyBalanceChange,
	createTransaction,
};
