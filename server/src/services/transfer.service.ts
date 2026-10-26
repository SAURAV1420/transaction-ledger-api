import Database from 'better-sqlite3';
import { TransferRepository } from '../repositories/transfer.repository';
import { AccountRepository } from '../repositories/account.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { Transfer } from '../types';
import {
  NotFoundError,
  BadRequestError,
  InsufficientFundsError,
  DuplicateTransactionError
} from '../errors/AppError';
import { round2 } from './transaction.service';

export interface TransferResult {
  transfer_id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  description: string;
  reference_id: string;
  source_balance_after: number;
  destination_balance_after: number;
  created_at: string;
}

export class TransferService {
  private transferRepo: TransferRepository;
  private accountRepo: AccountRepository;
  private transactionRepo: TransactionRepository;

  constructor(private db: Database.Database) {
    this.transferRepo = new TransferRepository(db);
    this.accountRepo = new AccountRepository(db);
    this.transactionRepo = new TransactionRepository(db);
  }

  /**
   * Transfers money atomically between two accounts.
   * Requirement 9:
   * - Source account must have sufficient balance
   * - Both accounts must exist
   * - Debit from source and credit to destination must happen atomically
   * - If any part fails, entire transfer is rolled back
   */
  public transferMoney(input: {
    source_account_id: string;
    destination_account_id: string;
    amount: number;
    description?: string;
    reference_id: string;
  }): TransferResult {
    const {
      source_account_id,
      destination_account_id,
      amount,
      description = '',
      reference_id
    } = input;

    if (source_account_id === destination_account_id) {
      throw new BadRequestError('Cannot transfer money to the same account');
    }

    const roundedAmount = round2(amount);

    // Atomically execute inside a SQLite IMMEDIATE transaction
    const executeTx = this.db.transaction(() => {
      // 1. Check for duplicate transfer reference for the source account
      const existingTransfer = this.transferRepo.findBySourceAndReference(
        source_account_id,
        reference_id
      );
      if (existingTransfer) {
        throw new DuplicateTransactionError(
          `Transfer with reference_id '${reference_id}' already exists for source account '${source_account_id}'.`,
          reference_id
        );
      }

      // 2. Fetch both accounts in deterministic order (prevents deadlocks)
      const sortedIds = [source_account_id, destination_account_id].sort();
      const accountsMap = new Map<string, any>();

      for (const accId of sortedIds) {
        const acc = this.accountRepo.findById(accId);
        if (!acc) {
          throw new NotFoundError(`Account with ID '${accId}' not found`);
        }
        accountsMap.set(accId, acc);
      }

      const sourceAccount = accountsMap.get(source_account_id);
      const destAccount = accountsMap.get(destination_account_id);

      // 3. Verify sufficient balance in source account
      if (sourceAccount.balance < roundedAmount) {
        throw new InsufficientFundsError(
          `Transfer rejected: Source account has insufficient balance. Current: ${sourceAccount.balance}, Requested: ${roundedAmount}.`,
          {
            current_balance: sourceAccount.balance,
            requested_amount: roundedAmount
          }
        );
      }

      // 4. Compute new balances
      const sourceNewBalance = round2(sourceAccount.balance - roundedAmount);
      const destNewBalance = round2(destAccount.balance + roundedAmount);

      // 5. Create Debit Transaction on Source Account
      const debitTx = this.transactionRepo.create({
        account_id: source_account_id,
        type: 'debit',
        amount: roundedAmount,
        description: description || `Transfer to account ${destination_account_id}`,
        reference_id: `trf_${reference_id}_out`
      });

      // 6. Create Credit Transaction on Destination Account
      const creditTx = this.transactionRepo.create({
        account_id: destination_account_id,
        type: 'credit',
        amount: roundedAmount,
        description: description || `Transfer from account ${source_account_id}`,
        reference_id: `trf_${reference_id}_in`
      });

      // 7. Update Balances
      this.accountRepo.updateBalance(source_account_id, sourceNewBalance);
      this.accountRepo.updateBalance(destination_account_id, destNewBalance);

      // 8. Record Transfer
      const transfer = this.transferRepo.create({
        source_account_id,
        destination_account_id,
        amount: roundedAmount,
        description,
        reference_id,
        source_transaction_id: debitTx.id,
        destination_transaction_id: creditTx.id
      });

      return {
        transfer_id: transfer.id,
        source_account_id,
        destination_account_id,
        amount: roundedAmount,
        description,
        reference_id,
        source_balance_after: sourceNewBalance,
        destination_balance_after: destNewBalance,
        created_at: transfer.created_at
      };
    });

    try {
      return executeTx();
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new DuplicateTransactionError(
          `Transfer or transaction with reference_id '${reference_id}' already exists.`,
          reference_id
        );
      }
      throw error;
    }
  }

  public getAllTransfers(): Transfer[] {
    return this.transferRepo.findAll();
  }
}
