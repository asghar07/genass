// Main entry point for the GenAss library
export { GenAssManager } from './core/GenAssManager';
export { CodebaseScanner } from './core/CodebaseScanner';
export { AssetAnalyzer } from './core/AssetAnalyzer';
export { GeminiOrchestrator } from './core/GeminiOrchestrator';
export { NanoBananaGenerator } from './core/NanoBananaGenerator';

export { ConfigManager } from './utils/ConfigManager';
export { logger } from './utils/logger';
export { validateEnvironment, getRequiredEnvVar, getOptionalEnvVar } from './utils/environment';

export * from './types';

// Version
export const version = '1.0.0';