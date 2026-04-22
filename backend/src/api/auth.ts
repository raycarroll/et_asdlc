// Authentication API Endpoints
// Handles user login, token refresh, and registration
// Based on specs/001-idea-spec-workflow/contracts/api.md

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { AuthService } from '../services/auth/auth.js';
import { logger } from '../utils/logger.js';
import { authenticate } from './middleware/auth.js';

/**
 * Create authentication router
 */
export function createAuthRouter(pool: Pool): Router {
  const router = Router();
  const authService = new AuthService(pool);

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return JWT token
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Email and password are required',
        });
      }

      // Authenticate
      const result = await authService.login(email, password);

      res.json({
        token: result.token,
        expiresAt: result.expiresAt,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';

      if (errorMessage === 'Invalid email or password') {
        return res.status(401).json({
          error: 'Authentication Failed',
          message: errorMessage,
        });
      }

      logger.error('Login endpoint error', { error });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed',
      });
    }
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh authentication token
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Token is required',
        });
      }

      // Refresh token
      const result = await authService.refreshToken(token);

      res.json({
        token: result.token,
        expiresAt: result.expiresAt,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
      });
    } catch (error) {
      logger.error('Token refresh endpoint error', { error });

      res.status(401).json({
        error: 'Authentication Failed',
        message: 'Token refresh failed',
      });
    }
  });

  /**
   * POST /api/v1/auth/register
   * Create new user account (for development/testing)
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { email, password, name, role } = req.body;

      // Validate input
      if (!email || !password || !name) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Email, password, and name are required',
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Password must be at least 8 characters',
        });
      }

      // Create user
      const user = await authService.createUser(email, password, name, role);

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        message: 'User created successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';

      if (errorMessage === 'Email already exists') {
        return res.status(409).json({
          error: 'Conflict',
          message: errorMessage,
        });
      }

      logger.error('Registration endpoint error', { error });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'User creation failed',
      });
    }
  });

  /**
   * GET /api/v1/auth/me
   * Get current user info (requires authentication)
   */
  router.get('/me', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;

      const user = await authService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      logger.error('Get current user endpoint error', { error });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get user info',
      });
    }
  });

  /**
   * POST /api/v1/auth/change-password
   * Change user password (requires authentication)
   */
  router.post('/change-password', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Current password and new password are required',
        });
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'New password must be at least 8 characters',
        });
      }

      // Change password
      await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        message: 'Password changed successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';

      if (errorMessage === 'Current password is incorrect') {
        return res.status(401).json({
          error: 'Authentication Failed',
          message: errorMessage,
        });
      }

      logger.error('Change password endpoint error', { error });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Password change failed',
      });
    }
  });

  return router;
}

export default createAuthRouter;
