/**
 * Complete GenAss AI Tools Workflow Example
 * 
 * This example demonstrates the full power of GenAss with AI tools:
 * 1. Analyze project structure
 * 2. Find components needing assets
 * 3. Generate context-aware prompts
 * 4. Create assets with NanoBanana
 * 5. Update code automatically
 */

import { AIToolsIntegration } from '../src/core/AIToolsIntegration.js';
import { NanoBananaGenerator } from '../src/core/NanoBananaGenerator.js';
import * as path from 'path';
import * as fs from 'fs/promises';

async function completeWorkflowDemo(projectPath: string, apiKey: string) {
  console.log('🚀 GenAss Complete Workflow Demo\n');
  console.log('=' .repeat(60));
  
  // Step 1: Initialize AI Tools Integration
  console.log('\n📚 Step 1: Initializing AI Tools...');
  const aiTools = new AIToolsIntegration(projectPath);
  
  // Step 2: Analyze Project
  console.log('\n🔍 Step 2: Analyzing Project Structure...');
  const projectStructure = await aiTools.getProjectStructure();
  console.log(projectStructure);
  
  // Step 3: Find Assets That Need Generation
  console.log('\n🎯 Step 3: Finding Assets to Generate...');
  const analysis = await aiTools.analyzeProjectAssets();
  
  console.log(`\nFound:`);
  console.log(`  - ${analysis.missingAssets.length} missing assets`);
  console.log(`  - ${analysis.placeholders.length} placeholders`);
  console.log(`  - ${analysis.components.length} components with assets`);
  
  if (analysis.components.length > 0) {
    console.log(`\nComponents:`, analysis.components.slice(0, 5));
  }
  
  // Step 4: Analyze a Specific Component
  if (analysis.components.length > 0) {
    const componentPath = analysis.components[0];
    console.log(`\n📖 Step 4: Analyzing Component: ${path.basename(componentPath)}`);
    
    const context = await aiTools.analyzeComponent(componentPath);
    console.log(`\nComponent Context:`);
    console.log(`  Type: ${context.componentType}`);
    console.log(`  Usage: ${context.usageContext}`);
    console.log(`  Style: ${context.styleInfo}`);
    console.log(`  Dimensions: ${context.dimensions}`);
    if (context.existingAssets?.length) {
      console.log(`  Existing Assets: ${context.existingAssets.join(', ')}`);
    }
    
    // Step 5: Generate Smart Prompt
    console.log(`\n🎨 Step 5: Generating Context-Aware Prompt...`);
    const smartPrompt = await aiTools.generateSmartPrompt(componentPath, 'logo');
    
    console.log(`\nGenerated Prompt:`);
    console.log(`  Main: "${smartPrompt.prompt}"`);
    console.log(`  Aspect Ratio: ${smartPrompt.aspectRatio}`);
    console.log(`  Negative: "${smartPrompt.negativePrompt}"`);
    
    // Step 6: Generate Asset with NanoBanana
    console.log(`\n🖼️  Step 6: Generating Asset with AI...`);
    try {
      const generator = new NanoBananaGenerator({
        apiKey,
        outputDir: path.join(projectPath, 'generated-assets'),
      });
      
      console.log('Calling Nano Banana API...');
      const result = await generator.generateImage({
        prompt: smartPrompt.prompt,
        negativePrompt: smartPrompt.negativePrompt,
        aspectRatio: smartPrompt.aspectRatio as any,
      });
      
      console.log(`✅ Asset generated: ${result.outputPath}`);
      console.log(`   Cost: $${result.cost}`);
      
      // Step 7: Save to Project Assets Directory
      console.log(`\n💾 Step 7: Saving to Project...`);
      const assetsDir = path.join(projectPath, 'src', 'assets');
      const assetName = 'generated-logo.png';
      const assetPath = path.join(assetsDir, assetName);
      
      // Create assets directory if needed
      try {
        await fs.mkdir(assetsDir, { recursive: true });
      } catch (e) {
        // Directory might exist
      }
      
      // Copy generated asset
      await fs.copyFile(result.outputPath, assetPath);
      console.log(`✅ Saved to: ${assetPath}`);
      
      // Step 8: Update Component Code
      console.log(`\n✏️  Step 8: Updating Component Code...`);
      const registry = aiTools.getToolRegistry();
      
      // Find old asset import
      const oldImport = context.existingAssets?.[0] || 'placeholder.png';
      const newImport = `./assets/${assetName}`;
      
      console.log(`Replacing:`);
      console.log(`  Old: import ... from '${oldImport}'`);
      console.log(`  New: import ... from '${newImport}'`);
      
      // This would be done by AI, simulated here
      const updateResult = await registry.executeTool('replace', {
        file_path: componentPath,
        old_string: oldImport,
        new_string: newImport,
      });
      
      if (!updateResult.error) {
        console.log(`✅ Component updated successfully`);
      } else {
        console.log(`⚠️  Note: ${updateResult.error.message}`);
      }
      
      // Step 9: Summary
      console.log(`\n📊 Step 9: Summary`);
      console.log('=' .repeat(60));
      console.log(`\n✨ Workflow Complete!`);
      console.log(`\nWhat happened:`);
      console.log(`  1. ✅ Analyzed project structure`);
      console.log(`  2. ✅ Found components needing assets`);
      console.log(`  3. ✅ Analyzed component context`);
      console.log(`  4. ✅ Generated smart, context-aware prompt`);
      console.log(`  5. ✅ Created perfect asset with AI`);
      console.log(`  6. ✅ Saved asset to project`);
      console.log(`  7. ✅ Updated component code`);
      console.log(`\n🎉 Your component now has a contextually perfect asset!`);
      
    } catch (error: any) {
      console.error(`\n❌ Error generating asset: ${error.message}`);
      console.log(`\nNote: Make sure you have a valid Gemini API key.`);
      console.log(`This demo shows what the workflow looks like.`);
    }
  } else {
    console.log(`\n⚠️  No components found in project.`);
    console.log(`Try running this in a React/Vue project with components.`);
  }
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Interactive Demo - Choose what to analyze
 */
async function interactiveDemo(projectPath: string) {
  console.log('🎮 GenAss Interactive Demo\n');
  
  const aiTools = new AIToolsIntegration(projectPath);
  const registry = aiTools.getToolRegistry();
  
  // Demo 1: Search for specific patterns
  console.log('Demo 1: Finding all logo references...');
  const logoSearch = await registry.executeTool('search_file_content', {
    pattern: 'logo|Logo|LOGO',
    include: '*.{tsx,jsx,ts,js}'
  });
  console.log(logoSearch.returnDisplay);
  console.log();
  
  // Demo 2: List project components
  console.log('Demo 2: Listing components directory...');
  const componentsList = await registry.executeTool('list_directory', {
    path: path.join(projectPath, 'src', 'components')
  });
  console.log(componentsList.returnDisplay);
  console.log();
  
  // Demo 3: Find all import statements
  console.log('Demo 3: Finding all image imports...');
  const imports = await registry.executeTool('search_file_content', {
    pattern: "import.*\\.(png|jpg|svg)",
    include: '*.tsx'
  });
  console.log(imports.returnDisplay);
  console.log();
  
  // Demo 4: Analyze first component found
  const analysis = await aiTools.analyzeProjectAssets();
  if (analysis.components.length > 0) {
    console.log(`Demo 4: Analyzing ${path.basename(analysis.components[0])}...`);
    const context = await aiTools.analyzeComponent(analysis.components[0]);
    console.log(`Type: ${context.componentType}`);
    console.log(`Context: ${context.usageContext}`);
    console.log(`Style: ${context.styleInfo}`);
  }
}

/**
 * Simple Demo - Just show the capabilities
 */
async function simpleDemo(projectPath: string) {
  console.log('✨ GenAss AI Tools - Simple Demo\n');
  
  const aiTools = new AIToolsIntegration(projectPath);
  
  console.log('1. What can GenAss do with AI tools?\n');
  console.log('   ✓ Read and understand your component code');
  console.log('   ✓ Find where assets are used');
  console.log('   ✓ Understand the context (colors, layout, purpose)');
  console.log('   ✓ Generate smart prompts for image generation');
  console.log('   ✓ Create perfect-fit assets');
  console.log('   ✓ Update your code automatically\n');
  
  console.log('2. Analyzing your project...\n');
  const analysis = await aiTools.analyzeProjectAssets();
  console.log(`   Found ${analysis.components.length} components`);
  console.log(`   Found ${analysis.missingAssets.length} assets to generate`);
  console.log(`   Found ${analysis.placeholders.length} placeholders\n`);
  
  console.log('3. Example: Smart prompt generation\n');
  if (analysis.components.length > 0) {
    const prompt = await aiTools.generateSmartPrompt(analysis.components[0], 'logo');
    console.log(`   Component: ${path.basename(prompt.context.componentPath || '')}`);
    console.log(`   Type: ${prompt.context.componentType}`);
    console.log(`   AI Prompt: "${prompt.prompt}"`);
    console.log(`   Aspect Ratio: ${prompt.aspectRatio}\n`);
  }
  
  console.log('4. Ready to generate amazing assets!\n');
  console.log('   Run: genass generate --with-ai\n');
}

// Export functions
export {
  completeWorkflowDemo,
  interactiveDemo,
  simpleDemo,
};

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectPath = process.argv[2] || process.cwd();
  const apiKey = process.env.GEMINI_API_KEY || '';
  const mode = process.argv[3] || 'simple';
  
  console.log(`Project: ${projectPath}`);
  console.log(`Mode: ${mode}\n`);
  
  switch (mode) {
    case 'complete':
      if (!apiKey) {
        console.error('❌ GEMINI_API_KEY environment variable required for complete demo');
        process.exit(1);
      }
      completeWorkflowDemo(projectPath, apiKey).catch(console.error);
      break;
    case 'interactive':
      interactiveDemo(projectPath).catch(console.error);
      break;
    default:
      simpleDemo(projectPath).catch(console.error);
  }
}
