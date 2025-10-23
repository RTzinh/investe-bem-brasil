import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logger.js';

type ExpressError = Error & {
  status?: number;
  details?: unknown;
};

export const errorHandler = (
  err: ExpressError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const status = err.status && err.status >= 400 ? err.status : 500;

  logger.error(
    {
      err,
      status,
      path: req.path,
      method: req.method,
      details: err.details,
    },
    err.message,
  );

  if (res.headersSent) {
    return res.end();
  }

  return res.status(status).json({
    message: status >= 500 ? 'Internal server error' : err.message,
    ...(status < 500 && err.details ? { details: err.details } : {}),
  });
};
