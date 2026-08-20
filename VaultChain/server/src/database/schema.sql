-- users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

-- assets table
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- asset_metadata table
CREATE TABLE IF NOT EXISTS asset_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL UNIQUE,
  width INTEGER,
  height INTEGER,
  camera TEXT,
  location TEXT,
  created_date DATETIME,
  metadata_json TEXT,
  FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- asset_hashes table
CREATE TABLE IF NOT EXISTS asset_hashes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL UNIQUE,
  sha256_hash TEXT,
  phash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- documents table
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  asset_id INTEGER,
  page_count INTEGER,
  language TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

-- ocr_results table
CREATE TABLE IF NOT EXISTS ocr_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL UNIQUE,
  extracted_text TEXT,
  confidence REAL,
  semantic_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- verification_reports table
CREATE TABLE IF NOT EXISTS verification_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  asset_id INTEGER NOT NULL,
  verification_type TEXT,
  sha256_match INTEGER,
  similarity_score REAL,
  status TEXT,
  report_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- blockchain_blocks table
CREATE TABLE IF NOT EXISTS blockchain_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_index INTEGER NOT NULL UNIQUE,
  asset_id INTEGER,
  owner_id INTEGER,
  action TEXT NOT NULL,
  previous_hash TEXT,
  current_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  listing_type TEXT,
  price REAL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ownership_history table
CREATE TABLE IF NOT EXISTS ownership_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  previous_owner INTEGER,
  new_owner INTEGER,
  transfer_type TEXT,
  blockchain_block_id INTEGER,
  transferred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY(previous_owner) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY(new_owner) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY(blockchain_block_id) REFERENCES blockchain_blocks(id) ON DELETE SET NULL
);

-- fractional_ownership table
CREATE TABLE IF NOT EXISTS fractional_ownership (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  percentage REAL,
  shares INTEGER,
  FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(asset_id, user_id)
);

-- vault_items table
CREATE TABLE IF NOT EXISTS vault_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  encrypted_path TEXT NOT NULL,
  encryption_algorithm TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_assets_owner_id ON assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_asset_hashes_sha256_hash ON asset_hashes(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_asset_hashes_phash ON asset_hashes(phash);
CREATE INDEX IF NOT EXISTS idx_verification_reports_asset_id ON verification_reports(asset_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_asset_id ON blockchain_blocks(asset_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_block_index ON blockchain_blocks(block_index);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_ownership_history_asset_id ON ownership_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
