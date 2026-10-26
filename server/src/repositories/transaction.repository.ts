import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { Transaction, TransactionType } from '../types';

export class TransactionRepository {
  constructor(private db: Database.Database) {}

  public create(data: {
    id?: string;
    account_id: string;
    type: TransactionType;
    amount: number;
    description: string;
    reference_id: string;
    created_at?: string;
  }): Transaction {
    const id = data.id || `txn_${randomUUID()}`;
    const createdAt = data.created_at || new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO transactions (id, account_id, type, amount, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.account_id,
      data.type,
      data.amount,
      data.description,
      data.reference_id,
      createdAt
    );

    return {
      id,
      account_id: data.account_id,
      type: data.type,
      amount: data.amount,
      description: data.description,
      reference_id: data.reference_id,
      created_at: createdAt
    };
  }

  public findByAccountAndReference(
    accountId: string,
    referenceId: string
  ): Transaction | null {
    const stmt = this.db.prepare(`
      SELECT id, account_id, type, amount, description, reference_id, created_at
      FROM transactions
      WHERE account_id = ? AND reference_id = ?
    `);

    const row = stmt.get(accountId, referenceId) as Transaction | undefined;
    return row || null;
  }

  public findHistory(
    accountId: string,
    options: {
      type?: TransactionType;
      limit: number;
      offset: number;
    }
  ): { transactions: Transaction[]; total: number } {
    let whereClause = 'WHERE account_id = ?';
    const params: any[] = [accountId];

    if (options.type) {
      whereClause += ' AND type = ?';
      params.push(options.type);
    }

    // Count total records matching criteria
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM transactions
      ${whereClause}
    `);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult ? countResult.count : 0;

    // Fetch paginated records sorted by latest-first (created_at DESC, rowid DESC)
    const dataStmt = this.db.prepare(`
      SELECT id, account_id, type, amount, description, reference_id, created_at
      FROM transactions
      ${whereClause}
      ORDER BY created_at DESC, rowid DESC
      LIMIT ? OFFSET ?
    `);

    const transactions = dataStmt.all(...params, options.limit, options.offset) as Transaction[];

    return { transactions, total };
  }

  public calculateBalance(accountId: string): number {
    const stmt = this.db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as balance
      FROM transactions
      WHERE account_id = ?
    `);
    const res = stmt.get(accountId) as { balance: number };
    return res ? Number(res.balance.toFixed(2)) : 0;
  }
}
