const vaultRepository = require('../../repositories/vaultRepository');

const DEFAULT_UNLOCK_TTL_SECONDS = 10 * 60;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_ATTEMPT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_BLOCK_SECONDS = 15 * 60;

function createHttpError(status, message, code) {
	const error = new Error(message);
	error.status = status;
	error.code = code;
	return error;
}

function positiveInteger(name, fallback, maximum) {
	const configured = Number(process.env[name]);
	if (!Number.isFinite(configured) || configured <= 0) return fallback;
	return Math.min(Math.floor(configured), maximum);
}

function unlockTtlSeconds(vault) {
	const configured = Number(process.env.VAULT_UNLOCK_TTL_SECONDS);
	if (!Number.isFinite(configured) || configured <= 0) return vault?.autoLockMinutes ? vault.autoLockMinutes * 60 : DEFAULT_UNLOCK_TTL_SECONDS;
	return Math.min(Math.floor(configured), 24 * 60 * 60);
}

function rateLimitConfig() {
	return {
		maxAttempts: positiveInteger('VAULT_UNLOCK_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS, 100),
		windowSeconds: positiveInteger('VAULT_UNLOCK_WINDOW_SECONDS', DEFAULT_ATTEMPT_WINDOW_SECONDS, 24 * 60 * 60),
		blockSeconds: positiveInteger('VAULT_UNLOCK_BLOCK_SECONDS', DEFAULT_BLOCK_SECONDS, 24 * 60 * 60),
	};
}

function requireSessionFingerprint(tokenFingerprint) {
	if (!tokenFingerprint) throw createHttpError(401, 'Unauthorized');
	return tokenFingerprint;
}

function isFuture(expiresAt, now = Date.now()) {
	return Boolean(expiresAt) && new Date(expiresAt).getTime() > now;
}

async function getVaultAccess(vault, userId, tokenFingerprint) {
	if (!vault.passwordHash) {
		return { passwordProtected: false, isLocked: false, unlockExpiresAt: null };
	}
	if (!tokenFingerprint) {
		return { passwordProtected: true, isLocked: true, unlockExpiresAt: null };
	}
	const session = await vaultRepository.getUnlockSession(vault.id, userId, tokenFingerprint);
	if (!isFuture(session?.expires_at)) {
		if (session) await vaultRepository.deleteUnlockSession(vault.id, userId, tokenFingerprint);
		return { passwordProtected: true, isLocked: true, unlockExpiresAt: null };
	}
	return { passwordProtected: true, isLocked: false, unlockExpiresAt: session.expires_at };
}

async function grantVaultAccess(vault, userId, tokenFingerprint) {
	requireSessionFingerprint(tokenFingerprint);
	const expiresAt = new Date(Date.now() + unlockTtlSeconds(vault) * 1000).toISOString();
	await vaultRepository.deleteExpiredUnlockSessions(new Date().toISOString());
	await vaultRepository.upsertUnlockSession({ vaultId: vault.id, userId, tokenFingerprint, expiresAt });
	return expiresAt;
}

async function revokeAllVaultAccess(vaultId) {
	await vaultRepository.deleteUnlockSessionsByVault(vaultId);
}

async function assertUnlockAttemptAllowed(vaultId, userId) {
	const attempts = await vaultRepository.getUnlockAttempts(vaultId, userId);
	if (attempts?.blocked_until && new Date(attempts.blocked_until).getTime() > Date.now()) {
		throw createHttpError(429, 'Too many Vault password attempts. Try again later.', 'VAULT_RATE_LIMITED');
	}
}

async function recordFailedUnlock(vaultId, userId) {
	const now = Date.now();
	const nowIso = new Date(now).toISOString();
	const config = rateLimitConfig();
	const attempts = await vaultRepository.getUnlockAttempts(vaultId, userId);
	const windowExpired = !attempts || new Date(attempts.window_started_at).getTime() + config.windowSeconds * 1000 <= now;
	const attemptCount = windowExpired ? 1 : Number(attempts.attempt_count || 0) + 1;
	const blockedUntil = attemptCount >= config.maxAttempts
		? new Date(now + config.blockSeconds * 1000).toISOString()
		: null;
	await vaultRepository.saveUnlockAttempts({
		vaultId,
		userId,
		attemptCount,
		windowStartedAt: windowExpired ? nowIso : attempts.window_started_at,
		blockedUntil,
	});
	return { isBlocked: Boolean(blockedUntil), blockedUntil, attemptsRemaining: Math.max(0, config.maxAttempts - attemptCount) };
}

async function clearUnlockAttempts(vaultId, userId) {
	await vaultRepository.clearUnlockAttempts(vaultId, userId);
}

async function revokeVaultAccess(vaultId, userId, tokenFingerprint) {
	requireSessionFingerprint(tokenFingerprint);
	await vaultRepository.deleteUnlockSession(vaultId, userId, tokenFingerprint);
}

async function revokeTokenAccess(userId, tokenFingerprint) {
	if (!userId || !tokenFingerprint) return;
	await vaultRepository.deleteUnlockSessionsByToken(userId, tokenFingerprint);
}

async function getAssetProtection(userId, assetId, tokenFingerprint) {
	const vaults = await vaultRepository.getProtectingVaultsForAsset(userId, assetId, tokenFingerprint);
	const now = Date.now();
	const protectingVaults = vaults.map((vault) => ({
		reference: vault.public_reference,
		name: vault.name,
		isLocked: !isFuture(vault.expires_at, now),
		unlockExpiresAt: isFuture(vault.expires_at, now) ? vault.expires_at : null,
	}));
	const activeExpirations = protectingVaults.map((vault) => vault.unlockExpiresAt).filter(Boolean).sort();
	return {
		passwordProtected: protectingVaults.length > 0,
		isLocked: protectingVaults.some((vault) => vault.isLocked),
		unlockExpiresAt: protectingVaults.some((vault) => vault.isLocked) ? null : activeExpirations[0] || null,
		protectingVaults,
	};
}

async function assertAssetUnlocked(userId, assetId, tokenFingerprint) {
	const protection = await getAssetProtection(userId, assetId, tokenFingerprint);
	if (protection.isLocked) {
		throw createHttpError(423, 'Protected by Vault — unlock every protecting Vault to access', 'VAULT_LOCKED');
	}
	return protection;
}

module.exports = {
	getVaultAccess,
	grantVaultAccess,
	revokeVaultAccess,
	revokeAllVaultAccess,
	revokeTokenAccess,
	assertUnlockAttemptAllowed,
	recordFailedUnlock,
	clearUnlockAttempts,
	getAssetProtection,
	assertAssetUnlocked,
	unlockTtlSeconds,
	rateLimitConfig,
};
