import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

const INVALID_KEY_RESPONSE = {
  message: 'Unauthorized request',
};

const extractToken = (req: Request): string | null => {
  const headerKey = req.get('x-api-key');
  if (headerKey) {
    return headerKey.trim();
  }

  const authorization = req.get('authorization');
  if (authorization) {
    const [schema, token] = authorization.split(' ');
    if (schema?.toLowerCase() === 'bearer' && token) {
      return token.trim();
    }
  }

  return null;
};

export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token || token !== config.SERVER_API_KEY) {
    return res.status(401).json(INVALID_KEY_RESPONSE);
  }
  return next();
};
