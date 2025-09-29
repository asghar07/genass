import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { ProjectConfig } from '../types';
import { logger } from './logger';

interface GlobalConfig {
  anthropicApiKey?: string;
  googleCloudProjectId?: string;
  googleCloudLocation?: string;
  imageProvider?: 'vertex' | 'gemini';
  defaultAssetFormat?: 'png' | 'jpg' | 'webp';
  maxConcurrentGenerations?: number;
}

export class ConfigManager {
  private globalConfigPath: string;
  private defaultProjectConfig: Partial<ProjectConfig> = {
    excludePatterns: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.git/**',
      'coverage/**',
      '*.log'
    ],
    assetDirectories: [
      'public',
      'assets',
      'static',
      'src/assets',
      'images'
    ],
    preferredImageFormat: 'png',
    maxAssetSize: 1024 * 1024 * 2 // 2MB
  };

  constructor() {
    this.globalConfigPath = path.join(os.homedir(), '.genass', 'config.json');
  }

  async loadConfig(projectPath: string, configPath?: string): Promise<ProjectConfig> {
    logger.info('Loading project configuration', { projectPath, configPath });

    // Start with default configuration
    let config: ProjectConfig = {
      name: path.basename(projectPath),
      rootPath: projectPath,
      ...this.defaultProjectConfig
    } as ProjectConfig;

    // Try to load project-specific configuration
    const projectConfigPath = configPath || path.join(projectPath, 'genass.config.json');

    if (await fs.pathExists(projectConfigPath)) {
      try {
        const projectConfig = await fs.readJson(projectConfigPath);
        config = { ...config, ...projectConfig };
        logger.info('Loaded project configuration', { configPath: projectConfigPath });
      } catch (error) {
        logger.warn('Failed to load project configuration', {
          configPath: projectConfigPath,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      // Create default project configuration
      await this.createDefaultProjectConfig(projectConfigPath, config);
    }

    // Apply global configuration overrides
    const globalConfig = await this.getGlobalConfig();
    if (globalConfig.defaultAssetFormat) {
      config.preferredImageFormat = globalConfig.defaultAssetFormat;
    }

    return config;
  }

  async saveProjectConfig(config: ProjectConfig): Promise<void> {
    const configPath = path.join(config.rootPath, 'genass.config.json');

    try {
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, config, { spaces: 2 });
      logger.info('Project configuration saved', { configPath });
    } catch (error) {
      logger.error('Failed to save project configuration', {
        configPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getGlobalConfig(): Promise<GlobalConfig> {
    if (!(await fs.pathExists(this.globalConfigPath))) {
      return {};
    }

    try {
      return await fs.readJson(this.globalConfigPath);
    } catch (error) {
      logger.warn('Failed to load global configuration', {
        configPath: this.globalConfigPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {};
    }
  }

  async saveGlobalConfig(config: Partial<GlobalConfig>): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.globalConfigPath));

      // Merge with existing configuration
      const existingConfig = await this.getGlobalConfig();
      const mergedConfig = { ...existingConfig, ...config };

      await fs.writeJson(this.globalConfigPath, mergedConfig, { spaces: 2 });
      logger.info('Global configuration saved', { configPath: this.globalConfigPath });
    } catch (error) {
      logger.error('Failed to save global configuration', {
        configPath: this.globalConfigPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async createDefaultProjectConfig(configPath: string, config: ProjectConfig): Promise<void> {
    const defaultConfig = {
      $schema: "https://genass.dev/config.schema.json",
      name: config.name,
      excludePatterns: config.excludePatterns,
      assetDirectories: config.assetDirectories,
      preferredImageFormat: config.preferredImageFormat,
      maxAssetSize: config.maxAssetSize,
      generation: {
        concurrency: 3,
        retries: 3,
        quality: "standard"
      },
      output: {
        directory: "generated-assets",
        naming: "descriptive",
        organizationStrategy: "by-type"
      }
    };

    try {
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
      logger.info('Created default project configuration', { configPath });
    } catch (error) {
      logger.warn('Failed to create default project configuration', {
        configPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async detectProjectType(projectPath: string): Promise<string> {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = await fs.readJson(packageJsonPath);

        // React detection
        if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
          if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
            return 'nextjs';
          }
          return 'react';
        }

        // Vue.js detection
        if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
          if (packageJson.dependencies?.nuxt || packageJson.devDependencies?.nuxt) {
            return 'nuxtjs';
          }
          return 'vue';
        }

        // Angular detection
        if (packageJson.dependencies?.['@angular/core']) {
          return 'angular';
        }

        // Svelte detection
        if (packageJson.dependencies?.svelte || packageJson.devDependencies?.svelte) {
          return 'svelte';
        }

        return 'nodejs';
      } catch (error) {
        logger.warn('Failed to parse package.json', { projectPath, error });
      }
    }

    // Check for other project types
    if (await fs.pathExists(path.join(projectPath, 'Cargo.toml'))) {
      return 'rust';
    }

    if (await fs.pathExists(path.join(projectPath, 'go.mod'))) {
      return 'go';
    }

    if (await fs.pathExists(path.join(projectPath, 'requirements.txt')) ||
        await fs.pathExists(path.join(projectPath, 'pyproject.toml'))) {
      return 'python';
    }

    return 'unknown';
  }

  async getProjectTypeDefaults(projectType: string): Promise<Partial<ProjectConfig>> {
    const defaults: Record<string, Partial<ProjectConfig>> = {
      react: {
        assetDirectories: ['public', 'src/assets', 'assets'],
        excludePatterns: [...this.defaultProjectConfig.excludePatterns!, 'build/**']
      },
      nextjs: {
        assetDirectories: ['public', 'assets', 'static'],
        excludePatterns: [...this.defaultProjectConfig.excludePatterns!, '.next/**']
      },
      vue: {
        assetDirectories: ['public', 'src/assets', 'assets'],
        excludePatterns: [...this.defaultProjectConfig.excludePatterns!, 'dist/**']
      },
      angular: {
        assetDirectories: ['src/assets', 'assets'],
        excludePatterns: [...this.defaultProjectConfig.excludePatterns!, 'dist/**', '.angular/**']
      },
      svelte: {
        assetDirectories: ['static', 'src/assets'],
        excludePatterns: [...this.defaultProjectConfig.excludePatterns!, '.svelte-kit/**']
      }
    };

    return defaults[projectType] || {};
  }

  async mergeWithDefaults(config: Partial<ProjectConfig>, projectType: string): Promise<ProjectConfig> {
    const projectDefaults = await this.getProjectTypeDefaults(projectType);
    const globalConfig = await this.getGlobalConfig();

    return {
      ...this.defaultProjectConfig,
      ...projectDefaults,
      ...config,
      preferredImageFormat: globalConfig.defaultAssetFormat || config.preferredImageFormat || 'png'
    } as ProjectConfig;
  }

  async validateConfig(config: ProjectConfig): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Project name is required');
    }

    if (!config.rootPath || !(await fs.pathExists(config.rootPath))) {
      errors.push('Project root path must exist');
    }

    if (!config.assetDirectories || config.assetDirectories.length === 0) {
      errors.push('At least one asset directory must be specified');
    }

    if (!['png', 'jpg', 'webp'].includes(config.preferredImageFormat)) {
      errors.push('Preferred image format must be png, jpg, or webp');
    }

    if (config.maxAssetSize <= 0) {
      errors.push('Max asset size must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async exportConfig(projectPath: string, outputPath: string): Promise<void> {
    const config = await this.loadConfig(projectPath);
    const globalConfig = await this.getGlobalConfig();

    const exportData = {
      project: config,
      global: globalConfig,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };

    await fs.writeJson(outputPath, exportData, { spaces: 2 });
    logger.info('Configuration exported', { outputPath });
  }

  async importConfig(importPath: string, projectPath: string): Promise<void> {
    if (!(await fs.pathExists(importPath))) {
      throw new Error(`Import file not found: ${importPath}`);
    }

    const importData = await fs.readJson(importPath);

    if (importData.project) {
      importData.project.rootPath = projectPath; // Update root path
      await this.saveProjectConfig(importData.project);
    }

    if (importData.global) {
      await this.saveGlobalConfig(importData.global);
    }

    logger.info('Configuration imported', { importPath, projectPath });
  }
}