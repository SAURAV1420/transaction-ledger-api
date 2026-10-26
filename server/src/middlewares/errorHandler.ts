import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If it's a known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null
      }
    });
    return;
  }

  // Handle SQLite specific errors if they bubble up
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'A resource with these unique properties already exists.',
        details: null
      }
    });
    return;
  }

  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    res.status(404).json({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Referenced resource was not found.',
        details: null
      }
    });
    return;
  }

  // Handle JSON syntax parsing errors from express.json()
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON payload in request body.',
        details: null
      }
    });
    return;
  }

  // Default fallback for unexpected errors
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled internal error:', err);
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
      details: null
    }
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The route ${req.method} ${req.originalUrl} does not exist.`,
      details: null
    }
  });
}
