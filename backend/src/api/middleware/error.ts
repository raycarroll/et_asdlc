// Error Handling Middleware
// Based on FR-017: Provide clear error messages when operations fail

import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Create a structured error object
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: Record<string, unknown>
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code || 'INTERNAL_ERROR';
  error.details = details;
  return error;
}

/**
 * Global error handling middleware
 * Catches all errors and returns standardized JSON error response
 * Based on contracts/api.md error response format
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error for debugging (will use proper logger in production)
  console.error('Error:', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    error: {
      code,
      message: err.message,
      details: err.details,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Not Found (404) handler
 * Returns 404 error for undefined routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = createError(`Route not found: ${req.method} ${req.path}`, 404, 'NOT_FOUND');
  next(error);
}

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error middleware
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error helper
 */
export function validationError(field: string, reason: string): AppError {
  return createError('Validation failed', 400, 'VALIDATION_ERROR', {
    field,
    reason,
  });
}

/**
 * Not found error helper
 */
export function notFoundError(resource: string, id: string): AppError {
  return createError(`${resource} not found`, 404, 'NOT_FOUND', {
    resource,
    id,
  });
}

/**
 * Conflict error helper (for duplicate resources)
 */
export function conflictError(resource: string, field: string, value: string): AppError {
  return createError(`${resource} already exists`, 409, 'CONFLICT', {
    resource,
    field,
    value,
  });
}

/**
 * Atomic transaction failure error (FR-018)
 */
export function transactionError(
  operation: 'git' | 'database',
  message: string
): AppError {
  return createError(
    `Transaction failed during ${operation} operation: ${message}`,
    500,
    'TRANSACTION_FAILURE',
    {
      failedOperation: operation,
      rollbackRequired: true,
    }
  );
}
