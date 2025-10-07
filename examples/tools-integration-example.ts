/**
 * Example: Integrating AI Tools with GenAss
 * 
 * This example demonstrates how to use the AI tools to scan a project,
 * analyze asset usage, and integrate with the asset generation workflow.
 */

import { ToolRegistry } from '../src/tools/index.js';
import * as path from 'path';

async function exampleAssetAnalysis() {
  // Initialize tool registry with workspace directory
  const workspaceDir = process.cwd();
  const registry = new ToolRegistry(workspaceDir);

  console.log('=== GenAss AI Tools Example ===\n');

  // Step 1: Discover project structure
  console.log('1. Discovering project structure...');
  const projectStructure = await registry.executeTool('list_directory', {
    path: path.join(workspaceDir, 'src'),
    ignore: ['*.test.ts', '*.spec.ts', 'node_modules']
  });
  console.log(projectStructure.returnDisplay);
  console.log();

  // Step 2: Find all image imports in the codebase
  console.log('2. Searching for image imports...');
  const imageReferences = await registry.executeTool('search_file_content', {
    pattern: "import.*from.*['\"].*\\.(png|jpg|jpeg|svg|gif|webp)['\"]",
    include: '*.{tsx,jsx,ts,js}'
  });
  console.log(imageReferences.returnDisplay);
  console.log();

  // Step 3: Search for missing or placeholder assets
  console.log('3. Looking for placeholder assets...');
  const placeholders = await registry.executeTool('search_file_content', {
    pattern: 'placeholder|missing|todo.*image|default.*icon',
    include: '*.{tsx,jsx,ts,js}'
  });
  console.log(placeholders.returnDisplay);
  console.log();

  // Step 4: Read a component file for context
  console.log('4. Reading component for context...');
  const componentFiles = await registry.executeTool('search_file_content', {
    pattern: 'Header|Navbar',
    include: '*.{tsx,jsx}'
  });
  
  // If we found a header component, read it
  if (componentFiles.llmContent.includes('Header')) {
    const headerPath = extractFirstFilePath(componentFiles.llmContent);
    if (headerPath) {
      const componentContent = await registry.executeTool('read_file', {
        absolute_path: path.join(workspaceDir, headerPath),
        limit: 30
      });
      console.log(`Read ${headerPath}:`);
      console.log(componentContent.returnDisplay);
    }
  }
  console.log();

  // Step 5: Example of how AI would generate context-aware prompt
  console.log('5. Generating context-aware asset...');
  console.log('Based on the codebase analysis, AI would generate prompts like:');
  console.log('- "Professional minimalist logo for a tech startup, modern design"');
  console.log('- "Icon set for navigation: home, settings, profile, 24x24px"');
  console.log('- "Hero banner image, 1920x1080, clean background, tech theme"');
  console.log();

  // Step 6: Example of writing a generated asset
  console.log('6. Writing generated asset (simulation)...');
  const assetPath = path.join(workspaceDir, 'src', 'assets', 'generated-logo.png');
  const writeResult = await registry.executeTool('write_file', {
    file_path: assetPath,
    content: '// This would be actual image buffer data'
  });
  console.log(writeResult.returnDisplay);
  console.log();

  // Step 7: Update code to use new asset
  console.log('7. Updating code with new asset path...');
  console.log('AI would use the "replace" tool to update imports:');
  console.log('Old: import logo from "./placeholder.png"');
  console.log('New: import logo from "./assets/generated-logo.png"');
  console.log();

  // Step 8: Get tool descriptions for AI context
  console.log('8. Available tools for AI:');
  console.log(registry.getToolDescriptions());
}

/**
 * Helper function to extract file path from search results
 */
function extractFirstFilePath(searchResults: string): string | null {
  const match = searchResults.match(/File:\s*(.+\.(?:tsx|jsx|ts|js))/);
  return match ? match[1] : null;
}

/**
 * Example: Tool Registry for Gemini API Integration
 */
async function exampleGeminiIntegration() {
  const registry = new ToolRegistry(process.cwd());
  
  // Get tool declarations for Gemini API
  const toolDeclarations = registry.getGeminiToolDeclarations();
  
  console.log('\n=== Gemini API Tool Declarations ===\n');
  console.log(JSON.stringify(toolDeclarations, null, 2));
  
  // In actual implementation, you would use these declarations like:
  /*
  const generativeModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    tools: [{ functionDeclarations: toolDeclarations }]
  });
  */
}

/**
 * Example: Analyzing a specific component
 */
async function exampleComponentAnalysis(componentPath: string) {
  const registry = new ToolRegistry(process.cwd());
  
  console.log(`\n=== Analyzing Component: ${componentPath} ===\n`);
  
  // Read the component
  const content = await registry.executeTool('read_file', {
    absolute_path: componentPath
  });
  
  console.log('Component Content:');
  console.log(content.llmContent.substring(0, 500) + '...\n');
  
  // Analyze for image usage
  const imageImports = extractImageImports(content.llmContent);
  console.log('Image Imports Found:');
  imageImports.forEach(img => console.log(`  - ${img}`));
  console.log();
  
  // Generate context for AI
  const context = generateAssetContext(content.llmContent);
  console.log('AI Context Generated:');
  console.log(context);
}

/**
 * Helper to extract image imports from code
 */
function extractImageImports(code: string): string[] {
  const regex = /import\s+.*?\s+from\s+['"](.*?\.(png|jpg|jpeg|svg|gif|webp))['"]/gi;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(code)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * Generate context for AI asset generation
 */
function generateAssetContext(code: string): string {
  const contexts: string[] = [];
  
  // Check for UI elements
  if (code.includes('Header') || code.includes('Navbar')) {
    contexts.push('Component Type: Navigation Header');
  }
  if (code.includes('Hero') || code.includes('Banner')) {
    contexts.push('Component Type: Hero Banner');
  }
  if (code.includes('Card')) {
    contexts.push('Component Type: Card Component');
  }
  
  // Check for styling context
  if (code.includes('dark') || code.includes('theme')) {
    contexts.push('Theme: Supports dark/light mode');
  }
  
  // Check for brand elements
  if (code.includes('logo') || code.includes('brand')) {
    contexts.push('Brand Element: Logo or branding');
  }
  
  return contexts.length > 0 
    ? contexts.join('\n')
    : 'Generic component, analyze content for specific asset needs';
}

// Run examples if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleAssetAnalysis()
    .then(() => exampleGeminiIntegration())
    .catch(console.error);
}

export {
  exampleAssetAnalysis,
  exampleGeminiIntegration,
  exampleComponentAnalysis
};
