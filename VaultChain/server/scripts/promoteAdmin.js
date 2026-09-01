const { database, run } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/initDatabase');

const VALID_ADMIN_ROLES = ['SUPER_ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN'];

async function main() {
	const email = String(process.argv[2] || '').trim().toLowerCase();
	const role = String(process.argv[3] || 'SUPER_ADMIN').trim().toUpperCase();
	if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Usage: npm run promote-admin -- user@example.com [ADMIN_ROLE]');
	if (!VALID_ADMIN_ROLES.includes(role)) throw new Error(`Role must be one of: ${VALID_ADMIN_ROLES.join(', ')}`);
	await initializeDatabase();
	const result = await run('UPDATE users SET role = ?, status = \'active\', updated_at = CURRENT_TIMESTAMP WHERE email = ?', [role, email]);
	if (!result.changes) throw new Error(`No VaultChain user found for ${email}`);
	console.log(`${email} now has the ${role} role.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => database.close());

