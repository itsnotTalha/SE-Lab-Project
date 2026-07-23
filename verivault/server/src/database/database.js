const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function loadEnvFile(envFilePath) {
  if (!fs.existsSync(envFilePath)) {
    return {};
  }

  const contents = fs.readFileSync(envFilePath, 'utf8');
  const values = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmedLine.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();
    const value = trimmedLine.slice(equalsIndex + 1).trim();

    values[key] = value;
  }

  return values;
}

const envFilePath = path.resolve(__dirname, '../../.env');
const envValues = loadEnvFile(envFilePath);
const databasePath = process.env.DATABASE_PATH || envValues.DATABASE_PATH || path.resolve(__dirname, 'verivault.sqlite');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new sqlite3.Database(databasePath);

database.on('open', () => {
  database.run('PRAGMA foreign_keys = ON');
});

database.on('error', (error) => {
  console.error('SQLite connection error:', error);
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve(this);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    database.exec(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

module.exports = {
  database,
  run,
  exec,
};