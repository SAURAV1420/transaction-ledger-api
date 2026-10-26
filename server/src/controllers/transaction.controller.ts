import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service';
import { BadRequestError } from '../errors/AppError';
import { TransactionType } from '../types';

export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  public addTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Support account ID from either path parameter or request body
      const rawParamId = req.params.id || req.params.accountId;
      const paramId = Array.isArray(rawParamId) ? rawParamId[0] : rawParamId;
      const account_id = paramId || req.body?.account_id;

      if (!account_id || typeof account_id !== 'string' || account_id.trim() === '') {
        throw new BadRequestError('Account ID is required');
      }

      const { type, amount, description, reference_id } = req.body;

      const result = this.transactionService.addTransaction({
        account_id: account_id.trim(),
        type,
        amount,
        description,
        reference_id
      });

      res.status(201).json({
        success: true,
        data: {
          ...result.transaction,
          balance_after: result.balance_after
        },
        message: 'Transaction processed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  public getHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const rawParamId = req.params.id || req.params.accountId;
      const paramId = Array.isArray(rawParamId) ? rawParamId[0] : rawParamId;
      const account_id = paramId;

      if (!account_id || typeof account_id !== 'string' || account_id.trim() === '') {
        throw new BadRequestError('Account ID is required');
      }

      const query = (req as any).validatedQuery || req.query;
      const { type, page, limit } = query as {
        type?: TransactionType;
        page?: number;
        limit?: number;
      };

      const result = this.transactionService.getTransactionHistory(account_id.trim(), {
        type,
        page,
        limit
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  };
}
