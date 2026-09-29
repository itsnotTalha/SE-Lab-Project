const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-auth-account-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'test.sqlite');
process.env.JWT_SECRET = 'vaultchain-auth-account-test-secret';

const { database } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/initDatabase');
const authService = require('../src/services/auth/authService');

let account;

before(async () => {
	// Simulate an existing account created before usernames were introduced.
 const legacySchema = fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8').replace('  username TEXT COLLATE NOCASE,\n', '');
 await new Promise((resolve, reject) => database.exec(legacySchema, (error) => error ? reject(error) : resolve()));
 await new Promise((resolve, reject) => database.run("INSERT INTO users (full_name, email, password_hash) VALUES ('Legacy User', 'legacy@example.test', 'unused')", (error) => error ? reject(error) : resolve()));
 await initializeDatabase();
	account = await authService.register({
		fullName: 'Original Name',
		email: 'original@example.test',
		password: 'OriginalPass123!',
	});
	await authService.register({
		fullName: 'Existing User',
		email: 'existing@example.test',
		password: 'ExistingPass123!',
	});
});

after(async () => {
	await new Promise((resolve) => database.close(resolve));
	fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('profile update normalizes values and returns the public account', async () => {
	const user = await authService.updateProfile(account.user.id, {
		fullName: '  Updated Name  ',
		username: '  Updated_Name  ',
	});

	assert.equal(user.fullName, 'Updated Name');
	assert.equal(user.email, 'original@example.test');
	assert.equal(user.username, 'updated_name');
	assert.equal((await authService.getAuthenticatedUser(account.user.id)).username, 'updated_name');
	assert.equal(user.passwordHash, undefined);
	const authenticatedUser = await authService.getAuthenticatedUser(account.user.id);
	assert.equal(authenticatedUser.full_name, 'Updated Name');
});

test('email changes are rejected without changing account fields', async () => {
 for (const email of ['other@example.test', 'not-an-email', '', null]) {
  await assert.rejects(() => authService.updateProfile(account.user.id, { fullName: 'Changed', email }),
   (error) => error.status === 400 && error.message === 'Email address cannot be changed');
 }
 const user = await authService.getAuthenticatedUser(account.user.id);
 assert.equal(user.email, 'original@example.test');
 assert.equal(user.full_name, 'Updated Name');
});

test('username validation, uniqueness and reserved generated names are enforced', async () => {
 for (const username of ['a', 'bad name', 'x'.repeat(31), 'user_999999']) {
  await assert.rejects(() => authService.updateProfile(account.user.id, { fullName: 'Updated Name', username }), (error) => error.status === 400);
 }
 const other = await authService.login({ email: 'existing@example.test', password: 'ExistingPass123!' });
 await assert.rejects(() => authService.updateProfile(other.user.id, { fullName: 'Existing User', username: 'UPDATED_NAME' }), (error) => error.status === 409);
 const updated = await authService.updateProfile(account.user.id, { fullName: 'Updated Name', email: ' ORIGINAL@EXAMPLE.TEST ' });
 assert.equal(updated.username, 'updated_name');
});

test('existing accounts receive a stable username during migration', async () => {
 const legacy = await authService.getAuthenticatedUser(1);
 assert.equal(legacy.username, 'user_1');
 assert.equal(legacy.email, 'legacy@example.test');
 assert.match(account.user.username, /^user_\d+$/);
});

test('password change requires the correct current password and enforces minimum length', async () => {
	await assert.rejects(
		() => authService.changePassword(account.user.id, { currentPassword: 'WrongPass123!', newPassword: 'NewStrongPass123!' }),
		(error) => error.status === 401 && error.message === 'Current password is incorrect'
	);
	await assert.rejects(
		() => authService.changePassword(account.user.id, { currentPassword: 'OriginalPass123!', newPassword: 'short' }),
		(error) => error.status === 400 && error.message === 'New password must be at least 8 characters long'
	);
});

test('password change invalidates the old password and accepts the new password', async () => {
	await authService.changePassword(account.user.id, {
		currentPassword: 'OriginalPass123!',
		newPassword: 'NewStrongPass123!',
	});

	await assert.rejects(
		() => authService.login({ email: 'original@example.test', password: 'OriginalPass123!' }),
		(error) => error.status === 401
	);
	const login = await authService.login({ email: 'original@example.test', password: 'NewStrongPass123!' });
	assert.equal(login.user.id, account.user.id);
});
