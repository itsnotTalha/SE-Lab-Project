const fs = require('fs').promises;
const path = require('path');
const { exec } = require('./database');

let initializationPromise = null;

async function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');

      await exec(schema);
    })();
  }

  return initializationPromise;
}

module.exports = { initializeDatabase };