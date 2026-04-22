// Rate Limiting Middleware
// Prevents abuse by limiting request rates per IP/user
// Based on specs/001-idea-spec-workflow/contracts/api.md (1000/hour authenticated, 100/hour unauthenticated)

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate limiter implementation using in-memory store
 * For production, consider using Redis for distributed rate limiting
 */
export class RateLimiter {
  private store: Map<string, RateLimitEntry>;
  private authenticatedLimit: number;
  private unauthenticatedLimit: number;
  private windowMs: number;

  constructor(
    authenticatedLimit: number = 1000,
    unauthenticatedLimit: number = 100,
    windowMs: number = 60 * 60 * 1000 // 1 hour
  ) {
    this.store = new Map();
    this.authenticatedLimit = authenticatedLimit;
    this.unauthenticatedLimit = unauthenticatedLimit;
    this.windowMs = windowMs;

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get or create rate limit entry for a key
   */
  private getEntry(key: string): RateLimitEntry {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      // Create new entry or reset expired one
      const newEntry: RateLimitEntry = {
        count: 0,
        resetTime: now + this.windowMs,
      };
      this.store.set(key, newEntry);
      return newEntry;
    }

    return entry;
  }

  /**
   * Check if request should be rate limited
   *
   * @param key - Identifier for the rate limit (IP or user ID)
   * @param isAuthenticated - Whether the request is authenticated
   * @returns true if request should be allowed
   */
  checkLimit(key: string, isAuthenticated: boolean): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  } {
    const entry = this.getEntry(key);
    const limit = isAuthenticated
      ? this.authenticatedLimit
      : this.unauthenticatedLimit;

    // Increment count
    entry.count++;

    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);

    return {
      allowed,
      limit,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries from store
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned up expired rate limit entries', { cleaned });
    }
  }

  /**
   * Get current store size (for monitoring)
   */
  getStoreSize(): number {
    return this.store.size;
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Express middleware for rate limiting
 */
export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Determine if request is authenticated
    const isAuthenticated = !!req.headers.authorization;

    // Get rate limit key (user ID from token if authenticated, otherwise IP)
    let rateLimitKey: string;

    if (isAuthenticated && (req as any).user?.id) {
      // Use user ID from authenticated request
      rateLimitKey = `user:${(req as any).user.id}`;
    } else {
      // Use IP address for unauthenticated requests
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      rateLimitKey = `ip:${ip}`;
    }

    // Check rate limit
    const result = rateLimiter.checkLimit(rateLimitKey, isAuthenticated);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(result.resetTime).toISOString()
    );

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        rateLimitKey,
        isAuthenticated,
        limit: result.limit,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again after ${new Date(result.resetTime).toISOString()}`,
        retryAfter: result.resetTime,
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Rate limit middleware error', { error });
    // On error, allow request through (fail open)
    next();
  }
}

/**
 * Get rate limiter instance for testing/monitoring
 */
export function getRateLimiter(): RateLimiter {
  return rateLimiter;
}

export default rateLimitMiddleware;
