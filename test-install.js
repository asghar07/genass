#!/usr/bin/env node

/**
 * Installation Test Script
 * Verifies that GenAss is properly installed and configured
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 GenAss Installation Test\n');

// Test 1: Check if CLI is available
console.log('1️⃣  Testing CLI availability...');
try {
  const version = execSync('genass --version', { encoding: 'utf8' }).trim();
  console.log(`✅ GenAss CLI found: ${version}\n`);
} catch (error) {
  console.log('❌ GenAss CLI not found in PATH');
  console.log('💡 Run: npm link\n');
  process.exit(1);
}

// Test 2: Check project structure
console.log('2️⃣  Testing project structure...');
const requiredFiles = [
  'package.json',
  'dist/cli.js',
  'dist/index.js',
  'src/cli.ts',
  '.env.example'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ Missing: ${file}`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n💡 Run: npm run build');
  process.exit(1);
}

console.log('');

// Test 3: Test environment validation
console.log('3️⃣  Testing environment validation...');
try {
  execSync('genass init --dry-run', { stdio: 'pipe' });
  console.log('✅ Environment validation works (may show missing API keys - that\'s normal)\n');
} catch (error) {
  // This is expected to fail due to missing API keys
  if (error.stdout && error.stdout.includes('Environment validation failed')) {
    console.log('✅ Environment validation works (missing API keys detected)\n');
  } else {
    console.log('❌ Environment validation failed unexpectedly');
    console.log(error.message);
    process.exit(1);
  }
}

// Test 4: Check dependencies
console.log('4️⃣  Testing key dependencies...');
const keyDeps = ['@anthropic-ai/sdk', '@google-cloud/vertexai', 'commander', 'chalk'];
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

keyDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`✅ ${dep}`);
  } else {
    console.log(`❌ Missing dependency: ${dep}`);
  }
});

console.log('');

// Test 5: Check examples
console.log('5️⃣  Testing examples...');
const exampleFiles = [
  'examples/basic-usage.js',
  'examples/custom-config.js',
  'examples/batch-generation.js',
  'examples/run-examples.js'
];

exampleFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ Missing: ${file}`);
  }
});

console.log('\n🎉 Installation test completed!');
console.log('\n📋 Next Steps:');
console.log('1. Set up your API keys: cp .env.example .env && nano .env');
console.log('2. Or run setup wizard: genass config --setup');
console.log('3. Test with a project: genass init --dry-run');
console.log('4. Try examples: node examples/run-examples.js --help');
console.log('\n✨ Happy generating with GenAss!');