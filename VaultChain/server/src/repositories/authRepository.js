const { database, withTransaction } = require('../database/database');

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

function mapUserRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		fullName: row.full_name,
		email: row.email,
		role: row.role,
		passwordHash: row.password_hash,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

async function findUserByEmail(email) {
	const row = await get(
		`SELECT id, full_name, email, password_hash, role, created_at, updated_at
		 FROM users
		 WHERE email = ?
		 LIMIT 1`,
		[email]
	);

	return mapUserRow(row);
}

async function findUserById(id) {
	const row = await get(
		`SELECT id, full_name, email, password_hash, role, created_at, updated_at
		 FROM users
		 WHERE id = ?
		 LIMIT 1`,
		[id]
	);

	return mapUserRow(row);
}

async function createUserWithWallet({ fullName, email, passwordHash, role = 'user' }) {
	// Runs through the shared transaction queue so it cannot interleave with
	// another transaction on this connection, such as a marketplace settlement.
	return withTransaction(async (client) => {
		const userResult = await client.run(
			`INSERT INTO users (full_name, email, password_hash, role)
			 VALUES (?, ?, ?, ?)`,
			[fullName, email, passwordHash, role]
		);

		const userId = userResult.lastID;

		await client.run('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', [userId, 0]);

		const createdUser = await client.get(
			`SELECT id, full_name, email, password_hash, role, created_at, updated_at
			 FROM users
			 WHERE id = ?
			 LIMIT 1`,
			[userId]
		);

		return mapUserRow(createdUser);
	});
}

module.exports = {
	findUserByEmail,
	findUserById,
	createUserWithWallet,
};