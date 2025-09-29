import fs from 'fs-extra';
import path from 'path';
import { GeneratedAsset, AssetNeed } from '../types';
import { logger } from '../utils/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface InjectionStrategy {
  name: string;
  detect: (projectPath: string) => Promise<boolean>;
  inject: (asset: GeneratedAsset, projectPath: string, projectType: string) => Promise<InjectionResult>;
}

export interface InjectionResult {
  success: boolean;
  filesModified: string[];
  changes: Array<{
    file: string;
    lineNumber?: number;
    change: string;
  }>;
  error?: string;
}

export class CodeInjector {
  private strategies: InjectionStrategy[] = [];
  private client: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required for code injection');
    }

    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      }
    });

    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    this.strategies.push(
      new ReactInjectionStrategy(),
      new NextJsInjectionStrategy(),
      new VueInjectionStrategy(),
      new HTMLInjectionStrategy()
    );
  }

  async injectAssets(assets: GeneratedAsset[], projectPath: string, projectType: string): Promise<InjectionResult[]> {
    logger.info('Starting code injection for generated assets', {
      assetCount: assets.length,
      projectType
    });

    const results: InjectionResult[] = [];

    for (const asset of assets) {
      try {
        const result = await this.injectAsset(asset, projectPath, projectType);
        results.push(result);

        if (result.success) {
          logger.info('Asset injected successfully', {
            asset: path.basename(asset.filePath),
            filesModified: result.filesModified.length
          });
        }
      } catch (error) {
        logger.error('Asset injection failed', {
          asset: path.basename(asset.filePath),
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        results.push({
          success: false,
          filesModified: [],
          changes: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  private async injectAsset(asset: GeneratedAsset, projectPath: string, projectType: string): Promise<InjectionResult> {
    // Find appropriate strategy
    for (const strategy of this.strategies) {
      const canHandle = await strategy.detect(projectPath);
      if (canHandle) {
        logger.debug(`Using ${strategy.name} strategy for injection`);
        return await strategy.inject(asset, projectPath, projectType);
      }
    }

    // Fallback: use AI to determine injection
    return await this.aiGuidedInjection(asset, projectPath, projectType);
  }

  private async aiGuidedInjection(asset: GeneratedAsset, projectPath: string, projectType: string): Promise<InjectionResult> {
    logger.info('Using AI-guided injection');

    // Find relevant files
    const targetFiles = await this.findTargetFiles(asset, projectPath);

    if (targetFiles.length === 0) {
      return {
        success: false,
        filesModified: [],
        changes: [],
        error: 'No target files found for injection'
      };
    }

    const modifications: Array<{ file: string; change: string; lineNumber?: number }> = [];

    for (const file of targetFiles.slice(0, 3)) { // Limit to 3 files
      try {
        const fileContent = await fs.readFile(file, 'utf-8');
        const modification = await this.generateModification(asset, file, fileContent, projectType);

        if (modification) {
          modifications.push({
            file,
            change: modification,
            lineNumber: 1 // Could be improved with line detection
          });

          // Apply modification
          await this.applyModification(file, modification);
        }
      } catch (error) {
        logger.warn(`Failed to modify ${file}`, error);
      }
    }

    return {
      success: modifications.length > 0,
      filesModified: modifications.map(m => m.file),
      changes: modifications
    };
  }

  private async generateModification(
    asset: GeneratedAsset,
    targetFile: string,
    fileContent: string,
    projectType: string
  ): Promise<string | null> {
    const relativePath = path.relative(path.dirname(targetFile), asset.filePath);

    const prompt = `You are modifying code to import and use a generated image asset.

File: ${path.basename(targetFile)}
Project Type: ${projectType}
Asset Type: ${asset.assetNeed.type}
Asset Path: ${relativePath}
Asset Description: ${asset.assetNeed.description}

Current file content (first 500 chars):
\`\`\`
${fileContent.substring(0, 500)}
\`\`\`

Generate ONLY the import statement and ONE usage example for this asset.
Follow the conventions of the existing code.

Examples:
React/Next.js:
import heroImage from './assets/hero-banner.png';
<img src={heroImage} alt="Hero banner" />

Vue:
<img src="@/assets/hero-banner.png" alt="Hero banner" />

HTML:
<img src="./assets/hero-banner.png" alt="Hero banner">

Output ONLY the code, no explanations:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      logger.error('AI modification generation failed', error);
      return null;
    }
  }

  private async applyModification(filePath: string, modification: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');

    // Find appropriate insertion point
    const lines = content.split('\n');
    let insertIndex = 0;

    // Try to find import section
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('import ') || lines[i].includes('require(')) {
        insertIndex = i + 1;
      } else if (insertIndex > 0 && lines[i].trim() === '') {
        break;
      }
    }

    // Insert the modification
    lines.splice(insertIndex, 0, modification);

    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
  }

  private async findTargetFiles(asset: GeneratedAsset, projectPath: string): Promise<string[]> {
    const patterns = this.getSearchPatterns(asset.assetNeed);
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await this.searchFiles(projectPath, pattern);
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private getSearchPatterns(assetNeed: AssetNeed): string[] {
    const patterns: string[] = [];

    // Based on asset type
    switch (assetNeed.type) {
      case 'logo':
        patterns.push('header', 'navbar', 'nav', 'layout', 'app');
        break;
      case 'icon':
        patterns.push(...(assetNeed.usage || ['icon', 'button']));
        break;
      case 'banner':
        patterns.push('hero', 'home', 'index', 'landing');
        break;
      case 'social-media':
        patterns.push('head', 'meta', 'layout', 'app');
        break;
      default:
        patterns.push(assetNeed.type);
    }

    return patterns;
  }

  private async searchFiles(projectPath: string, pattern: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.tsx', '.jsx', '.vue', '.html', '.ts', '.js'];

    const searchDir = async (dir: string, depth: number = 0): Promise<void> => {
      if (depth > 3) return; // Limit depth

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, dist, etc.
        if (entry.isDirectory() && ['node_modules', 'dist', 'build', '.next', '.git'].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await searchDir(fullPath, depth + 1);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          // Check if filename or path contains pattern
          if (entry.name.toLowerCase().includes(pattern.toLowerCase()) ||
              fullPath.toLowerCase().includes(pattern.toLowerCase())) {
            files.push(fullPath);
          }
        }
      }
    };

    await searchDir(path.join(projectPath, 'src'));

    return files;
  }
}

// Strategy implementations
class ReactInjectionStrategy implements InjectionStrategy {
  name = 'React';

  async detect(projectPath: string): Promise<boolean> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const pkg = await fs.readJson(packageJsonPath);
      return !!(pkg.dependencies?.react || pkg.devDependencies?.react);
    }
    return false;
  }

  async inject(asset: GeneratedAsset, projectPath: string, projectType: string): Promise<InjectionResult> {
    // React-specific injection logic would go here
    return {
      success: true,
      filesModified: [],
      changes: []
    };
  }
}

class NextJsInjectionStrategy implements InjectionStrategy {
  name = 'Next.js';

  async detect(projectPath: string): Promise<boolean> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const pkg = await fs.readJson(packageJsonPath);
      return !!(pkg.dependencies?.next || pkg.devDependencies?.next);
    }
    return false;
  }

  async inject(asset: GeneratedAsset, projectPath: string, projectType: string): Promise<InjectionResult> {
    // Next.js-specific injection logic would go here
    return {
      success: true,
      filesModified: [],
      changes: []
    };
  }
}

class VueInjectionStrategy implements InjectionStrategy {
  name = 'Vue';

  async detect(projectPath: string): Promise<boolean> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const pkg = await fs.readJson(packageJsonPath);
      return !!(pkg.dependencies?.vue || pkg.devDependencies?.vue);
    }
    return false;
  }

  async inject(asset: GeneratedAsset, projectPath: string, projectType: string): Promise<InjectionResult> {
    // Vue-specific injection logic would go here
    return {
      success: true,
      filesModified: [],
      changes: []
    };
  }
}

class HTMLInjectionStrategy implements InjectionStrategy {
  name = 'HTML';

  async detect(projectPath: string): Promise<boolean> {
    const indexHtml = path.join(projectPath, 'index.html');
    return await fs.pathExists(indexHtml);
  }

  async inject(asset: GeneratedAsset, projectPath: string, projectType: string): Promise<InjectionResult> {
    // HTML-specific injection logic would go here
    return {
      success: true,
      filesModified: [],
      changes: []
    };
  }
}