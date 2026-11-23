import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error({
    err: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      name: err.name,
      code: err.code,
    },
    url: req.originalUrl,
    method: req.method,
  }, 'Request error encountered');

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed.',
        details,
      },
    });
  }

  // Multer errors (e.g. file size limit)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'File size exceeds maximum allowed limit (10MB).',
        },
      });
    }
    return res.status(400).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: `Resource with duplicate field already exists: ${fields.join(', ')}`,
      },
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        details,
      },
    });
  }

  // Custom HTTP errors
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const errorCode = err.errorCode || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: err.message || 'An unexpected internal error occurred.',
      details: err.details || undefined,
    },
  });
}
