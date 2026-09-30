const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-recovery-'));
process.env.DATABASE_PATH = path.join(directory, 'test.sqlite');
process.env.JWT_SECRET = 'recovery-test-secret';
const { database, run } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/init');
const auth = require('../src/services/auth/authService');
const recovery = require('../src/services/auth/recoveryService');
const app = require('../src/app');
let server, base, serial = 0;
const password = 'Original-Password-42!';
const details = { currentPassword: password, question: 'first_pet', answer: ' Captain   Snow ', birthDate: '2000-02-29' };
async function account() { return auth.register({ fullName: 'Recovery Test', email: `recovery${++serial}@example.test`, password }); }
function payload(user, code, extra = {}) { return { identifier: user.email, question: 'first_pet', answer: 'captain snow', birthDate: '2000-02-29', recoveryCode: code, newPassword: 'New-Password-42!', ...extra }; }
async function request(route, method = 'GET', body, token) {
 const response = await fetch(`${base}${route}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
 return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
}
before(async () => {
 await initializeDatabase();
 server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
 base = `http://127.0.0.1:${server.address().port}/api/auth`;
});
after(async () => {
 await new Promise((resolve) => server.close(resolve));
 await new Promise((resolve) => database.close(resolve));
 fs.rmSync(directory, { recursive: true, force: true });
});
test('setup requires authentication/current password and validates question and date', async () => {
 const a = await account();
 assert.equal((await request('/recovery', 'PUT', details)).status, 401);
 await assert.rejects(recovery.saveSettings(a.user.id, { ...details, currentPassword: 'wrong' }), { status: 401 });
 for (const override of [{ question: 'unknown' }, { birthDate: '2001-02-29' }, { birthDate: '2999-01-01' }, { answer: ' ' }]) {
  await assert.rejects(recovery.saveSettings(a.user.id, { ...details, ...override }), { status: 400 });
 }
});
test('stores only hashes, exposes only status and question, and replaces old code', async () => {
 const a = await account();
 const first = await recovery.saveSettings(a.user.id, details);
 const second = await request('/recovery', 'PUT', details, a.token);
 assert.equal(second.status, 200); assert.equal(second.cache, 'no-store');
 assert.notEqual(first.recoveryCode, second.body.recoveryCode);
 const settings = await request('/recovery', 'GET', undefined, a.token);
 assert.deepEqual(Object.keys(settings.body).sort(), ['enabled', 'question', 'questions']);
 assert.equal(settings.body.enabled, true);
 const row = await new Promise((resolve, reject) => database.get('SELECT * FROM users WHERE id = ?', [a.user.id], (err, row) => err ? reject(err) : resolve(row)));
 assert.match(row.recovery_answer_hash, /^\$2/); assert.match(row.recovery_birth_date_hash, /^\$2/);
 assert.equal(row.recovery_code_hash.length, 64);
 assert.ok(!JSON.stringify(row).includes('2000-02-29'));
 await assert.rejects(recovery.resetPassword(payload(a.user, first.recoveryCode)), { status: 400 });
});
test('wrong details, no setup, unknown and suspended accounts cannot reset', async () => {
 const a = await account(); const setup = await recovery.saveSettings(a.user.id, details);
 const attempts = [{ answer: 'wrong' }, { birthDate: '2000-03-01' }, { question: 'first_school' }, { recoveryCode: '' }];
 for (const extra of attempts) await assert.rejects(recovery.resetPassword(payload(a.user, setup.recoveryCode, extra)), /Unable to recover/);
 await run("UPDATE users SET status = 'suspended' WHERE id = ?", [a.user.id]);
 await assert.rejects(recovery.resetPassword(payload(a.user, setup.recoveryCode)), /Unable to recover/);
 const b = await account();
 await assert.rejects(recovery.resetPassword(payload(b.user, setup.recoveryCode)), /Unable to recover/);
 await assert.rejects(recovery.resetPassword(payload({ email: 'unknown@example.test' }, setup.recoveryCode)), /Unable to recover/);
});
test('reset consumes code atomically, revokes sessions, and preserves profile and wallet', async () => {
 const a = await account(); const setup = await recovery.saveSettings(a.user.id, details);
 await run('UPDATE wallets SET balance = 123 WHERE user_id = ?', [a.user.id]);
 const reset = await request('/forgot-password', 'POST', payload(a.user, setup.recoveryCode.toLowerCase(), { identifier: `@${a.user.username.toUpperCase()}` }));
 assert.equal(reset.status, 200); assert.equal(reset.cache, 'no-store');
 assert.equal((await request('/me', 'GET', undefined, a.token)).status, 401);
 await assert.rejects(auth.login({ email: a.user.email, password }), { status: 401 });
 const login = await auth.login({ username: a.user.username, password: 'New-Password-42!' });
 assert.equal(login.user.id, a.user.id); assert.equal(login.user.email, a.user.email);
 assert.equal((await request('/me', 'GET', undefined, login.token)).status, 200);
 const wallet = await new Promise((resolve) => database.get('SELECT balance FROM wallets WHERE user_id = ?', [a.user.id], (_, row) => resolve(row)));
 assert.equal(wallet.balance, 123);
 assert.equal((await recovery.getSettings(a.user.id)).enabled, false);
 await assert.rejects(recovery.resetPassword(payload(a.user, setup.recoveryCode)), /Unable to recover/);
});
test('concurrent resets cannot reuse a code', async () => {
 const a = await account(); const setup = await recovery.saveSettings(a.user.id, details);
 const results = await Promise.allSettled([
  recovery.resetPassword(payload(a.user, setup.recoveryCode)),
  recovery.resetPassword(payload(a.user, setup.recoveryCode, { newPassword: 'Other-Password-42!' })),
 ]);
 assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
 assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
});
test('recovery attempts share a persistent limit across username/email aliases', async () => {
 const a = await account(); const setup = await recovery.saveSettings(a.user.id, details);
 for (let i = 0; i < 5; i++) await assert.rejects(recovery.resetPassword(payload(a.user, 'wrong', { identifier: i % 2 ? a.user.username : a.user.email })), { status: 400 });
 await assert.rejects(recovery.resetPassword(payload(a.user, setup.recoveryCode)), { status: 429 });
 await run('UPDATE account_recovery_attempts SET expires_at = 0');
 await recovery.resetPassword(payload(a.user, setup.recoveryCode));
});
