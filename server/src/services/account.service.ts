import Database from 'better-sqlite3';
import { AccountRepository } from '../repositories/account.repository';
import { Account } from '../types';
import { NotFoundError } from '../errors/AppError';

export class AccountService {
  private accountRepo: AccountRepository;

  constructor(db: Database.Database) {
    this.accountRepo = new AccountRepository(db);
  }

  public createAccount(name: string): Account {
    return this.accountRepo.create(name);
  }

  public getAccountById(id: string): Account {
    const account = this.accountRepo.findById(id);
    if (!account) {
      throw new NotFoundError(`Account with ID '${id}' not found`);
    }
    return account;
  }

  public getAccountBalance(id: string): { account_id: string; balance: number; name: string } {
    const account = this.getAccountById(id);
    return {
      account_id: account.id,
      balance: account.balance,
      name: account.name
    };
  }

  public getAllAccounts(): Account[] {
    return this.accountRepo.findAll();
  }
}
