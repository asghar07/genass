/**
 * @license
 * Copyright 2025 GenAss
 * SPDX-License-Identifier: MIT
 * 
 * AIToolsIntegration - Bridges AI tools with GenAss core functionality
 * This class demonstrates how to integrate the new AI tools with existing
 * GenAss components for context-aware asset generation.
 */

import { ToolRegistry } from '../tools/index.js';
import type { ToolResult } from '../tools/index.js';
import * as path from 'path';

export interface AssetContext {
  componentPath?: string;
  componentType?: string;
  usageContext?: string;
  styleInfo?: string;
  dimensions?: string;
  existingAssets?: string[];
}

export interface SmartPromptResult {
  prompt: string;
  aspectRatio?: string;
  negativePrompt?: string;
  context: AssetContext;
}

/**
 * AIToolsIntegration provides intelligent asset generation capabilities
 * by analyzing codebases and understanding context.
 */
export class AIToolsIntegration {
  private registry: ToolRegistry;
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.registry = new ToolRegistry(workspaceDir);
  }

  /**
   * Analyze a project to find all assets that need generation
   */
  async analyzeProjectAssets(): Promise<{
    missingAssets: string[];
    placeholders: string[];
    components: string[];
  }> {
    // Find all placeholder images
    const placeholderSearch = await this.registry.executeTool('search_file_content', {
      pattern: 'placeholder|missing.*image|todo.*asset|default.*icon',
      include: '*.{tsx,jsx,ts,js,vue,svelte}'
    });

    // Find all image imports
    const imageImports = await this.registry.executeTool('search_file_content', {
      pattern: "import.*from.*['\"].*\\.(png|jpg|jpeg|svg|gif|webp)['\"]",
      include: '*.{tsx,jsx,ts,js}'
    });

    // Find components that likely need assets
    const componentSearch = await this.registry.executeTool('search_file_content', {
      pattern: 'Header|Hero|Banner|Card|Logo|Icon|Avatar|Background',
      include: '*.{tsx,jsx}'
    });

    return {
      missingAssets: this.extractPaths(imageImports.llmContent),
      placeholders: this.extractPaths(placeholderSearch.llmContent),
      components: this.extractPaths(componentSearch.llmContent),
    };
  }

  /**
   * Analyze a specific component to understand its asset needs
   */
  async analyzeComponent(componentPath: string): Promise<AssetContext> {
    const absolutePath = path.isAbsolute(componentPath)
      ? componentPath
      : path.join(this.workspaceDir, componentPath);

    // Read the component file
    const fileContent = await this.registry.executeTool('read_file', {
      absolute_path: absolutePath
    });

    if (fileContent.error) {
      throw new Error(`Failed to read component: ${fileContent.error.message}`);
    }

    const content = fileContent.llmContent;

    // Extract context information
    const context: AssetContext = {
      componentPath: absolutePath,
      componentType: this.detectComponentType(content),
      usageContext: this.extractUsageContext(content),
      styleInfo: this.extractStyleInfo(content),
      dimensions: this.extractDimensions(content),
      existingAssets: this.extractAssetImports(content),
    };

    return context;
  }

  /**
   * Generate a smart, context-aware prompt for asset generation
   */
  async generateSmartPrompt(
    componentPath: string,
    assetType: 'logo' | 'icon' | 'banner' | 'background' | 'illustration' = 'logo'
  ): Promise<SmartPromptResult> {
    const context = await this.analyzeComponent(componentPath);

    // Build context-aware prompt
    let prompt = '';
    let aspectRatio = '1:1';
    let negativePrompt = 'blurry, low quality, pixelated, distorted';

    switch (assetType) {
      case 'logo':
        prompt = this.generateLogoPrompt(context);
        aspectRatio = '1:1';
        break;
      case 'icon':
        prompt = this.generateIconPrompt(context);
        aspectRatio = '1:1';
        negativePrompt += ', text, letters, words';
        break;
      case 'banner':
        prompt = this.generateBannerPrompt(context);
        aspectRatio = '16:9';
        break;
      case 'background':
        prompt = this.generateBackgroundPrompt(context);
        aspectRatio = '16:9';
        negativePrompt += ', busy, cluttered';
        break;
      case 'illustration':
        prompt = this.generateIllustrationPrompt(context);
        aspectRatio = '4:3';
        break;
    }

    return {
      prompt,
      aspectRatio,
      negativePrompt,
      context,
    };
  }

  /**
   * Find all asset references in a project
   */
  async findAssetReferences(assetName: string): Promise<string[]> {
    const searchResult = await this.registry.executeTool('search_file_content', {
      pattern: assetName,
      include: '*.{tsx,jsx,ts,js,css,scss,html,vue,svelte}'
    });

    return this.extractPaths(searchResult.llmContent);
  }

  /**
   * Update asset imports across the codebase
   */
  async updateAssetImports(
    oldAssetPath: string,
    newAssetPath: string
  ): Promise<ToolResult[]> {
    const references = await this.findAssetReferences(oldAssetPath);
    const results: ToolResult[] = [];

    for (const filePath of references) {
      const absolutePath = path.join(this.workspaceDir, filePath);
      
      // Read current content
      const content = await this.registry.executeTool('read_file', {
        absolute_path: absolutePath
      });

      if (content.error) continue;

      // Replace old path with new path
      const result = await this.registry.executeTool('replace', {
        file_path: absolutePath,
        old_string: oldAssetPath,
        new_string: newAssetPath
      });

      results.push(result);
    }

    return results;
  }

  /**
   * Get project structure for AI context
   */
  async getProjectStructure(): Promise<string> {
    const srcDir = path.join(this.workspaceDir, 'src');
    const structure: string[] = ['Project Structure:'];

    try {
      const srcContent = await this.registry.executeTool('list_directory', {
        path: srcDir,
        ignore: ['node_modules', 'dist', 'build', '.git']
      });

      structure.push(srcContent.llmContent);

      // Get components directory if it exists
      const componentsDir = path.join(srcDir, 'components');
      const componentsContent = await this.registry.executeTool('list_directory', {
        path: componentsDir
      });

      if (!componentsContent.error) {
        structure.push('\nComponents:');
        structure.push(componentsContent.llmContent);
      }

      // Get assets directory if it exists
      const assetsDir = path.join(srcDir, 'assets');
      const assetsContent = await this.registry.executeTool('list_directory', {
        path: assetsDir
      });

      if (!assetsContent.error) {
        structure.push('\nExisting Assets:');
        structure.push(assetsContent.llmContent);
      }
    } catch (error) {
      structure.push(`Error analyzing structure: ${error}`);
    }

    return structure.join('\n');
  }

  // Private helper methods

  private detectComponentType(content: string): string {
    const types: string[] = [];
    if (content.match(/Header|Navbar/i)) types.push('Navigation');
    if (content.match(/Hero|Banner/i)) types.push('Hero Section');
    if (content.match(/Card/i)) types.push('Card');
    if (content.match(/Footer/i)) types.push('Footer');
    if (content.match(/Button/i)) types.push('Button');
    if (content.match(/Logo/i)) types.push('Logo');
    if (content.match(/Icon/i)) types.push('Icon');
    if (content.match(/Avatar/i)) types.push('Avatar');
    if (content.match(/Background/i)) types.push('Background');
    return types.join(', ') || 'Generic Component';
  }

  private extractUsageContext(content: string): string {
    const contexts: string[] = [];
    
    if (content.match(/onClick|button|interactive/i)) {
      contexts.push('Interactive element');
    }
    if (content.match(/brand|company|logo/i)) {
      contexts.push('Branding');
    }
    if (content.match(/hero|landing|main/i)) {
      contexts.push('Primary content area');
    }
    if (content.match(/decoration|aesthetic|visual/i)) {
      contexts.push('Decorative');
    }

    return contexts.join(', ') || 'General usage';
  }

  private extractStyleInfo(content: string): string {
    const styles: string[] = [];
    
    // Check for theme
    if (content.match(/dark.*mode|dark.*theme/i)) {
      styles.push('dark mode support');
    }
    
    // Check for color schemes
    const colors = content.match(/bg-\w+-\d+|text-\w+-\d+|from-\w+-\d+/g);
    if (colors && colors.length > 0) {
      styles.push(`uses ${colors[0]}`);
    }
    
    // Check for gradients
    if (content.match(/gradient/i)) {
      styles.push('gradient background');
    }
    
    // Check for rounded corners
    if (content.match(/rounded/i)) {
      styles.push('rounded corners');
    }

    return styles.join(', ') || 'standard styling';
  }

  private extractDimensions(content: string): string {
    const dimensions: string[] = [];
    
    // Check for size classes
    const sizes = content.match(/h-\d+|w-\d+|size-\d+/g);
    if (sizes) {
      dimensions.push(...sizes);
    }
    
    // Check for explicit dimensions
    const explicit = content.match(/\d+x\d+|\d+px/g);
    if (explicit) {
      dimensions.push(...explicit);
    }

    return dimensions.join(', ') || 'responsive sizing';
  }

  private extractAssetImports(content: string): string[] {
    const regex = /import\s+.*?\s+from\s+['"](.*?\.(png|jpg|jpeg|svg|gif|webp))['"]/gi;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  private extractPaths(searchResults: string): string[] {
    const regex = /File:\s*(.+)/g;
    const paths: string[] = [];
    let match;
    while ((match = regex.exec(searchResults)) !== null) {
      paths.push(match[1].trim());
    }
    return paths;
  }

  // Smart prompt generators

  private generateLogoPrompt(context: AssetContext): string {
    let prompt = 'Professional company logo';
    
    if (context.styleInfo?.includes('gradient')) {
      prompt += ', modern gradient design';
    }
    if (context.styleInfo?.includes('dark mode')) {
      prompt += ', works on dark and light backgrounds';
    }
    
    prompt += ', minimalist, clean, vector-style, corporate branding';
    
    return prompt;
  }

  private generateIconPrompt(context: AssetContext): string {
    let prompt = 'Simple icon';
    
    if (context.componentType?.includes('Navigation')) {
      prompt += ' for navigation menu';
    }
    
    prompt += ', flat design, monochromatic, 24x24px, clear silhouette';
    
    return prompt;
  }

  private generateBannerPrompt(context: AssetContext): string {
    let prompt = 'Hero banner image';
    
    if (context.styleInfo?.includes('gradient')) {
      const gradientMatch = context.styleInfo.match(/from-(\w+)-\d+/);
      if (gradientMatch) {
        prompt += `, ${gradientMatch[1]} color scheme`;
      }
    }
    
    if (context.usageContext?.includes('Primary content')) {
      prompt += ', attention-grabbing, professional';
    }
    
    prompt += ', modern, clean, tech-themed, 1920x1080';
    
    return prompt;
  }

  private generateBackgroundPrompt(context: AssetContext): string {
    let prompt = 'Subtle background pattern';
    
    if (context.styleInfo?.includes('dark mode')) {
      prompt += ', dark theme compatible';
    }
    
    prompt += ', minimal, non-distracting, elegant, repeatable texture';
    
    return prompt;
  }

  private generateIllustrationPrompt(context: AssetContext): string {
    let prompt = 'Custom illustration';
    
    if (context.componentType?.includes('Hero')) {
      prompt += ' for hero section';
    }
    
    prompt += ', modern flat design, friendly, professional, clean lines';
    
    return prompt;
  }

  /**
   * Get tool registry for direct access
   */
  getToolRegistry(): ToolRegistry {
    return this.registry;
  }

  /**
   * Get workspace directory
   */
  getWorkspaceDir(): string {
    return this.workspaceDir;
  }
}
