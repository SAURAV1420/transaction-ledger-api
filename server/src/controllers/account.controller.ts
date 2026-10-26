import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services/account.service';

export class AccountController {
  constructor(private accountService: AccountService) {}

  public createAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { name } = req.body;
      const account = this.accountService.createAccount(name);

      res.status(201).json({
        success: true,
        data: account,
        message: 'Account created successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  public getAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const account = this.accountService.getAccountById(String(id));

      res.status(200).json({
        success: true,
        data: account
      });
    } catch (error) {
      next(error);
    }
  };

  public getBalance = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const balanceData = this.accountService.getAccountBalance(String(id));

      res.status(200).json({
        success: true,
        data: balanceData
      });
    } catch (error) {
      next(error);
    }
  };

  public getAllAccounts = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const accounts = this.accountService.getAllAccounts();

      res.status(200).json({
        success: true,
        data: accounts
      });
    } catch (error) {
      next(error);
    }
  };
}
