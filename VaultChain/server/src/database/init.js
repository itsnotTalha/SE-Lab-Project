const fs = require('fs').promises;
const path = require('path');
const { exec } = require('./database');

const migrations = [
  require('./migrations/001_marketplace_settlement'),
  require('./migrations/002_auctions_and_fractional'),
];

let initializationPromise = null;

async function runMigrations() {
  for (const migration of migrations) {
    await migration.up();
  }
}

async function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');

      await exec(schema);
      await runMigrations();
    })();
  }

  return initializationPromise;
}

module.exports = { initializeDatabase };
