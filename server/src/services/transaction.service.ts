import Database from 'better-sqlite3';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AccountRepository } from '../repositories/account.repository';
import {
  Transaction,
  TransactionType,
  PaginatedResult
} from '../types';
import {
  NotFoundError,
  DuplicateTransactionError,
  InsufficientFundsError
} from '../errors/AppError';

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export class TransactionService {
  private transactionRepo: TransactionRepository;
  private accountRepo: AccountRepository;

  constructor(private db: Database.Database) {
    this.transactionRepo = new TransactionRepository(db);
    this.accountRepo = new AccountRepository(db);
  }

  /**
   * Adds a transaction to an account atomically.
   * Requirement 5: Creating a transaction and updating the account balance
   * must be treated as one atomic operation. If either operation fails,
   * neither change should be persisted.
   */
  public addTransaction(input: {
    account_id: string;
    type: TransactionType;
    amount: number;
    description?: string;
    reference_id: string;
  }): { transaction: Transaction; balance_after: number } {
    const { account_id, type, amount, description = '', reference_id } = input;
    const roundedAmount = round2(amount);

    // Atomically execute inside a SQLite IMMEDIATE transaction
    const executeTx = this.db.transaction(() => {
      // 1. Check if account exists
      const account = this.accountRepo.findById(account_id);
      if (!account) {
        throw new NotFoundError(`Account with ID '${account_id}' not found`);
      }

      // 2. Check for duplicate reference_id within this account
      // Requirement 2: If a transaction with the same reference_id is submitted again:
      // A new transaction must not be created, balance must not change,
      // and an appropriate response must indicate it already exists.
      const existingTx = this.transactionRepo.findByAccountAndReference(
        account_id,
        reference_id
      );
      if (existingTx) {
        throw new DuplicateTransactionError(
          `Transaction with reference_id '${reference_id}' already exists for account '${account_id}'.`,
          reference_id
        );
      }

      // 3. Handle Debit / Credit logic
      let newBalance: number;
      if (type === 'debit') {
        if (account.balance < roundedAmount) {
          throw new InsufficientFundsError(
            `Debit transaction rejected: Account has insufficient balance. Current: ${account.balance}, Requested: ${roundedAmount}.`,
            {
              current_balance: account.balance,
              requested_amount: roundedAmount
            }
          );
        }
        newBalance = round2(account.balance - roundedAmount);
      } else {
        // Credit
        newBalance = round2(account.balance + roundedAmount);
      }

      // 4. Record transaction (Immutability enforced by DB triggers)
      const transaction = this.transactionRepo.create({
        account_id,
        type,
        amount: roundedAmount,
        description,
        reference_id
      });

      // 5. Update account balance
      this.accountRepo.updateBalance(account_id, newBalance);

      return {
        transaction,
        balance_after: newBalance
      };
    });

    try {
      return executeTx();
    } catch (error: any) {
      // Double check in case of unique constraint race conditions
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new DuplicateTransactionError(
          `Transaction with reference_id '${reference_id}' already exists for account '${account_id}'.`,
          reference_id
        );
      }
      throw error;
    }
  }

  /**
   * Retrieves transaction history for an account with filtering, pagination, and sorting.
   * Requirement 4: Filtering by type, pagination (page, limit, total records/pages),
   * latest-first sorting based on created_at.
   */
  public getTransactionHistory(
    accountId: string,
    options: {
      type?: TransactionType;
      page?: number;
      limit?: number;
    }
  ): PaginatedResult<Transaction> {
    // 1. Verify account exists
    const account = this.accountRepo.findById(accountId);
    if (!account) {
      throw new NotFoundError(`Account with ID '${accountId}' not found`);
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 10));
    const offset = (page - 1) * limit;

    const { transactions, total } = this.transactionRepo.findHistory(accountId, {
      type: options.type,
      limit,
      offset
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: transactions,
      pagination: {
        current_page: page,
        page_size: limit,
        total_records: total,
        total_pages: totalPages
      }
    };
  }

  public getTransactionRepo(): TransactionRepository {
    return this.transactionRepo;
  }
}
