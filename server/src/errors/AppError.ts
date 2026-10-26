export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code = 'BAD_REQUEST', details?: any) {
    super(message, 400, code, details);
  }
}

export class DuplicateTransactionError extends AppError {
  constructor(
    message: string = 'A transaction with this reference_id already exists for this account',
    referenceId?: string
  ) {
    super(message, 409, 'DUPLICATE_TRANSACTION', { reference_id: referenceId });
  }
}

export class InsufficientFundsError extends AppError {
  constructor(
    message: string = 'Debit transaction rejected: Account has insufficient balance',
    details?: { current_balance: number; requested_amount: number }
  ) {
    super(message, 422, 'INSUFFICIENT_FUNDS', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}
