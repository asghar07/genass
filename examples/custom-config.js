#!/usr/bin/env node

/**
 * Custom Configuration Example for GenAss
 *
 * This example shows how to use GenAss with custom configuration
 * and selective asset generation.
 */

const { GenAssManager, ConfigManager } = require('../dist');
const path = require('path');

async function customConfigExample() {
  console.log('⚙️  GenAss Custom Configuration Example\n');

  try {
    // Create a custom configuration
    const configManager = new ConfigManager();
    const projectPath = process.cwd();

    // Load default configuration
    let config = await configManager.loadConfig(projectPath);

    // Customize the configuration
    config = {
      ...config,
      name: 'Custom GenAss Project',
      excludePatterns: [
        ...config.excludePatterns,
        'temp/**',
        'examples/**'
      ],
      assetDirectories: [
        'public/assets',
        'src/components/icons',
        'static/images'
      ],
      preferredImageFormat: 'webp',
      maxAssetSize: 1024 * 1024 * 5 // 5MB
    };

    console.log('📋 Custom Configuration:');
    console.log(`- Project: ${config.name}`);
    console.log(`- Format: ${config.preferredImageFormat}`);
    console.log(`- Asset Dirs: ${config.assetDirectories.join(', ')}`);
    console.log(`- Max Size: ${(config.maxAssetSize / 1024 / 1024).toFixed(1)}MB\n`);

    // Save the custom configuration
    await configManager.saveProjectConfig(config);
    console.log('✅ Custom configuration saved to genass.config.json\n');

    // Initialize GenAss with custom config
    const manager = new GenAssManager();
    await manager.initialize(projectPath);

    // Run analysis only (dry run)
    console.log('🔍 Running analysis with custom configuration...\n');
    await manager.analyzeOnly();

    console.log('✅ Analysis completed successfully!\n');
    console.log('💡 Tip: Run `genass init` to proceed with asset generation');

  } catch (error) {
    console.error('❌ Error during custom configuration example:', error.message);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  customConfigExample().catch(console.error);
}

module.exports = { customConfigExample };