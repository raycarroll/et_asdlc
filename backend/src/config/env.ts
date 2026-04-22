// Environment Configuration Management
// Based on specs/001-idea-spec-workflow/quickstart.md

export interface AppConfig {
  // Database
  database: {
    url: string;
    poolSize: number;
  };

  // Git Repositories
  git: {
    ideasRepoUrl: string;
    ideasRepoPath: string;
    templatesRepoUrl: string;
    templatesRepoPath: string;
  };

  // Authentication
  auth: {
    jwtSecret: string;
    jwtExpiration: string;
  };

  // API
  api: {
    port: number;
    baseUrl: string;
    corsOrigin?: string;
  };

  // Templates
  templates?: {
    repoUrl: string;
    localPath: string;
  };

  // Workers
  workers?: {
    templateSyncIntervalMs?: number;
  };

  // Template Updates
  templateUpdate: {
    intervalHours: number;
    cachePath: string;
  };

  // Logging
  log: {
    level: string;
  };
}

/**
 * Load and validate environment configuration
 * Throws error if required variables are missing
 */
export function loadConfig(): AppConfig {
  const requiredVars = [
    'DATABASE_URL',
    'IDEAS_REPO_URL',
    'TEMPLATES_REPO_URL',
    'JWT_SECRET',
  ];

  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please create a .env file or set these variables in your environment.\n' +
        'See specs/001-idea-spec-workflow/quickstart.md for details.'
    );
  }

  return {
    database: {
      url: process.env.DATABASE_URL!,
      poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '20', 10),
    },

    git: {
      ideasRepoUrl: process.env.IDEAS_REPO_URL!,
      ideasRepoPath: process.env.IDEAS_REPO_PATH || './data/ideas-repo',
      templatesRepoUrl: process.env.TEMPLATES_REPO_URL!,
      templatesRepoPath: process.env.TEMPLATES_REPO_PATH || './data/templates-repo',
    },

    auth: {
      jwtSecret: process.env.JWT_SECRET!,
      jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    },

    api: {
      port: parseInt(process.env.API_PORT || '3001', 10),
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
      corsOrigin: process.env.CORS_ORIGIN,
    },

    templates: {
      repoUrl: process.env.TEMPLATES_REPO_URL!,
      localPath: process.env.TEMPLATES_REPO_PATH || './data/templates-repo',
    },

    workers: {
      templateSyncIntervalMs: parseInt(process.env.TEMPLATE_SYNC_INTERVAL_MS || '3600000', 10),
    },

    templateUpdate: {
      intervalHours: parseInt(process.env.TEMPLATE_UPDATE_INTERVAL_HOURS || '24', 10),
      cachePath: process.env.TEMPLATE_UPDATE_CACHE_PATH || './data/template-cache.json',
    },

    log: {
      level: process.env.LOG_LEVEL || 'info',
    },
  };
}

/**
 * Validate configuration values
 * Throws error if any values are invalid
 */
export function validateConfig(config: AppConfig): void {
  if (config.database.poolSize < 1 || config.database.poolSize > 100) {
    throw new Error('DATABASE_POOL_SIZE must be between 1 and 100');
  }

  if (config.api.port < 1 || config.api.port > 65535) {
    throw new Error('API_PORT must be between 1 and 65535');
  }

  if (config.templateUpdate.intervalHours < 1) {
    throw new Error('TEMPLATE_UPDATE_INTERVAL_HOURS must be at least 1');
  }

  if (config.auth.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters for security');
  }
}

/**
 * Get configuration singleton
 * Loads, validates, and caches configuration on first call
 */
let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
    validateConfig(cachedConfig);
  }
  return cachedConfig;
}

/**
 * Create example .env file content
 */
export function generateExampleEnv(): string {
  return `# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ideas
DATABASE_POOL_SIZE=20

# Git Repository
IDEAS_REPO_URL=git@github.com:org/ideas-repository.git
IDEAS_REPO_PATH=./data/ideas-repo
TEMPLATES_REPO_URL=git@github.com:org/idea-templates.git
TEMPLATES_REPO_PATH=./data/templates-repo

# Authentication
JWT_SECRET=your-secret-key-here-minimum-32-characters-long
JWT_EXPIRATION=24h

# API
API_PORT=3001
API_BASE_URL=http://localhost:3001

# Template Updates
TEMPLATE_UPDATE_INTERVAL_HOURS=24
TEMPLATE_UPDATE_CACHE_PATH=./data/template-cache.json

# Logging
LOG_LEVEL=info
`;
}
