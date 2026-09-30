const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { database, run } = require('../../database/database');
const authRepository = require('../../repositories/authRepository');

const QUESTIONS = [
  { id: 'first_pet', label: 'What was the name of your first pet?' },
  { id: 'childhood_friend', label: 'What was your childhood best friend’s first name?' },
  { id: 'first_school', label: 'What was the name of your first school?' },
  { id: 'childhood_nickname', label: 'What was your childhood nickname?' },
];
const FAILURE = 'Unable to recover this account. Check your recovery details or try again later.';
const dummyHash = bcrypt.hashSync('unmatched-recovery-value', 10);
const get = (sql, params = []) => new Promise((resolve, reject) => {
  database.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
});
function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
function normalizeAnswer(answer) { return String(answer || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(); }
// Pre-hashing avoids bcrypt's 72-byte truncation, including for Unicode answers.
function digest(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function normalizeCode(code) { return String(code || '').replace(/[\s-]/g, '').toUpperCase(); }
function validBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= new Date().toISOString().slice(0, 10);
}
async function consumeAttempt(key, limit) {
  const now = Date.now();
  await run('DELETE FROM account_recovery_attempts WHERE expires_at <= ?', [now]);
  const result = await run(`INSERT INTO account_recovery_attempts (attempt_key, attempts, expires_at)
    VALUES (?, 1, ?) ON CONFLICT(attempt_key) DO UPDATE SET attempts = attempts + 1
    WHERE attempts < ?`, [digest(key), now + 15 * 60 * 1000, limit]);
  if (!result.changes) fail(429, 'Too many recovery attempts. Please try again in 15 minutes.');
}
async function limitRequest(req, res, next) {
  res.set('Cache-Control', 'no-store');
  try { await consumeAttempt(`ip:${req.ip}`, 30); next(); } catch (error) { next(error); }
}
async function getSettings(userId) {
  const row = await get('SELECT recovery_question, recovery_code_hash FROM users WHERE id = ?', [userId]);
  return { enabled: Boolean(row?.recovery_code_hash), question: row?.recovery_question || '', questions: QUESTIONS };
}
async function saveSettings(userId, payload) {
  await consumeAttempt(`setup:${userId}`, 5);
  const user = await authRepository.findUserById(userId);
  if (!user || !await bcrypt.compare(String(payload.currentPassword || ''), user.passwordHash)) fail(401, 'Current password is incorrect');
  const answer = normalizeAnswer(payload.answer);
  const birthDate = String(payload.birthDate || '');
  if (!QUESTIONS.some(({ id }) => id === payload.question)) fail(400, 'Choose a security question');
  if (answer.length < 2 || answer.length > 200) fail(400, 'Security answer must contain 2–200 characters');
  if (!validBirthDate(birthDate)) fail(400, 'Enter a valid birth date that is not in the future');
  const code = crypto.randomBytes(16).toString('hex').toUpperCase().match(/.{4}/g).join('-');
  const [answerHash, birthDateHash] = await Promise.all([bcrypt.hash(digest(answer), 10), bcrypt.hash(digest(birthDate), 10)]);
  // Compare-and-set prevents an in-flight setup from overwriting a password reset.
  const result = await run(`UPDATE users SET recovery_question = ?, recovery_answer_hash = ?,
    recovery_birth_date_hash = ?, recovery_code_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND password_hash = ? AND auth_version = ?`,
  [payload.question, answerHash, birthDateHash, digest(normalizeCode(code)), userId, user.passwordHash, user.authVersion]);
  if (!result.changes) fail(409, 'Account changed. Sign in again and retry.');
  return { enabled: true, question: payload.question, recoveryCode: code };
}
async function resetPassword(payload) {
  const identifier = String(payload.identifier || '').trim().toLowerCase();
  if (!identifier || identifier.length > 254) fail(400, 'Enter your username or email');
  const newPassword = String(payload.newPassword || '');
  if (newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) fail(400, 'New password must be at least 8 characters and at most 72 bytes');
  const user = identifier.includes('@') && !identifier.startsWith('@')
    ? await authRepository.findUserByEmail(identifier)
    : await authRepository.findUserByUsername(identifier.replace(/^@/, ''));
  // Use the account ID so email/username aliases share one attempt limit.
  await consumeAttempt(`reset:${user ? user.id : identifier}`, 5);
  const row = user ? await get('SELECT * FROM users WHERE id = ?', [user.id]) : null;
  const [answerMatches, birthDateMatches] = await Promise.all([
    bcrypt.compare(digest(normalizeAnswer(payload.answer)), row?.recovery_answer_hash || dummyHash),
    bcrypt.compare(digest(String(payload.birthDate || '')), row?.recovery_birth_date_hash || dummyHash),
  ]);
  const codeHash = digest(normalizeCode(payload.recoveryCode));
  const codeMatches = crypto.timingSafeEqual(Buffer.from(codeHash), Buffer.from(row?.recovery_code_hash || '0'.repeat(64)));
  if (!row || row.status !== 'active' || !answerMatches || !birthDateMatches || !codeMatches || row.recovery_question !== payload.question) fail(400, FAILURE);
  if (await bcrypt.compare(newPassword, row.password_hash)) fail(400, 'Choose a password different from your current password');
  const passwordHash = await bcrypt.hash(newPassword, 10);
  // One atomic update consumes the code and invalidates all previously issued JWTs.
  const result = await run(`UPDATE users SET password_hash = ?, auth_version = auth_version + 1,
    recovery_code_hash = NULL, recovery_answer_hash = NULL, recovery_birth_date_hash = NULL,
    recovery_question = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'active' AND recovery_code_hash = ? AND password_hash = ?`,
  [passwordHash, user.id, codeHash, row.password_hash]);
  if (!result.changes) fail(400, FAILURE);
  return { message: 'Password reset successfully. Sign in and set up a new recovery code in Profile.' };
}
module.exports = { QUESTIONS, getSettings, saveSettings, resetPassword, limitRequest };
