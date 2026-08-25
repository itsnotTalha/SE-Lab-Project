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
		email: '  UPDATED@EXAMPLE.TEST ',
	});

	assert.equal(user.fullName, 'Updated Name');
	assert.equal(user.email, 'updated@example.test');
	assert.equal(user.passwordHash, undefined);
	const authenticatedUser = await authService.getAuthenticatedUser(account.user.id);
	assert.equal(authenticatedUser.full_name, 'Updated Name');
});

test('profile update rejects invalid and already registered emails', async () => {
	await assert.rejects(
		() => authService.updateProfile(account.user.id, { fullName: 'Updated Name', email: 'not-an-email' }),
		(error) => error.status === 400 && error.message === 'Email is invalid'
	);
	await assert.rejects(
		() => authService.updateProfile(account.user.id, { fullName: 'Updated Name', email: 'existing@example.test' }),
		(error) => error.status === 409 && error.message === 'Email is already registered'
	);
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
		() => authService.login({ email: 'updated@example.test', password: 'OriginalPass123!' }),
		(error) => error.status === 401
	);
	const login = await authService.login({ email: 'updated@example.test', password: 'NewStrongPass123!' });
	assert.equal(login.user.id, account.user.id);
});
