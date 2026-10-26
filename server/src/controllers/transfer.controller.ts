import { Request, Response, NextFunction } from 'express';
import { TransferService } from '../services/transfer.service';

export class TransferController {
  constructor(private transferService: TransferService) {}

  public transfer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        source_account_id,
        destination_account_id,
        amount,
        description,
        reference_id
      } = req.body;

      const result = this.transferService.transferMoney({
        source_account_id,
        destination_account_id,
        amount,
        description,
        reference_id
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Transfer completed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  public getAllTransfers = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const transfers = this.transferService.getAllTransfers();

      res.status(200).json({
        success: true,
        data: transfers
      });
    } catch (error) {
      next(error);
    }
  };
}
