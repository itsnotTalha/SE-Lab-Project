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
const databasePath = process.env.DATABASE_PATH || envValues.DATABASE_PATH || path.resolve(__dirname, 'vaultchain.sqlite');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new sqlite3.Database(databasePath);

database.on('open', () => {
  database.run('PRAGMA foreign_keys = ON');
  database.run('PRAGMA busy_timeout = 5000');
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

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
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

// Every repository shares this one sqlite3 connection, and sqlite3 does not
// nest transactions. If two requests ran BEGIN ... COMMIT at the same time
// their statements would interleave inside a single transaction, so a rollback
// in one request would silently discard the other request's writes.
// transactionQueue serialises them: each transaction waits for the previous
// one to finish before it issues its own BEGIN.
let transactionQueue = Promise.resolve();

async function runTransaction(work) {
  await run('BEGIN IMMEDIATE TRANSACTION');

  try {
    const result = await work({ run, get, all });

    await run('COMMIT');

    return result;
  } catch (error) {
    try {
      await run('ROLLBACK');
    } catch (rollbackError) {
      void rollbackError;
    }

    throw error;
  }
}

/**
 * Runs `work` inside a single database transaction, serialised against every
 * other withTransaction() call in this process. Either all of the writes in
 * `work` are committed, or none of them are.
 */
function withTransaction(work) {
  const result = transactionQueue.then(() => runTransaction(work));

  // The queue itself must never reject, or one failed transaction would
  // permanently block every transaction queued behind it.
  transactionQueue = result.then(
    () => undefined,
    () => undefined
  );

  return result;
}

module.exports = {
  database,
  run,
  get,
  all,
  exec,
  withTransaction,
};