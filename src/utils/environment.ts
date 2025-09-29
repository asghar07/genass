import chalk from 'chalk';
import { logger } from './logger';

interface EnvironmentCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  description: string;
}

export function validateEnvironment(): boolean {
  const checks: EnvironmentCheck[] = [
    {
      name: 'GEMINI_API_KEY',
      value: process.env.GEMINI_API_KEY,
      required: true,
      description: 'Google Gemini API key for AI-powered codebase analysis and Nano Banana image generation'
    }
  ];

  let isValid = true;
  const missing: string[] = [];
  const warnings: string[] = [];

  console.log(chalk.blue('\n🔍 Environment Validation:\n'));

  checks.forEach(check => {
    if (check.required && !check.value) {
      console.log(chalk.red(`❌ ${check.name}: MISSING (required)`));
      console.log(chalk.gray(`   ${check.description}\n`));
      missing.push(check.name);
      isValid = false;
    } else if (check.required && check.value) {
      console.log(chalk.green(`✅ ${check.name}: SET`));
    } else if (!check.required && !check.value) {
      console.log(chalk.yellow(`⚠️  ${check.name}: NOT SET (optional)`));
      console.log(chalk.gray(`   ${check.description}\n`));
      warnings.push(check.name);
    } else {
      console.log(chalk.green(`✅ ${check.name}: SET`));
    }
  });

  if (!isValid) {
    console.log(chalk.red('\n❌ Environment validation failed!\n'));
    console.log(chalk.yellow('Missing required environment variables:'));
    missing.forEach(name => {
      console.log(chalk.yellow(`  - ${name}`));
    });

    console.log(chalk.cyan('\n📋 Setup Instructions:'));
    console.log('1. Copy .env.example to .env:');
    console.log(chalk.gray('   cp .env.example .env\n'));

    console.log('2. Configure your API keys:');
    if (missing.includes('GEMINI_API_KEY')) {
      console.log(chalk.gray('   - Get your Gemini API key from: https://aistudio.google.com/apikey'));
      console.log(chalk.gray('   - Sign in with your Google account and generate a new API key'));
    }

    console.log(chalk.cyan('\n3. Run the setup wizard:'));
    console.log(chalk.gray('   genass config --setup\n'));

    logger.error('Environment validation failed', { missing, warnings });
    return false;
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Optional configurations:'));
    warnings.forEach(name => {
      console.log(chalk.yellow(`  - ${name}`));
    });
  }

  console.log(chalk.green('\n✅ Environment validation passed!\n'));
  logger.info('Environment validation successful', { warnings });
  return true;
}

export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function getOptionalEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}