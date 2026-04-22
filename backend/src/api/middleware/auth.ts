// Authentication Middleware
// Based on FR-001: Validate JWT tokens and extract user/role claims

import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type TokenPayload } from '../../services/auth/jwt.js';

// Extend Express Request type to include authenticated user info
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Authentication middleware - validates JWT token from Authorization header
 * Sets req.user with decoded token payload if valid
 * Returns 401 if token is missing or invalid
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must be in format: Bearer <token>',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = parts[1];
    if (!token) {
      res.status(401).json({
        error: {
          code: 'EMPTY_TOKEN',
          message: 'Token is empty',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify and decode token
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token validation failed';
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Optional authentication middleware - validates token if present but doesn't require it
 * Sets req.user if token is valid, otherwise continues without user context
 */
export function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next();
    return;
  }

  try {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
      const token = parts[1];
      const payload = verifyToken(token);
      req.user = payload;
    }
  } catch (error) {
    // Silently ignore invalid tokens in optional mode
  }

  next();
}

/**
 * Role-based authorization middleware factory
 * Returns middleware that checks if authenticated user has required role
 * Must be used after authenticate() middleware
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required role: ${roles.join(' or ')}`,
          details: {
            userRole: req.user.role,
            requiredRoles: roles,
          },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Administrator-only middleware
 * Ensures authenticated user has 'administrator' role
 */
export const requireAdmin = requireRole('administrator');
