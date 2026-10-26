import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { Account } from '../types';

export class AccountRepository {
  constructor(private db: Database.Database) {}

  public create(name: string): Account {
    const id = `acc_${randomUUID()}`;
    const createdAt = new Date().toISOString();
    const initialBalance = 0.0;

    const stmt = this.db.prepare(`
      INSERT INTO accounts (id, name, balance, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, name, initialBalance, createdAt);

    return {
      id,
      name,
      balance: initialBalance,
      created_at: createdAt
    };
  }

  public findById(id: string): Account | null {
    const stmt = this.db.prepare(`
      SELECT id, name, balance, created_at
      FROM accounts
      WHERE id = ?
    `);

    const row = stmt.get(id) as Account | undefined;
    return row || null;
  }

  public findAll(): Account[] {
    const stmt = this.db.prepare(`
      SELECT id, name, balance, created_at
      FROM accounts
      ORDER BY created_at DESC
    `);

    return stmt.all() as Account[];
  }

  public updateBalance(id: string, newBalance: number): void {
    const stmt = this.db.prepare(`
      UPDATE accounts
      SET balance = ?
      WHERE id = ?
    `);

    stmt.run(newBalance, id);
  }
}
