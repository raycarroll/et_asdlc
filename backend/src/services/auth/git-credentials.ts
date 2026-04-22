// Git Credential Helper
// Provides token-based authentication for git operations
// Based on specs/001-idea-spec-workflow/spec.md (FR-010)

import { logger } from '../../utils/logger.js';
import type { TokenPayload } from './jwt.js';

export interface GitCredentials {
  username: string;
  email: string;
  token?: string;
  sshKey?: string;
}

export interface CredentialHelperConfig {
  protocol: 'https' | 'ssh';
  host: string;
  username?: string;
  password?: string;
}

/**
 * Extract git credentials from JWT token payload
 */
export function extractGitCredentials(payload: TokenPayload): GitCredentials {
  logger.debug('Extracting git credentials from token', {
    userId: payload.userId,
    email: payload.email,
  });

  // Extract username from email (part before @)
  const username = payload.email.split('@')[0];

  return {
    username,
    email: payload.email,
  };
}

/**
 * Generate git credential helper response for HTTPS authentication
 * Format: https://git-scm.com/docs/git-credential
 */
export function generateCredentialResponse(
  config: CredentialHelperConfig
): string {
  const lines: string[] = [];

  if (config.protocol) {
    lines.push(`protocol=${config.protocol}`);
  }
  if (config.host) {
    lines.push(`host=${config.host}`);
  }
  if (config.username) {
    lines.push(`username=${config.username}`);
  }
  if (config.password) {
    lines.push(`password=${config.password}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Parse git credential helper request
 * Format: https://git-scm.com/docs/git-credential
 */
export function parseCredentialRequest(input: string): {
  protocol?: string;
  host?: string;
  path?: string;
  username?: string;
  password?: string;
} {
  const lines = input.split('\n').filter((line) => line.trim() !== '');
  const result: Record<string, string> = {};

  for (const line of lines) {
    const [key, value] = line.split('=');
    if (key && value) {
      result[key.trim()] = value.trim();
    }
  }

  logger.debug('Parsed git credential request', result);

  return result;
}

/**
 * Generate git configuration for user identity
 */
export function generateGitConfig(credentials: GitCredentials): {
  'user.name': string;
  'user.email': string;
} {
  return {
    'user.name': credentials.username,
    'user.email': credentials.email,
  };
}

/**
 * Validate that git credentials match required format
 */
export function validateGitCredentials(
  credentials: GitCredentials
): { valid: boolean; error?: string } {
  if (!credentials.username || credentials.username.trim() === '') {
    return {
      valid: false,
      error: 'Username is required',
    };
  }

  if (!credentials.email || credentials.email.trim() === '') {
    return {
      valid: false,
      error: 'Email is required',
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(credentials.email)) {
    return {
      valid: false,
      error: 'Invalid email format',
    };
  }

  return { valid: true };
}

/**
 * Create credential helper configuration for HTTPS git operations
 * Uses token as password for GitHub/GitLab authentication
 */
export function createHttpsCredentialHelper(
  credentials: GitCredentials,
  token: string,
  host: string = 'github.com'
): CredentialHelperConfig {
  return {
    protocol: 'https',
    host,
    username: credentials.username,
    password: token,
  };
}

/**
 * Check if git repository URL requires authentication
 */
export function requiresAuthentication(repoUrl: string): boolean {
  // SSH URLs (git@github.com:org/repo.git)
  if (repoUrl.startsWith('git@') || repoUrl.startsWith('ssh://')) {
    return true;
  }

  // HTTPS URLs (https://github.com/org/repo.git)
  if (repoUrl.startsWith('https://') || repoUrl.startsWith('http://')) {
    return true;
  }

  // Local paths don't require auth
  if (repoUrl.startsWith('/') || repoUrl.startsWith('./')) {
    return false;
  }

  // Default to requiring auth for safety
  return true;
}

/**
 * Extract host from git repository URL
 */
export function extractGitHost(repoUrl: string): string | null {
  // SSH format: git@github.com:org/repo.git
  const sshMatch = repoUrl.match(/^(?:ssh:\/\/)?git@([^:\/]+)/);
  if (sshMatch) {
    return sshMatch[1];
  }

  // HTTPS format: https://github.com/org/repo.git
  const httpsMatch = repoUrl.match(/^https?:\/\/([^\/]+)/);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  logger.warn('Could not extract host from git URL', { repoUrl });
  return null;
}

/**
 * Build git remote URL with embedded credentials for HTTPS
 * Format: https://username:token@github.com/org/repo.git
 */
export function buildAuthenticatedUrl(
  repoUrl: string,
  credentials: GitCredentials,
  token: string
): string {
  // Only works for HTTPS URLs
  if (!repoUrl.startsWith('https://') && !repoUrl.startsWith('http://')) {
    logger.warn('Cannot embed credentials in non-HTTPS URL', { repoUrl });
    return repoUrl;
  }

  // Extract protocol and rest of URL
  const match = repoUrl.match(/^(https?:\/\/)(.+)$/);
  if (!match) {
    return repoUrl;
  }

  const [, protocol, rest] = match;

  // Build authenticated URL
  const authenticatedUrl = `${protocol}${credentials.username}:${token}@${rest}`;

  logger.debug('Built authenticated URL', {
    original: repoUrl,
    hasCredentials: true,
  });

  return authenticatedUrl;
}

/**
 * Sanitize git URL for logging (remove embedded credentials)
 */
export function sanitizeGitUrl(url: string): string {
  // Remove username:password@ from HTTPS URLs
  return url.replace(
    /^(https?:\/\/)[^@]+@(.+)$/,
    '$1***:***@$2'
  );
}
