const { database } = require('../database');

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error) return reject(error);
      resolve(rows || []);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function onRun(error) {
      if (error) return reject(error);
      resolve(this);
    });
  });
}

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function migrateDocumentVaultSchema() {
  const documentColumns = [
    ['title', 'TEXT'], ['description', 'TEXT'], ['category', 'TEXT'], ['file_name', 'TEXT'],
    ['file_path', 'TEXT'], ['file_size', 'INTEGER'], ['mime_type', 'TEXT'], ['status', "TEXT DEFAULT 'uploaded'"],
    ['updated_at', 'DATETIME'],
  ];
  for (const [column, definition] of documentColumns) await ensureColumn('documents', column, definition);

  const ocrColumns = [['engine', 'TEXT'], ['language', 'TEXT'], ['pages_processed', 'INTEGER']];
  for (const [column, definition] of ocrColumns) await ensureColumn('ocr_results', column, definition);

  const vaultColumns = [
    ['description', 'TEXT'], ['original_name', 'TEXT'], ['mime_type', 'TEXT'], ['original_size', 'INTEGER'],
    ['encrypted_size', 'INTEGER'], ['checksum', 'TEXT'], ['updated_at', 'DATETIME'],
  ];
  for (const [column, definition] of vaultColumns) await ensureColumn('vault_items', column, definition);
}

module.exports = { migrateDocumentVaultSchema };
