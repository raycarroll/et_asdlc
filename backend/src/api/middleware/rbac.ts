// Role-Based Access Control Middleware
// Check administrator role from token claims
// Based on specs/001-idea-spec-workflow/spec.md (FR-015a)

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

/**
 * Middleware to require administrator role
 * Must be used after authenticate middleware
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = (req as any).user;

  if (!user) {
    logger.warn('RBAC check failed: No user in request');
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  if (user.role !== 'administrator') {
    logger.warn('RBAC check failed: User is not administrator', {
      userId: user.userId,
      role: user.role,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'Administrator role required for this operation',
    });
    return;
  }

  logger.debug('RBAC check passed: User is administrator', {
    userId: user.userId,
  });

  next();
}

/**
 * Middleware to require specific role
 */
export function requireRole(role: 'user' | 'administrator') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      logger.warn('RBAC check failed: No user in request');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (user.role !== role) {
      logger.warn('RBAC check failed: Incorrect role', {
        userId: user.userId,
        expectedRole: role,
        actualRole: user.role,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `${role} role required for this operation`,
      });
      return;
    }

    logger.debug('RBAC check passed', {
      userId: user.userId,
      role: user.role,
    });

    next();
  };
}

/**
 * Middleware to check if user has any of the specified roles
 */
export function requireAnyRole(roles: Array<'user' | 'administrator'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      logger.warn('RBAC check failed: No user in request');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(user.role)) {
      logger.warn('RBAC check failed: User role not in allowed list', {
        userId: user.userId,
        allowedRoles: roles,
        actualRole: user.role,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `One of the following roles required: ${roles.join(', ')}`,
      });
      return;
    }

    logger.debug('RBAC check passed', {
      userId: user.userId,
      role: user.role,
    });

    next();
  };
}

/**
 * Check if user is owner of a resource or administrator
 */
export function requireOwnerOrAdmin(getUserId: (req: Request) => string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const user = (req as any).user;

    if (!user) {
      logger.warn('RBAC check failed: No user in request');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Administrators can access any resource
    if (user.role === 'administrator') {
      logger.debug('RBAC check passed: User is administrator', {
        userId: user.userId,
      });
      next();
      return;
    }

    // Check if user is owner
    const ownerId = getUserId(req);

    if (user.userId === ownerId) {
      logger.debug('RBAC check passed: User is owner', {
        userId: user.userId,
        ownerId,
      });
      next();
      return;
    }

    logger.warn('RBAC check failed: User is not owner or administrator', {
      userId: user.userId,
      ownerId,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this resource',
    });
  };
}
