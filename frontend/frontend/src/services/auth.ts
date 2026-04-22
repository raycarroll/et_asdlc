// Authentication Service
// Token management and storage for frontend
// Based on specs/001-idea-spec-workflow/spec.md (FR-001, FR-020)

import { jwtDecode } from 'jwt-decode';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'user' | 'administrator';
  exp: number; // Expiration timestamp (seconds since epoch)
  iat: number; // Issued at timestamp
  iss: string; // Issuer
  aud: string; // Audience
}

const TOKEN_KEY = 'auth_token';
const EXPIRES_AT_KEY = 'auth_expires_at';

/**
 * Get stored authentication token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store authentication token
 */
export function setToken(token: string, expiresAt: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRES_AT_KEY, expiresAt);
}

/**
 * Clear stored authentication token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  const token = getToken();

  if (!token) {
    return false;
  }

  // Check if token is expired
  if (isTokenExpired(token)) {
    clearToken();
    return false;
  }

  return true;
}

/**
 * Decode JWT token and get payload
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    return decoded;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Get current user information from token
 */
export function getCurrentUser(): TokenPayload | null {
  const token = getToken();

  if (!token) {
    return null;
  }

  return decodeToken(token);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);

  if (!payload) {
    return true;
  }

  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = payload.exp * 1000;
  const now = Date.now();

  // Consider token expired if it expires within the next 60 seconds
  const bufferTime = 60 * 1000; // 60 seconds

  return expirationTime < now + bufferTime;
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(): Date | null {
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);

  if (!expiresAt) {
    return null;
  }

  return new Date(expiresAt);
}

/**
 * Check if user has administrator role
 */
export function isAdmin(): boolean {
  const user = getCurrentUser();

  if (!user) {
    return false;
  }

  return user.role === 'administrator';
}

/**
 * Check if user has specific role
 */
export function hasRole(role: 'user' | 'administrator'): boolean {
  const user = getCurrentUser();

  if (!user) {
    return false;
  }

  return user.role === role;
}

/**
 * Logout user (clear token and redirect to login)
 */
export function logout(): void {
  clearToken();

  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * Calculate remaining time until token expiration
 * Returns milliseconds
 */
export function getTimeUntilExpiration(): number | null {
  const token = getToken();

  if (!token) {
    return null;
  }

  const payload = decodeToken(token);

  if (!payload) {
    return null;
  }

  const expirationTime = payload.exp * 1000;
  const now = Date.now();

  return Math.max(0, expirationTime - now);
}

/**
 * Check if token should be refreshed
 * Returns true if token expires within the next 5 minutes
 */
export function shouldRefreshToken(): boolean {
  const timeUntilExpiration = getTimeUntilExpiration();

  if (timeUntilExpiration === null) {
    return false;
  }

  // Refresh if less than 5 minutes remaining
  const fiveMinutes = 5 * 60 * 1000;

  return timeUntilExpiration < fiveMinutes;
}
