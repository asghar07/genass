export interface AssetNeed {
  type: 'icon' | 'logo' | 'illustration' | 'background' | 'banner' | 'social-media' | 'ui-element';
  description: string;
  context: string;
  dimensions: {
    width: number;
    height: number;
    aspectRatio: string;
  };
  usage: string[];
  priority: 'high' | 'medium' | 'low';
  suggestedPrompt: string;
  filePath: string;
  existingAsset?: string;
  nanoBananaOptimized?: boolean; // Set by GeminiOrchestrator when prompts are optimized for Nano Banana
  frameworkSpecific?: string; // Framework-specific notes (e.g., 'react', 'vue', 'angular')
}

export interface CodebaseAnalysis {
  projectType: string;
  frameworks: string[];
  existingAssets: string[];
  missingAssets: AssetNeed[];
  assetDirectories: string[];
  recommendations: string[];
  existingLogo?: string | null; // Path to detected existing logo for brand consistency
}

export interface GenerationPlan {
  assets: AssetNeed[];
  estimatedCost: number;
  estimatedTime: number;
  priorities: {
    high: AssetNeed[];
    medium: AssetNeed[];
    low: AssetNeed[];
  };
}

export interface GeneratedAsset {
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
    warning?: string;
  };
}

export interface ClaudeAgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  model: 'claude-sonnet-4' | 'claude-opus-4' | 'claude-haiku-3.5';
}

export interface ImagenConfig {
  model: 'imagen-3.0-generate-002' | 'imagen-3.0-fast-generate-001' | 'imagen-4.0-generate-001';
  numberOfImages: number;
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
  quality: 'standard' | 'high';
  enableWatermark: boolean;
}

export interface ProjectConfig {
  name: string;
  rootPath: string;
  excludePatterns: string[];
  assetDirectories: string[];
  preferredImageFormat: 'png' | 'jpg' | 'webp';
  maxAssetSize: number;
}