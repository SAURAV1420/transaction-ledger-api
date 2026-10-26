import { Router } from 'express';
import Database from 'better-sqlite3';
import { AccountService } from '../services/account.service';
import { TransactionService } from '../services/transaction.service';
import { TransferService } from '../services/transfer.service';
import { AccountController } from '../controllers/account.controller';
import { TransactionController } from '../controllers/transaction.controller';
import { TransferController } from '../controllers/transfer.controller';
import { createAccountRouter } from './account.routes';
import { createTransactionRouter } from './transaction.routes';
import { createTransferRouter } from './transfer.routes';

export function createApiRouter(db: Database.Database): Router {
  const router = Router();

  // Instantiate services
  const accountService = new AccountService(db);
  const transactionService = new TransactionService(db);
  const transferService = new TransferService(db);

  // Instantiate controllers
  const accountController = new AccountController(accountService);
  const transactionController = new TransactionController(transactionService);
  const transferController = new TransferController(transferService);

  // Health check
  router.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  });

  // Mount sub-routers under /api/v1
  router.use('/accounts', createAccountRouter(accountController, transactionController));
  router.use('/transactions', createTransactionRouter(transactionController));
  router.use('/transfers', createTransferRouter(transferController));

  return router;
}
