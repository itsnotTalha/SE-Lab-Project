const crypto = require('crypto');
const fs = require('fs').promises;

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const configured = process.env.VAULT_ENCRYPTION_KEY;
  if (!configured) {
    const error = new Error('VAULT_ENCRYPTION_KEY is not configured');
    error.status = 500;
    throw error;
  }

  let key;
  if (/^[0-9a-fA-F]{64}$/.test(configured)) {
    key = Buffer.from(configured, 'hex');
  } else {
    try {
      key = Buffer.from(configured, 'base64');
    } catch {
      key = null;
    }
  }

  if (!key || key.length !== 32) {
    const error = new Error('VAULT_ENCRYPTION_KEY must represent exactly 32 bytes');
    error.status = 500;
    throw error;
  }
  return key;
}

async function encryptFile(inputPath, outputPath) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const plaintext = await fs.readFile(inputPath);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  await fs.writeFile(outputPath, Buffer.concat([iv, authTag, encrypted]), { mode: 0o600 });
  return { encryptedSize: IV_LENGTH + AUTH_TAG_LENGTH + encrypted.length };
}

async function decryptFile(inputPath) {
  const key = getEncryptionKey();
  const payload = await fs.readFile(inputPath);
  if (payload.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    const error = new Error('Encrypted vault file is invalid');
    error.status = 422;
    throw error;
  }
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

module.exports = { ALGORITHM, encryptFile, decryptFile };
