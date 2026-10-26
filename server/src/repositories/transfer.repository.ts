import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { Transfer } from '../types';

export class TransferRepository {
  constructor(private db: Database.Database) {}

  public create(data: {
    id?: string;
    source_account_id: string;
    destination_account_id: string;
    amount: number;
    description: string;
    reference_id: string;
    source_transaction_id: string;
    destination_transaction_id: string;
    created_at?: string;
  }): Transfer {
    const id = data.id || `trf_${randomUUID()}`;
    const createdAt = data.created_at || new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO transfers (
        id, source_account_id, destination_account_id, amount,
        description, reference_id, source_transaction_id, destination_transaction_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.source_account_id,
      data.destination_account_id,
      data.amount,
      data.description,
      data.reference_id,
      data.source_transaction_id,
      data.destination_transaction_id,
      createdAt
    );

    return {
      id,
      source_account_id: data.source_account_id,
      destination_account_id: data.destination_account_id,
      amount: data.amount,
      description: data.description,
      reference_id: data.reference_id,
      source_transaction_id: data.source_transaction_id,
      destination_transaction_id: data.destination_transaction_id,
      created_at: createdAt
    };
  }

  public findBySourceAndReference(
    sourceAccountId: string,
    referenceId: string
  ): Transfer | null {
    const stmt = this.db.prepare(`
      SELECT
        id, source_account_id, destination_account_id, amount,
        description, reference_id, source_transaction_id, destination_transaction_id, created_at
      FROM transfers
      WHERE source_account_id = ? AND reference_id = ?
    `);

    const row = stmt.get(sourceAccountId, referenceId) as Transfer | undefined;
    return row || null;
  }

  public findAll(): Transfer[] {
    const stmt = this.db.prepare(`
      SELECT
        id, source_account_id, destination_account_id, amount,
        description, reference_id, source_transaction_id, destination_transaction_id, created_at
      FROM transfers
      ORDER BY created_at DESC
    `);

    return stmt.all() as Transfer[];
  }
}
