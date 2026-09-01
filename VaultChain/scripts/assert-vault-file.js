const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const id = Number(process.argv[2]);
const mode = process.argv[3] || 'exists';
const databasePath = process.env.DATABASE_PATH || path.resolve(__dirname, '..', 'server', 'src', 'database', 'vaultchain.sqlite');
const db = new sqlite3.Database(path.resolve(databasePath));

db.get('SELECT encrypted_path FROM vault_items WHERE id = ?', [id], (error, row) => {
  if (error) { console.error(error.message); process.exitCode = 1; db.close(); return; }
  if (mode === 'deleted') {
    if (row) { console.error('vault database record still exists'); process.exitCode = 1; }
    db.close();
    return;
  }
  if (!row || !fs.existsSync(row.encrypted_path)) { console.error('encrypted vault file is missing'); process.exitCode = 1; db.close(); return; }
  const header = fs.readFileSync(row.encrypted_path).subarray(0, 5).toString('ascii');
  if (header === '%PDF-') { console.error('vault file is plaintext'); process.exitCode = 1; }
  else console.log('encrypted vault file verified');
  db.close();
});
