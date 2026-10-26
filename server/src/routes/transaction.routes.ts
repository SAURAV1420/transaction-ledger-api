import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { validateBody } from '../middlewares/validate';
import { addTransactionSchema } from '../schemas/ledger.schema';

export function createTransactionRouter(
  transactionController: TransactionController
): Router {
  const router = Router();

  // Root endpoint for adding transactions with account_id in body
  router.post(
    '/',
    validateBody(addTransactionSchema),
    transactionController.addTransaction
  );

  return router;
}
