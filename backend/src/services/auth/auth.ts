// Authentication Service
// Handles user authentication, password hashing, and token generation
// Based on specs/001-idea-spec-workflow/spec.md (FR-001, FR-020)

import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { generateToken, verifyToken, type TokenPayload } from './jwt.js';
import { logger } from '../../utils/logger.js';

const SALT_ROUNDS = 10;

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'administrator';
  createdAt: Date;
  lastLogin: Date | null;
}

export interface AuthResult {
  user: User;
  token: string;
  expiresAt: string;
}

/**
 * Authentication Service
 */
export class AuthService {
  constructor(private pool: Pool) {}

  /**
   * Authenticate user with email and password
   * Returns JWT token if successful
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Find user by email
      const result = await this.pool.query<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        role: 'user' | 'administrator';
        created_at: Date;
        last_login: Date | null;
      }>(
        `SELECT id, email, password_hash, name, role, created_at, last_login
         FROM users
         WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        logger.warn('Login attempt for non-existent user', { email });
        throw new Error('Invalid email or password');
      }

      const userRow = result.rows[0];

      // Verify password
      const isValid = await bcrypt.compare(password, userRow.password_hash);

      if (!isValid) {
        logger.warn('Invalid password attempt', { email });
        throw new Error('Invalid email or password');
      }

      // Update last login timestamp
      await this.pool.query(
        `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
        [userRow.id]
      );

      // Generate JWT token
      const payload: TokenPayload = {
        userId: userRow.id,
        email: userRow.email,
        role: userRow.role,
      };

      const token = generateToken(payload);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      const user: User = {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.role,
        createdAt: userRow.created_at,
        lastLogin: new Date(),
      };

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        user,
        token,
        expiresAt,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid email or password') {
        throw error;
      }

      logger.error('Login failed', { error, email });
      throw new Error('Authentication failed');
    }
  }

  /**
   * Refresh authentication token
   * Generates new token from existing valid token
   */
  async refreshToken(currentToken: string): Promise<AuthResult> {
    try {
      // Verify current token
      const payload = verifyToken(currentToken);

      // Fetch fresh user data
      const result = await this.pool.query<{
        id: string;
        email: string;
        name: string;
        role: 'user' | 'administrator';
        created_at: Date;
        last_login: Date | null;
      }>(
        `SELECT id, email, name, role, created_at, last_login
         FROM users
         WHERE id = $1`,
        [payload.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const userRow = result.rows[0];

      // Generate new token
      const newPayload: TokenPayload = {
        userId: userRow.id,
        email: userRow.email,
        role: userRow.role,
      };

      const token = generateToken(newPayload);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const user: User = {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.role,
        createdAt: userRow.created_at,
        lastLogin: userRow.last_login,
      };

      logger.info('Token refreshed successfully', { userId: user.id });

      return {
        user,
        token,
        expiresAt,
      };
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Create a new user account
   * Hashes password before storing
   */
  async createUser(
    email: string,
    password: string,
    name: string,
    role: 'user' | 'administrator' = 'user'
  ): Promise<User> {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert user
      const result = await this.pool.query<{
        id: string;
        email: string;
        name: string;
        role: 'user' | 'administrator';
        created_at: Date;
        last_login: Date | null;
      }>(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, role, created_at, last_login`,
        [email, passwordHash, name, role]
      );

      const userRow = result.rows[0];

      logger.info('User created successfully', {
        userId: userRow.id,
        email: userRow.email,
        role: userRow.role,
      });

      return {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.role,
        createdAt: userRow.created_at,
        lastLogin: userRow.last_login,
      };
    } catch (error) {
      logger.error('User creation failed', { error, email });

      if ((error as any).code === '23505') {
        // Unique violation
        throw new Error('Email already exists');
      }

      throw new Error('User creation failed');
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Verify current password
      const result = await this.pool.query<{ password_hash: string }>(
        `SELECT password_hash FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const isValid = await bcrypt.compare(
        currentPassword,
        result.rows[0].password_hash
      );

      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password
      await this.pool.query(
        `UPDATE users SET password_hash = $1 WHERE id = $2`,
        [newPasswordHash, userId]
      );

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Password change failed', { error, userId });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.pool.query<{
        id: string;
        email: string;
        name: string;
        role: 'user' | 'administrator';
        created_at: Date;
        last_login: Date | null;
      }>(
        `SELECT id, email, name, role, created_at, last_login
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const userRow = result.rows[0];

      return {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.role,
        createdAt: userRow.created_at,
        lastLogin: userRow.last_login,
      };
    } catch (error) {
      logger.error('Failed to get user by ID', { error, userId });
      return null;
    }
  }
}
