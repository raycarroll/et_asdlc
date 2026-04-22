// Database Seed Script
// Creates initial test users for development
// Based on specs/001-idea-spec-workflow/spec.md

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { getConfig } from '../config/env.js';
import { logger } from '../utils/logger.js';

const SALT_ROUNDS = 10;

interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'administrator';
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'administrator',
  },
  {
    email: 'user@example.com',
    password: 'user123',
    name: 'Test User',
    role: 'user',
  },
];

/**
 * Seed database with test users
 */
async function seed() {
  const config = getConfig();
  const pool = new Pool({
    connectionString: config.database.url,
  });

  try {
    logger.info('Starting database seed');

    for (const user of SEED_USERS) {
      // Check if user already exists
      const existing = await pool.query(
        `SELECT id FROM users WHERE email = $1`,
        [user.email]
      );

      if (existing.rows.length > 0) {
        logger.info('User already exists, skipping', { email: user.email });
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

      // Insert user
      await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)`,
        [user.email, passwordHash, user.name, user.role]
      );

      logger.info('User created', {
        email: user.email,
        role: user.role,
      });

      console.log(`✓ Created ${user.role}: ${user.email} (password: ${user.password})`);
    }

    logger.info('Database seed completed');
    console.log('\n✅ Seed completed successfully\n');
    console.log('Test credentials:');
    console.log('- Admin: admin@example.com / admin123');
    console.log('- User:  user@example.com / user123\n');
  } catch (error) {
    logger.error('Seed failed', { error });
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default seed;
