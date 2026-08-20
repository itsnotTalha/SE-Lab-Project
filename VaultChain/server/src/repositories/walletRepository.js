const { database } = require('../database/database');

function run(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.run(sql, params, function onRun(error) {
			if (error) {
				reject(error);
				return;
			}

			resolve(this);
		});
	});
}

function get(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.get(sql, params, (error, row) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(row);
		});
	});
}

function all(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.all(sql, params, (error, rows) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(rows);
		});
	});
}

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

async function getWalletByUserId(userId) {
	const row = await get(
		`SELECT id, user_id, balance, created_at
		 FROM wallets
		 WHERE user_id = ?
		 LIMIT 1`,
		[userId]
	);

	return mapWalletRow(row);
}

async function getTransactionsByWalletId(walletId) {
	const rows = await all(
		`SELECT id, wallet_id, type, amount, description, reference_id, created_at
		 FROM wallet_transactions
		 WHERE wallet_id = ?
		 ORDER BY created_at DESC, id DESC`,
		[walletId]
	);

	return rows.map(mapTransactionRow);
}

async function createTransaction({ walletId, type, signedAmount, amount, description, referenceId }) {
	await run('BEGIN TRANSACTION');

	try {
		const wallet = await get('SELECT id, balance FROM wallets WHERE id = ? LIMIT 1', [walletId]);

		if (!wallet) {
			const error = new Error('Wallet not found');
			error.status = 404;
			throw error;
		}

		const newBalance = wallet.balance + signedAmount;

		if (newBalance < 0) {
			const error = new Error('Insufficient wallet balance');
			error.status = 400;
			throw error;
		}

		await run('UPDATE wallets SET balance = ? WHERE id = ?', [newBalance, walletId]);

		const transactionResult = await run(
			`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
			 VALUES (?, ?, ?, ?, ?)`,
			[walletId, type, amount, description || null, referenceId || null]
		);

		await run('COMMIT');

		const wallet_ = await get('SELECT id, user_id, balance, created_at FROM wallets WHERE id = ? LIMIT 1', [walletId]);
		const transactionRow = await get(
			`SELECT id, wallet_id, type, amount, description, reference_id, created_at
			 FROM wallet_transactions
			 WHERE id = ?
			 LIMIT 1`,
			[transactionResult.lastID]
		);

		return {
			wallet: mapWalletRow(wallet_),
			transaction: mapTransactionRow(transactionRow),
		};
	} catch (error) {
		try {
			await run('ROLLBACK');
		} catch (rollbackError) {
			void rollbackError;
		}

		throw error;
	}
}

module.exports = {
	getWalletByUserId,
	getTransactionsByWalletId,
	createTransaction,
};
