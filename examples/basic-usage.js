#!/usr/bin/env node

/**
 * Basic Usage Example for GenAss
 *
 * This example demonstrates how to use GenAss programmatically
 * to scan a project and generate assets.
 */

const { GenAssManager } = require('../dist');
const path = require('path');

async function basicExample() {
  console.log('🚀 GenAss Basic Usage Example\n');

  try {
    // Initialize GenAss Manager
    const manager = new GenAssManager();

    // Set up the project path (current directory for this example)
    const projectPath = process.cwd();
    console.log(`📁 Scanning project: ${projectPath}\n`);

    // Initialize with project path
    await manager.initialize(projectPath);

    // Run the full workflow
    console.log('🔍 Starting full asset generation workflow...\n');
    await manager.fullWorkflow();

    console.log('✅ Asset generation completed successfully!\n');

  } catch (error) {
    console.error('❌ Error during asset generation:', error.message);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  basicExample().catch(console.error);
}

module.exports = { basicExample };