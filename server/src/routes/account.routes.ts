import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { TransactionController } from '../controllers/transaction.controller';
import { validateBody, validateQuery } from '../middlewares/validate';
import {
  createAccountSchema,
  addTransactionSchema,
  transactionHistoryQuerySchema
} from '../schemas/ledger.schema';

export function createAccountRouter(
  accountController: AccountController,
  transactionController: TransactionController
): Router {
  const router = Router();

  // Account endpoints
  router.post(
    '/',
    validateBody(createAccountSchema),
    accountController.createAccount
  );

  router.get('/', accountController.getAllAccounts);

  router.get('/:id/balance', accountController.getBalance);
  router.get('/:id', accountController.getAccount);

  // Sub-resource endpoints for transactions
  router.post(
    '/:id/transactions',
    validateBody(addTransactionSchema),
    transactionController.addTransaction
  );

  router.get(
    '/:id/transactions',
    validateQuery(transactionHistoryQuerySchema),
    transactionController.getHistory
  );

  return router;
}
