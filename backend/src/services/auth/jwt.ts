// JWT Authentication Service
// Based on specs/001-idea-spec-workflow/contracts/api.md and FR-001

import jwt from 'jsonwebtoken';
import type { UserRole } from '../../../../shared/types/api.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface TokenOptions {
  expiresIn?: string; // Default: from env JWT_EXPIRATION
}

/**
 * Generate a JWT token with user claims
 * @param payload User information to encode in token
 * @param options Token generation options
 * @returns Signed JWT token string
 */
export function generateToken(payload: TokenPayload, options?: TokenOptions): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  const expiresIn = options?.expiresIn || process.env.JWT_EXPIRATION || '24h';

  return (jwt.sign as any)(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    },
    secret,
    {
      expiresIn,
      issuer: 'idea-workflow-api',
      audience: 'idea-workflow-users',
    }
  );
}

/**
 * Verify and decode a JWT token
 * @param token JWT token string to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'idea-workflow-api',
      audience: 'idea-workflow-users',
    }) as jwt.JwtPayload;

    return {
      userId: decoded.userId as string,
      email: decoded.email as string,
      role: decoded.role as UserRole,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Refresh an existing token (generate new token with same claims but extended expiration)
 * @param token Current token to refresh
 * @param options Token generation options
 * @returns New JWT token string
 */
export function refreshToken(token: string, options?: TokenOptions): string {
  // Verify the current token (but ignore expiration for refresh)
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  const decoded = jwt.verify(token, secret, {
    issuer: 'idea-workflow-api',
    audience: 'idea-workflow-users',
    ignoreExpiration: true, // Allow refreshing expired tokens
  }) as jwt.JwtPayload;

  const payload: TokenPayload = {
    userId: decoded.userId as string,
    email: decoded.email as string,
    role: decoded.role as UserRole,
  };

  return generateToken(payload, options);
}

/**
 * Calculate token expiration timestamp
 * @param expiresIn Expiration duration (e.g., '24h', '7d')
 * @returns ISO 8601 timestamp string
 */
export function getTokenExpiration(expiresIn: string): string {
  const now = Date.now();
  const expiration = jwt.decode(
    (jwt.sign as any)({ test: true }, 'secret', { expiresIn })
  ) as jwt.JwtPayload;

  if (!expiration.exp) {
    throw new Error('Failed to calculate expiration');
  }

  return new Date(expiration.exp * 1000).toISOString();
}
