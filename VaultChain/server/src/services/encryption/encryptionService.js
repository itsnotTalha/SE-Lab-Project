const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

function deriveKey(secret) {
	const keySecret = secret || process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'vaultchain-default-aes256-key-fallback';
	return crypto.createHash('sha256').update(String(keySecret)).digest();
}

/**
 * Encrypts a buffer using AES-256-GCM.
 */
function encryptBuffer(plainBuffer, secret = null) {
	if (!Buffer.isBuffer(plainBuffer)) {
		plainBuffer = Buffer.from(plainBuffer);
	}
	const key = deriveKey(secret);
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

	const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return {
		cipherText: encrypted,
		iv: iv.toString('hex'),
		authTag: authTag.toString('hex'),
		algorithm: ALGORITHM,
	};
}

/**
 * Decrypts an AES-256-GCM encrypted buffer.
 */
function decryptBuffer(cipherBuffer, ivHex, authTagHex, secret = null) {
	if (!Buffer.isBuffer(cipherBuffer)) {
		cipherBuffer = Buffer.from(cipherBuffer);
	}
	const key = deriveKey(secret);
	const iv = Buffer.from(ivHex, 'hex');
	const authTag = Buffer.from(authTagHex, 'hex');

	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	return Buffer.concat([decipher.update(cipherBuffer), decipher.final()]);
}

/**
 * Encrypts a file on disk and writes the encrypted ciphertext to targetPath.
 */
async function encryptFile(sourcePath, targetPath, secret = null) {
	const plainBuffer = await fs.readFile(sourcePath);
	const result = encryptBuffer(plainBuffer, secret);
	await fs.mkdir(path.dirname(targetPath), { recursive: true });
	await fs.writeFile(targetPath, result.cipherText);
	return {
		encryptedPath: targetPath,
		iv: result.iv,
		authTag: result.authTag,
		algorithm: ALGORITHM,
	};
}

/**
 * Decrypts a file on disk to a target decrypted file path.
 */
async function decryptFile(encryptedPath, targetDecryptedPath, ivHex, authTagHex, secret = null) {
	const cipherBuffer = await fs.readFile(encryptedPath);
	const plainBuffer = decryptBuffer(cipherBuffer, ivHex, authTagHex, secret);
	await fs.mkdir(path.dirname(targetDecryptedPath), { recursive: true });
	await fs.writeFile(targetDecryptedPath, plainBuffer);
	return targetDecryptedPath;
}

module.exports = {
	ALGORITHM,
	encryptBuffer,
	decryptBuffer,
	encryptFile,
	decryptFile,
};
