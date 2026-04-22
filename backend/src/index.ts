// Backend Application Entry Point

import { startServer } from './api/index.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    logger.info('Starting application...');
    await startServer();
  } catch (error) {
    logger.error('Failed to start application', error as Error);
    process.exit(1);
  }
}

main();
