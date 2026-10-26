import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { validateBody } from '../middlewares/validate';
import { transferSchema } from '../schemas/ledger.schema';

export function createTransferRouter(
  transferController: TransferController
): Router {
  const router = Router();

  router.post('/', validateBody(transferSchema), transferController.transfer);
  router.get('/', transferController.getAllTransfers);

  return router;
}
