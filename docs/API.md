# GenAss API Documentation

This document describes the programmatic API for GenAss.

## Installation

```bash
npm install genass
```

## Programmatic Usage

### Basic Usage

```typescript
import { GenAssManager } from 'genass';

const manager = new GenAssManager();

// Initialize with project path
await manager.initialize('/path/to/project');

// Run full workflow (scan + plan + generate)
await manager.fullWorkflow();
```

### Advanced Usage

```typescript
import {
  GenAssManager,
  CodebaseScanner,
  NanoBananaGenerator,
  SmartFilenameGenerator,
  CodeInjector
} from 'genass';

// Custom workflow
const manager = new GenAssManager();
await manager.initialize('./my-project');

// Just analyze without generating
await manager.analyzeOnly();

// Generate from existing plan
await manager.generateFromPlan({
  type: 'logo,icon',
  priority: 'high'
});

// Show project status
await manager.showStatus('./my-project');
```

## Core Classes

### GenAssManager

Main orchestration class for asset generation workflows.

#### Methods

**`initialize(projectPath: string, configPath?: string): Promise<void>`**
- Initialize the manager with a project path
- Optionally provide custom config path
- Loads project configuration and validates environment

**`fullWorkflow(): Promise<void>`**
- Run complete workflow: scan → plan → generate → move
- Interactive approval steps
- Shows cost estimation and previews

**`analyzeOnly(): Promise<void>`**
- Analyze project without generating assets
- Useful for understanding asset needs

**`generateFromPlan(options: GenerationOptions): Promise<void>`**
- Generate assets from existing plan
- Filter by type or priority
- Options: `{ type?: string, priority?: string, plan?: string }`

**`showStatus(projectPath: string): Promise<void>`**
- Display project status and generated assets

### NanoBananaGenerator

Handles image generation using Gemini 2.5 Flash Image (Nano Banana).

#### Methods

**`generateAsset(assetNeed: AssetNeed, options: GenerationOptions): Promise<GeneratedAsset>`**
- Generate a single asset
- Quality validation and auto-retry
- Returns metadata including cost and quality score

**`generateMultipleAssets(assets: AssetNeed[], options: GenerationOptions, concurrency?: number): Promise<GeneratedAsset[]>`**
- Batch generation with concurrency control
- Default concurrency: 3
- Automatic rate limiting

**`generateWithCharacterConsistency(assets: AssetNeed[], referenceImage: string, options: GenerationOptions): Promise<GeneratedAsset[]>`**
- Generate multiple assets with brand consistency
- Uses reference image (e.g., existing logo)

### SmartFilenameGenerator

AI-powered filename generation for clean, semantic asset names.

#### Methods

**`generateFilename(assetNeed: AssetNeed, context?: string): Promise<string>`**
- Generate short, contextual filename (max 3 words)
- Example: "app-logo", "hero-banner", "settings-icon"
- Results are cached for performance

### CodeInjector

Automatically injects asset imports into code files.

#### Methods

**`injectAssets(assets: GeneratedAsset[], projectPath: string, projectType: string): Promise<InjectionResult[]>`**
- Automatically add import statements to relevant files
- Framework-aware (React, Next.js, Vue, HTML)
- Returns list of modified files and changes

### ExistingAssetDetector

Detects existing assets to avoid duplicates.

#### Methods

**`detectExistingAssets(projectPath: string, assetDirs: string[]): Promise<ExistingAsset[]>`**
- Scan directories for existing images
- Analyzes dimensions, format, and size

**`filterOutExistingAssets(assetNeeds: AssetNeed[], existingAssets: ExistingAsset[]): Promise<FilterResult>`**
- Match asset needs against existing assets
- Returns needed, skipped, and matched assets

### InteractiveSession

Continuous AI-powered conversation mode.

#### Methods

**`start(): Promise<void>`**
- Start interactive session
- Handles commands, AI chat, and function calling
- Context-aware with AGENTS.md persistence

## Types

### AssetNeed

```typescript
interface AssetNeed {
  type: 'logo' | 'icon' | 'banner' | 'illustration' | 'background' | 'social-media' | 'ui-element';
  description: string;
  suggestedPrompt: string;
  dimensions?: { width: number; height: number };
  priority: 'high' | 'medium' | 'low';
  usage?: string[];
  estimatedCost: number;
}
```

### GeneratedAsset

```typescript
interface GeneratedAsset {
  assetNeed: AssetNeed;
  filePath: string;
  prompt: string;
  success: boolean;
  error?: string;
  metadata: {
    model: string;
    generationTime: number;
    cost: number;
    qualityScore?: number;
    regenerationAttempts?: number;
  };
}
```

### GenerationOptions

```typescript
interface GenerationOptions {
  outputDir: string;
  format: 'png' | 'jpg' | 'webp';
  quality?: number;
  maxRetries?: number;
  enableCharacterConsistency?: boolean;
  blendImages?: string[];
}
```

## Configuration

### Project Config (genass.config.json)

```typescript
interface ProjectConfig {
  name: string;
  rootPath: string;
  excludePatterns: string[];
  assetDirectories: string[];
  preferredImageFormat: 'png' | 'jpg' | 'webp';
  maxAssetSize: number;
  generation?: {
    concurrency: number;
    retries: number;
    quality: 'standard' | 'high';
  };
  output?: {
    directory: string;
    naming: 'descriptive' | 'short';
    organizationStrategy: 'by-type' | 'flat';
  };
}
```

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key

# Optional
NANO_BANANA_MODEL=gemini-2.5-flash-image-preview
IMAGE_GENERATION_QUALITY=high
IMAGE_COST_PER_GENERATION=0.039
LOG_LEVEL=info
MAX_CONCURRENT_GENERATIONS=3
ASSET_OUTPUT_DIR=./generated-assets
```

## Error Handling

All methods throw errors that should be caught:

```typescript
try {
  await manager.fullWorkflow();
} catch (error) {
  console.error('Generation failed:', error.message);
}
```

## Events and Logging

GenAss uses Winston for logging. Configure log level:

```bash
LOG_LEVEL=debug genass init
```

Available levels: `error`, `warn`, `info`, `debug`

## Examples

See the `/examples` directory for complete working examples:
- `basic-usage.js` - Simple generation
- `batch-generation.js` - Batch processing
- `custom-config.js` - Custom configuration