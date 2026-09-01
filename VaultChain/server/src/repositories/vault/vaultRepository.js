const { database, run } = require('../../database/database');

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error) return reject(error);
      resolve(rows || []);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (error, row) => {
      if (error) return reject(error);
      resolve(row || null);
    });
  });
}

function mapVaultItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    originalName: row.original_name,
    mimeType: row.mime_type,
    originalSize: row.original_size,
    encryptedSize: row.encrypted_size,
    encryptionAlgorithm: row.encryption_algorithm,
    checksum: row.checksum,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    encryptedPath: row.encrypted_path,
  };
}

async function createVaultItem({ ownerId, title, description, originalName, mimeType, originalSize, encryptedSize, encryptedPath, checksum, encryptionAlgorithm }) {
  const result = await run(
    `INSERT INTO vault_items
      (owner_id, title, encrypted_path, encryption_algorithm, description, original_name,
       mime_type, original_size, encrypted_size, checksum)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ownerId, title, encryptedPath, encryptionAlgorithm, description || null, originalName,
      mimeType, originalSize, encryptedSize, checksum]
  );
  return getVaultItemByIdForOwner(result.lastID, ownerId);
}

async function getVaultItemByIdForOwner(id, ownerId) {
  const row = await get(
    `SELECT id, owner_id, title, encrypted_path, encryption_algorithm, description,
            original_name, mime_type, original_size, encrypted_size, checksum, created_at, updated_at
       FROM vault_items
      WHERE id = ? AND owner_id = ?`,
    [id, ownerId]
  );
  return mapVaultItem(row);
}

async function listVaultItemsForOwner(ownerId) {
  const rows = await all(
    `SELECT id, owner_id, title, encrypted_path, encryption_algorithm, description,
            original_name, mime_type, original_size, encrypted_size, checksum, created_at, updated_at
       FROM vault_items
      WHERE owner_id = ?
      ORDER BY created_at DESC, id DESC`,
    [ownerId]
  );
  return rows.map(mapVaultItem);
}

async function deleteVaultItemForOwner(id, ownerId) {
  return run('DELETE FROM vault_items WHERE id = ? AND owner_id = ?', [id, ownerId]);
}

module.exports = { createVaultItem, getVaultItemByIdForOwner, listVaultItemsForOwner, deleteVaultItemForOwner };
