#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { GenAssManager } from './core/GenAssManager';
import { logger } from './utils/logger';
import { validateEnvironment } from './utils/environment';

// Load .env from the CLI package directory
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Explicitly load the correct API key from .env file (override any shell variables)
try {
  const fs = require('fs');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
  if (match && match[1]) {
    process.env.GEMINI_API_KEY = match[1].trim();
  }
} catch (error) {
  // Ignore if .env doesn't exist
}

const program = new Command();

program
  .name('genass')
  .description('AI-powered asset generation CLI using Google Gemini API and Nano Banana')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize and scan codebase for asset needs')
  .option('-p, --path <path>', 'Project path to scan', process.cwd())
  .option('--dry-run', 'Show analysis without generating plan')
  .option('--config <config>', 'Path to configuration file')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 GenAss - AI Asset Generator'));
      console.log(chalk.gray('Scanning codebase and analyzing asset needs...\n'));

      if (!validateEnvironment()) {
        process.exit(1);
      }

      const manager = new GenAssManager();
      await manager.initialize(options.path, options.config);

      if (options.dryRun) {
        await manager.analyzeOnly();
      } else {
        await manager.fullWorkflow();
      }
    } catch (error) {
      logger.error('Init command failed:', error);
      console.error(chalk.red('❌ Failed to initialize GenAss'));
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate specific assets from existing plan')
  .option('-t, --type <type>', 'Asset type to generate (icon,logo,illustration,etc.)')
  .option('-p, --priority <priority>', 'Generate assets by priority (high,medium,low)')
  .option('--plan <plan>', 'Path to generation plan file')
  .action(async (options) => {
    try {
      if (!validateEnvironment()) {
        process.exit(1);
      }

      const manager = new GenAssManager();
      await manager.generateFromPlan(options);
    } catch (error) {
      logger.error('Generate command failed:', error);
      console.error(chalk.red('❌ Asset generation failed'));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current project status and generated assets')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .action(async (options) => {
    try {
      const manager = new GenAssManager();
      await manager.showStatus(options.path);
    } catch (error) {
      logger.error('Status command failed:', error);
      console.error(chalk.red('❌ Failed to show status'));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Configure GenAss settings')
  .option('--setup', 'Interactive setup wizard')
  .action(async (options) => {
    try {
      const manager = new GenAssManager();
      if (options.setup) {
        await manager.setupWizard();
      } else {
        await manager.showConfig();
      }
    } catch (error) {
      logger.error('Config command failed:', error);
      console.error(chalk.red('❌ Configuration failed'));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});