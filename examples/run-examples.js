#!/usr/bin/env node

/**
 * Example Runner for GenAss
 *
 * This script allows you to run different GenAss examples
 * to understand various usage patterns.
 */

const { basicExample } = require('./basic-usage');
const { customConfigExample } = require('./custom-config');
const { batchGenerationExample } = require('./batch-generation');

// Handle chalk import for different versions
let chalk;
try {
  chalk = require('chalk');
} catch (error) {
  // Fallback for when chalk is not available
  chalk = {
    blue: (str) => str,
    cyan: (str) => str,
    green: (str) => str,
    yellow: (str) => str,
    red: (str) => str,
    gray: (str) => str
  };
}

// Handle inquirer import
let inquirer;
try {
  inquirer = require('inquirer');
} catch (error) {
  console.log('⚠️  inquirer not available. Please install dependencies first: npm install');
  process.exit(1);
}

async function runExamples() {
  console.log(chalk.blue('🎯 GenAss Examples Runner\n'));

  try {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'example',
        message: 'Which example would you like to run?',
        choices: [
          {
            name: '🚀 Basic Usage - Simple project scan and generation',
            value: 'basic'
          },
          {
            name: '⚙️  Custom Configuration - Advanced setup with custom options',
            value: 'config'
          },
          {
            name: '🔄 Batch Generation - Generate multiple assets efficiently',
            value: 'batch'
          },
          {
            name: '🏃 Run All Examples - Execute all examples in sequence',
            value: 'all'
          },
          {
            name: '❌ Exit',
            value: 'exit'
          }
        ]
      }
    ]);

    if (answers.example === 'exit') {
      console.log(chalk.yellow('👋 Goodbye!'));
      return;
    }

    console.log('\n' + chalk.cyan('=' * 60) + '\n');

    switch (answers.example) {
      case 'basic':
        await basicExample();
        break;

      case 'config':
        await customConfigExample();
        break;

      case 'batch':
        await batchGenerationExample();
        break;

      case 'all':
        console.log(chalk.green('🏃 Running all examples...\n'));

        console.log(chalk.blue('1️⃣  Running Basic Usage Example...\n'));
        await basicExample();

        console.log('\n' + chalk.cyan('=' * 60) + '\n');

        console.log(chalk.blue('2️⃣  Running Custom Configuration Example...\n'));
        await customConfigExample();

        console.log('\n' + chalk.cyan('=' * 60) + '\n');

        console.log(chalk.blue('3️⃣  Running Batch Generation Example...\n'));
        await batchGenerationExample();

        console.log('\n' + chalk.green('🎉 All examples completed successfully!'));
        break;

      default:
        console.log(chalk.red('❌ Unknown example selected'));
        return;
    }

    console.log('\n' + chalk.cyan('=' * 60) + '\n');
    console.log(chalk.green('✅ Example completed successfully!\n'));

    // Ask if user wants to run another example
    const runAgain = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Would you like to run another example?',
        default: false
      }
    ]);

    if (runAgain.continue) {
      console.log('\n');
      await runExamples();
    } else {
      console.log(chalk.yellow('\n👋 Thanks for trying GenAss examples!'));
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Error running examples:'), error.message);

    if (error.message.includes('API key') || error.message.includes('authentication')) {
      console.log(chalk.yellow('\n💡 Tip: Make sure your API keys are configured:'));
      console.log(chalk.gray('   genass config --setup\n'));
    }

    process.exit(1);
  }
}

// Helper function to show environment setup instructions
function showSetupInstructions() {
  console.log(chalk.yellow('📋 Setup Instructions:\n'));
  console.log('1. Configure your environment variables:');
  console.log(chalk.gray('   cp .env.example .env'));
  console.log(chalk.gray('   # Edit .env with your API keys\n'));

  console.log('2. Or run the setup wizard:');
  console.log(chalk.gray('   genass config --setup\n'));

  console.log('3. Required APIs:');
  console.log(chalk.gray('   • Anthropic Claude API key'));
  console.log(chalk.gray('   • Google Cloud Project with Vertex AI enabled'));
  console.log(chalk.gray('   • Service account with proper permissions\n'));
}

// Show help information
function showHelp() {
  console.log(chalk.blue('🔧 GenAss Examples Help\n'));

  console.log('Available Examples:');
  console.log('• basic-usage.js     - Simple project scanning and asset generation');
  console.log('• custom-config.js   - Advanced configuration and customization');
  console.log('• batch-generation.js - Efficient batch processing of multiple assets\n');

  console.log('Usage:');
  console.log('  node examples/run-examples.js    # Interactive runner');
  console.log('  node examples/basic-usage.js     # Run specific example');
  console.log('  node examples/custom-config.js   # Run specific example');
  console.log('  node examples/batch-generation.js # Run specific example\n');

  showSetupInstructions();
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (process.argv.includes('--setup')) {
  showSetupInstructions();
  process.exit(0);
}

// Run the examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(error => {
    console.error(chalk.red('❌ Fatal error:'), error.message);
    process.exit(1);
  });
}

module.exports = { runExamples, showHelp, showSetupInstructions };