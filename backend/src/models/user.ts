// User Model
// Based on specs/001-idea-spec-workflow/data-model.md

import type { UserRole } from '../../../shared/types/api.js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: Date;
  last_login: Date | null;
}

/**
 * Convert database record to domain model
 */
export function toDomain(record: UserRecord): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    createdAt: record.created_at,
    lastLogin: record.last_login,
  };
}

/**
 * Convert domain model to database record
 */
export function toDatabase(user: User): Partial<UserRecord> {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    last_login: user.lastLogin,
  };
}

/**
 * Validate email format (RFC 5322 basic validation)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate user role
 */
export function isValidRole(role: string): role is UserRole {
  return role === 'user' || role === 'administrator';
}

/**
 * Create a new user with default values
 */
export function createUser(params: {
  email: string;
  name: string;
  role?: UserRole;
}): User {
  if (!isValidEmail(params.email)) {
    throw new Error('Invalid email format');
  }

  return {
    id: crypto.randomUUID(),
    email: params.email,
    name: params.name,
    role: params.role || 'user',
    createdAt: new Date(),
    lastLogin: null,
  };
}

/**
 * Update last login timestamp
 */
export function updateLastLogin(user: User): User {
  return {
    ...user,
    lastLogin: new Date(),
  };
}

/**
 * Check if user is administrator
 */
export function isAdmin(user: User): boolean {
  return user.role === 'administrator';
}
