const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const {
  createVaultItem,
  getVaultItemByIdForOwner,
  listVaultItemsForOwner,
  deleteVaultItemForOwner,
} = require('../../repositories/vault/vaultRepository');
const { encryptFile, decryptFile, ALGORITHM } = require('../encryption/vaultEncryptionService');
const { vaultTemporaryDirectory } = require('../../middleware/vaultUpload');

const vaultDirectory = path.resolve(__dirname, '../../uploads/vault');

function parseVaultId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('Invalid vault ID');
    error.status = 400;
    throw error;
  }
  return id;
}

function clean(value, maxLength) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

async function uploadVaultItem({ ownerId, file, title, description }) {
  if (!file) {
    const error = new Error('Vault file is required');
    error.status = 400;
    throw error;
  }

  await fs.mkdir(vaultDirectory, { recursive: true });
  const encryptedName = `${crypto.randomUUID()}.vault`;
  const encryptedPath = path.join(vaultDirectory, encryptedName);

  try {
    const encrypted = await encryptFile(file.path, encryptedPath);
    const originalBuffer = await fs.readFile(file.path);
    const checksum = crypto.createHash('sha256').update(originalBuffer).digest('hex');
    const item = await createVaultItem({
      ownerId,
      title: clean(title, 200) || path.basename(file.originalname, path.extname(file.originalname)).slice(0, 200),
      description: clean(description, 2000),
      originalName: path.basename(file.originalname).slice(0, 255),
      mimeType: file.mimetype,
      originalSize: file.size,
      encryptedSize: encrypted.encryptedSize,
      encryptedPath,
      checksum,
      encryptionAlgorithm: ALGORITHM,
    });
    await fs.unlink(file.path).catch(() => {});
    return item;
  } catch (error) {
    await fs.unlink(file.path).catch(() => {});
    await fs.unlink(encryptedPath).catch(() => {});
    throw error;
  }
}

async function listVault(ownerId) {
  return listVaultItemsForOwner(ownerId);
}

async function getVaultItem(ownerId, value) {
  const id = parseVaultId(value);
  const item = await getVaultItemByIdForOwner(id, ownerId);
  if (!item) {
    const error = new Error('Vault item not found');
    error.status = 404;
    throw error;
  }
  return item;
}

async function downloadVaultItem(ownerId, value) {
  const item = await getVaultItem(ownerId, value);
  try {
    const content = await decryptFile(item.encryptedPath);
    return { item, content };
  } catch (error) {
    if (error.code === 'ENOENT') {
      const missing = new Error('Encrypted vault file is missing');
      missing.status = 404;
      throw missing;
    }
    throw error;
  }
}

async function deleteVaultItem(ownerId, value) {
  const item = await getVaultItem(ownerId, value);
  await fs.unlink(item.encryptedPath).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
  await deleteVaultItemForOwner(item.id, ownerId);
  return item;
}

module.exports = { uploadVaultItem, listVault, getVaultItem, downloadVaultItem, deleteVaultItem, vaultDirectory, vaultTemporaryDirectory };
