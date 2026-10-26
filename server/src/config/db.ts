import Database from 'better-sqlite3';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDatabase(dbPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const resolvedPath =
    dbPath ||
    process.env.DATABASE_PATH ||
    path.join(__dirname, '..', '..', 'ledger.db');

  dbInstance = new Database(resolvedPath);

  // Enable foreign key constraints
  dbInstance.pragma('foreign_keys = ON');

  // Use WAL mode for persistent file databases for performance and safe concurrency
  if (resolvedPath !== ':memory:') {
    dbInstance.pragma('journal_mode = WAL');
  }

  initializeSchema(dbInstance);

  return dbInstance;
}

export function initializeSchema(db: Database.Database): void {
  // 1. Accounts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0.0 CHECK (balance >= 0),
      created_at TEXT NOT NULL
    );
  `);

  // 2. Transactions Table
  // Note the compound UNIQUE constraint on (account_id, reference_id)
  // This ensures reference_id is unique per account, but different accounts can share a reference_id
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
      amount REAL NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL DEFAULT '',
      reference_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(account_id, reference_id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account_created
      ON transactions(account_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_transactions_account_type
      ON transactions(account_id, type, created_at DESC);
  `);

  // 3. Immutability Triggers (Requirement 5: Data Integrity & Immutability)
  // Ensures transactions cannot be updated or deleted even via direct DB queries
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prevent_transaction_update
    BEFORE UPDATE ON transactions
    BEGIN
      SELECT RAISE(ABORT, 'Transactions are immutable and cannot be updated.');
    END;

    CREATE TRIGGER IF NOT EXISTS prevent_transaction_delete
    BEFORE DELETE ON transactions
    BEGIN
      SELECT RAISE(ABORT, 'Transactions are immutable and cannot be deleted.');
    END;
  `);

  // 4. Transfers Table (Requirement 9: Bonus Money Transfer)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      source_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      destination_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      amount REAL NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL DEFAULT '',
      reference_id TEXT NOT NULL,
      source_transaction_id TEXT NOT NULL REFERENCES transactions(id),
      destination_transaction_id TEXT NOT NULL REFERENCES transactions(id),
      created_at TEXT NOT NULL,
      UNIQUE(source_account_id, reference_id)
    );
  `);
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function resetDatabase(db: Database.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS transfers;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS accounts;
  `);
  initializeSchema(db);
}
