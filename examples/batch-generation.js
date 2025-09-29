#!/usr/bin/env node

/**
 * Batch Generation Example for GenAss
 *
 * This example demonstrates how to generate multiple assets
 * efficiently with custom parameters and batch processing.
 */

const { ImagenGenerator, AssetAnalyzer } = require('../dist');
const path = require('path');

async function batchGenerationExample() {
  console.log('🔄 GenAss Batch Generation Example\n');

  try {
    // Initialize services
    const generator = new ImagenGenerator();
    const analyzer = new AssetAnalyzer();

    await generator.initialize();

    // Define custom asset needs for batch generation
    const customAssets = [
      {
        type: 'icon',
        description: 'Home navigation icon',
        context: 'Main navigation bar icon for home page',
        dimensions: { width: 24, height: 24, aspectRatio: '1:1' },
        usage: ['navigation', 'header'],
        priority: 'high',
        suggestedPrompt: 'Minimalist house icon with clean lines, modern flat design style',
        filePath: 'icons/home.svg'
      },
      {
        type: 'icon',
        description: 'Settings gear icon',
        context: 'Settings page icon for configuration',
        dimensions: { width: 24, height: 24, aspectRatio: '1:1' },
        usage: ['navigation', 'settings'],
        priority: 'high',
        suggestedPrompt: 'Clean gear/cog icon with modern design, suitable for settings',
        filePath: 'icons/settings.svg'
      },
      {
        type: 'logo',
        description: 'Company logo with text',
        context: 'Main brand logo for header and marketing',
        dimensions: { width: 200, height: 60, aspectRatio: '10:3' },
        usage: ['header', 'branding', 'marketing'],
        priority: 'high',
        suggestedPrompt: 'Professional company logo with modern typography and clean design',
        filePath: 'branding/logo.png'
      },
      {
        type: 'banner',
        description: 'Hero section background',
        context: 'Landing page hero section background image',
        dimensions: { width: 1200, height: 600, aspectRatio: '2:1' },
        usage: ['landing page', 'hero section'],
        priority: 'medium',
        suggestedPrompt: 'Modern gradient background with subtle geometric patterns, professional and clean',
        filePath: 'backgrounds/hero-bg.jpg'
      },
      {
        type: 'illustration',
        description: 'Empty state illustration',
        context: 'Friendly illustration for when no data is available',
        dimensions: { width: 400, height: 300, aspectRatio: '4:3' },
        usage: ['empty states', 'no data'],
        priority: 'low',
        suggestedPrompt: 'Friendly empty state illustration with soft colors and approachable design',
        filePath: 'illustrations/empty-state.svg'
      }
    ];

    console.log(`📦 Preparing to generate ${customAssets.length} assets in batch\n`);

    // Enhance asset needs with analyzer
    console.log('🧠 Enhancing asset specifications...');
    const enhancedAssets = await analyzer.enhanceAssetNeeds({
      projectType: 'React',
      frameworks: ['React', 'Tailwind CSS'],
      existingAssets: [],
      missingAssets: customAssets,
      assetDirectories: ['public/assets'],
      recommendations: []
    }, customAssets);

    console.log(`✅ Enhanced ${enhancedAssets.length} asset specifications\n`);

    // Set up generation options
    const outputDir = path.join(process.cwd(), 'example-generated-assets');
    const options = {
      outputDir,
      format: 'png',
      quality: 90,
      maxRetries: 3
    };

    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`🎨 Format: ${options.format} (Quality: ${options.quality}%)`);
    console.log(`🔄 Concurrency: 3 assets at a time\n`);

    // Generate assets in batch
    console.log('🎨 Starting batch generation...\n');
    const startTime = Date.now();

    const results = await generator.generateMultipleAssets(
      enhancedAssets,
      options,
      3 // Concurrency limit
    );

    const totalTime = Date.now() - startTime;

    // Display results
    console.log('\n📊 Batch Generation Results:\n');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s\n`);

    // Show successful generations
    if (successful.length > 0) {
      console.log('✅ Successfully Generated Assets:');
      successful.forEach(result => {
        console.log(`   • ${result.assetNeed.type}: ${result.assetNeed.description}`);
        console.log(`     Path: ${result.filePath}`);
        console.log(`     Cost: $${result.metadata.cost.toFixed(3)}`);
        console.log(`     Time: ${(result.metadata.generationTime / 1000).toFixed(1)}s\n`);
      });
    }

    // Show failed generations
    if (failed.length > 0) {
      console.log('❌ Failed Generations:');
      failed.forEach(result => {
        console.log(`   • ${result.assetNeed.type}: ${result.assetNeed.description}`);
        console.log(`     Error: ${result.error}\n`);
      });
    }

    // Calculate total cost
    const totalCost = results.reduce((sum, r) => sum + r.metadata.cost, 0);
    console.log(`💰 Total Cost: $${totalCost.toFixed(3)}`);

    console.log('\n🎉 Batch generation example completed!');

  } catch (error) {
    console.error('❌ Error during batch generation example:', error.message);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  batchGenerationExample().catch(console.error);
}

module.exports = { batchGenerationExample };