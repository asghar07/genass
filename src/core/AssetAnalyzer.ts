import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';
import { AssetNeed, CodebaseAnalysis } from '../types';
import { logger } from '../utils/logger';

interface AssetAnalysisResult {
  quality: 'low' | 'medium' | 'high';
  suitability: 'poor' | 'good' | 'excellent';
  recommendations: string[];
  metadata: {
    dimensions: { width: number; height: number };
    format: string;
    size: number;
    hasTransparency: boolean;
  };
}

export class AssetAnalyzer {
  async analyzeExistingAssets(assetPaths: string[]): Promise<Map<string, AssetAnalysisResult>> {
    const results = new Map<string, AssetAnalysisResult>();

    for (const assetPath of assetPaths) {
      try {
        const analysis = await this.analyzeAsset(assetPath);
        results.set(assetPath, analysis);
      } catch (error) {
        logger.warn(`Failed to analyze asset: ${assetPath}`, error);
      }
    }

    return results;
  }

  async enhanceAssetNeeds(
    analysis: CodebaseAnalysis,
    assetNeeds: AssetNeed[]
  ): Promise<AssetNeed[]> {
    const enhancedNeeds: AssetNeed[] = [];

    for (const need of assetNeeds) {
      const enhanced = await this.enhanceAssetNeed(need, analysis);
      enhancedNeeds.push(enhanced);
    }

    // Add intelligent asset suggestions based on analysis
    const suggestions = this.generateIntelligentSuggestions(analysis, enhancedNeeds);
    enhancedNeeds.push(...suggestions);

    // Sort by priority and relevance
    return this.prioritizeAssets(enhancedNeeds);
  }

  private async analyzeAsset(assetPath: string): Promise<AssetAnalysisResult> {
    const stats = await fs.stat(assetPath);
    const ext = path.extname(assetPath).toLowerCase();

    const metadata: AssetAnalysisResult['metadata'] = {
      dimensions: { width: 0, height: 0 },
      format: ext.slice(1),
      size: stats.size,
      hasTransparency: false
    };

    let quality: AssetAnalysisResult['quality'] = 'medium';
    let suitability: AssetAnalysisResult['suitability'] = 'good';
    const recommendations: string[] = [];

    // Analyze image properties if it's an image
    if (this.isImageFile(assetPath)) {
      try {
        const image = sharp(assetPath);
        const imageMetadata = await image.metadata();

        metadata.dimensions = {
          width: imageMetadata.width || 0,
          height: imageMetadata.height || 0
        };
        metadata.hasTransparency = imageMetadata.hasAlpha || false;

        // Quality assessment
        quality = this.assessImageQuality(imageMetadata, stats.size);

        // Suitability assessment
        suitability = this.assessImageSuitability(assetPath, imageMetadata);

        // Generate recommendations
        recommendations.push(...this.generateImageRecommendations(assetPath, imageMetadata, stats.size));

      } catch (error) {
        logger.warn(`Failed to analyze image metadata: ${assetPath}`, error);
      }
    }

    return {
      quality,
      suitability,
      recommendations,
      metadata
    };
  }

  private isImageFile(filePath: string): boolean {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
    return imageExtensions.includes(path.extname(filePath).toLowerCase());
  }

  private assessImageQuality(metadata: sharp.Metadata, fileSize: number): 'low' | 'medium' | 'high' {
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const pixels = width * height;

    // Quality based on resolution and file size efficiency
    if (pixels < 10000) return 'low'; // Very low resolution
    if (pixels > 1000000) return 'high'; // High resolution

    // Check file size efficiency (bytes per pixel)
    const bytesPerPixel = fileSize / pixels;
    if (bytesPerPixel > 10) return 'low'; // Inefficient compression
    if (bytesPerPixel < 2) return 'high'; // Good compression

    return 'medium';
  }

  private assessImageSuitability(filePath: string, metadata: sharp.Metadata): 'poor' | 'good' | 'excellent' {
    const fileName = path.basename(filePath).toLowerCase();
    const format = metadata.format || '';

    // Format suitability
    if (fileName.includes('icon') && format !== 'svg' && (metadata.width || 0) < 32) {
      return 'poor'; // Icons should be SVG or high res
    }

    if (fileName.includes('logo') && format === 'jpg') {
      return 'good'; // Logos better as PNG/SVG for transparency
    }

    if (fileName.includes('background') && format === 'png' && !metadata.hasAlpha) {
      return 'good'; // Backgrounds without transparency could be JPG
    }

    return 'excellent';
  }

  private generateImageRecommendations(
    filePath: string,
    metadata: sharp.Metadata,
    fileSize: number
  ): string[] {
    const recommendations: string[] = [];
    const fileName = path.basename(filePath).toLowerCase();
    const format = metadata.format || '';
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Format recommendations
    if (fileName.includes('icon') && format !== 'svg') {
      recommendations.push('Consider using SVG format for icons for better scalability');
    }

    if (fileName.includes('logo') && format === 'jpg') {
      recommendations.push('Use PNG format for logos to support transparency');
    }

    // Size recommendations
    if (fileSize > 1024 * 1024) { // > 1MB
      recommendations.push('Consider optimizing file size for better web performance');
    }

    // Resolution recommendations
    if (fileName.includes('favicon') && (width > 32 || height > 32)) {
      recommendations.push('Favicon should be 32x32 pixels for optimal display');
    }

    if (fileName.includes('social') && (width < 1200 || height < 630)) {
      recommendations.push('Social media images should be at least 1200x630 for optimal sharing');
    }

    return recommendations;
  }

  private async enhanceAssetNeed(need: AssetNeed, analysis: CodebaseAnalysis): Promise<AssetNeed> {
    const enhanced = { ...need };

    // Enhance prompt based on project context
    enhanced.suggestedPrompt = this.enhancePrompt(need, analysis);

    // Adjust dimensions based on usage context
    enhanced.dimensions = this.optimizeDimensions(need, analysis);

    // Refine priority based on project needs
    enhanced.priority = this.refinePriority(need, analysis);

    return enhanced;
  }

  private enhancePrompt(need: AssetNeed, analysis: CodebaseAnalysis): string {
    let prompt = need.suggestedPrompt;

    // Add project-specific context
    const projectType = analysis.projectType.toLowerCase();
    const frameworks = analysis.frameworks.map(f => f.toLowerCase());

    // Framework-specific enhancements
    if (frameworks.includes('material-ui') || frameworks.includes('material ui')) {
      prompt += ', following Material Design principles with clean lines and appropriate elevation';
    } else if (frameworks.includes('tailwind css')) {
      prompt += ', with modern flat design suitable for utility-first CSS framework';
    } else if (frameworks.includes('bootstrap')) {
      prompt += ', with professional design compatible with Bootstrap styling';
    }

    // Project type enhancements
    if (projectType.includes('react') || projectType.includes('vue') || projectType.includes('angular')) {
      prompt += ', optimized for modern web applications';
    } else if (projectType.includes('react native') || projectType.includes('ionic')) {
      prompt += ', designed for mobile applications with touch-friendly interface';
    }

    // Asset type specific enhancements
    switch (need.type) {
      case 'icon':
        prompt += ', minimalist icon with clear symbolic representation';
        break;
      case 'logo':
        prompt += ', professional brand identity with memorable visual impact';
        break;
      case 'banner':
        prompt += ', engaging banner design with clear visual hierarchy';
        break;
      case 'social-media':
        prompt += ', eye-catching design optimized for social media engagement';
        break;
    }

    return prompt;
  }

  private optimizeDimensions(need: AssetNeed, analysis: CodebaseAnalysis): AssetNeed['dimensions'] {
    const { type } = need;
    const frameworks = analysis.frameworks.map(f => f.toLowerCase());

    // Standard dimensions based on best practices
    const standardDimensions = {
      icon: { width: 24, height: 24, aspectRatio: '1:1' },
      logo: { width: 200, height: 60, aspectRatio: '10:3' },
      banner: { width: 1200, height: 400, aspectRatio: '3:1' },
      background: { width: 1920, height: 1080, aspectRatio: '16:9' },
      'social-media': { width: 1200, height: 630, aspectRatio: '1.91:1' },
      illustration: { width: 800, height: 600, aspectRatio: '4:3' },
      'ui-element': { width: 64, height: 64, aspectRatio: '1:1' }
    };

    let dimensions = standardDimensions[type] || need.dimensions;

    // Framework-specific adjustments
    if (frameworks.includes('material-ui') && type === 'icon') {
      dimensions = { width: 24, height: 24, aspectRatio: '1:1' }; // Material Design standard
    }

    // Mobile-specific adjustments
    if (analysis.projectType.includes('React Native') || analysis.projectType.includes('Ionic')) {
      if (type === 'icon') {
        dimensions = { width: 48, height: 48, aspectRatio: '1:1' }; // Larger for mobile
      }
    }

    return dimensions;
  }

  private refinePriority(need: AssetNeed, analysis: CodebaseAnalysis): 'high' | 'medium' | 'low' {
    let priority = need.priority;

    // Increase priority for essential assets
    if (need.type === 'logo' || need.type === 'icon') {
      priority = 'high';
    }

    // Increase priority based on missing essential assets
    const hasLogo = analysis.existingAssets.some(asset =>
      asset.toLowerCase().includes('logo')
    );
    const hasFavicon = analysis.existingAssets.some(asset =>
      asset.toLowerCase().includes('favicon') || asset.includes('ico')
    );

    if (!hasLogo && need.type === 'logo') {
      priority = 'high';
    }

    if (!hasFavicon && need.type === 'icon' && need.description.includes('favicon')) {
      priority = 'high';
    }

    // Adjust based on project maturity
    if (analysis.existingAssets.length < 3) {
      // New project - prioritize basic branding
      if (['logo', 'icon'].includes(need.type)) {
        priority = 'high';
      }
    }

    return priority;
  }

  private generateIntelligentSuggestions(
    analysis: CodebaseAnalysis,
    existingNeeds: AssetNeed[]
  ): AssetNeed[] {
    const suggestions: AssetNeed[] = [];

    // Check for missing essential assets
    const existingTypes = new Set(existingNeeds.map(need => need.type));

    // Always suggest favicon if missing
    if (!existingTypes.has('icon') ||
        !existingNeeds.some(need => need.description.includes('favicon'))) {
      suggestions.push({
        type: 'icon',
        description: 'Website favicon for browser tabs and bookmarks',
        context: 'Essential branding element for web presence',
        dimensions: { width: 32, height: 32, aspectRatio: '1:1' },
        usage: ['browser tabs', 'bookmarks', 'PWA'],
        priority: 'high',
        suggestedPrompt: 'A clean, recognizable favicon that represents the brand identity',
        filePath: 'public/favicon.ico'
      });
    }

    // Suggest OG image for social sharing
    if (!existingTypes.has('social-media')) {
      suggestions.push({
        type: 'social-media',
        description: 'Open Graph image for social media sharing',
        context: 'Displayed when website links are shared on social media',
        dimensions: { width: 1200, height: 630, aspectRatio: '1.91:1' },
        usage: ['Facebook', 'Twitter', 'LinkedIn sharing'],
        priority: 'medium',
        suggestedPrompt: 'Professional social media preview image with brand elements and clear messaging',
        filePath: 'public/og-image.png'
      });
    }

    // Suggest app icons for mobile projects
    if (analysis.frameworks.some(fw => ['React Native', 'Ionic', 'Expo'].includes(fw))) {
      if (!existingNeeds.some(need => need.description.includes('app icon'))) {
        suggestions.push({
          type: 'icon',
          description: 'Mobile app icon for app stores',
          context: 'Primary icon displayed in app stores and device home screens',
          dimensions: { width: 1024, height: 1024, aspectRatio: '1:1' },
          usage: ['App Store', 'Google Play', 'device home screen'],
          priority: 'high',
          suggestedPrompt: 'Vibrant and memorable app icon with clear brand representation suitable for mobile platforms',
          filePath: 'assets/app-icon.png'
        });
      }
    }

    // Suggest illustrations for empty states
    if (analysis.frameworks.includes('React') || analysis.frameworks.includes('Vue.js')) {
      suggestions.push({
        type: 'illustration',
        description: 'Empty state illustration',
        context: 'Friendly illustration for empty data states',
        dimensions: { width: 400, height: 300, aspectRatio: '4:3' },
        usage: ['empty lists', 'no search results', 'loading states'],
        priority: 'low',
        suggestedPrompt: 'Friendly, minimal illustration for empty states with soft colors and approachable design',
        filePath: 'src/assets/empty-state.svg'
      });
    }

    return suggestions;
  }

  private prioritizeAssets(assets: AssetNeed[]): AssetNeed[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };

    return assets.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by asset type importance
      const typeOrder = {
        logo: 6,
        icon: 5,
        'social-media': 4,
        banner: 3,
        illustration: 2,
        background: 1,
        'ui-element': 1
      };

      return (typeOrder[b.type] || 0) - (typeOrder[a.type] || 0);
    });
  }

  async validateAssetRequirements(need: AssetNeed): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Validate dimensions
    if (need.dimensions.width <= 0 || need.dimensions.height <= 0) {
      issues.push('Invalid dimensions specified');
    }

    // Validate aspect ratio consistency
    const calculatedRatio = need.dimensions.width / need.dimensions.height;
    const [ratioW, ratioH] = need.dimensions.aspectRatio.split(':').map(Number);
    const expectedRatio = ratioW / ratioH;

    if (Math.abs(calculatedRatio - expectedRatio) > 0.1) {
      issues.push('Dimensions do not match specified aspect ratio');
      suggestions.push(`Adjust dimensions to match ${need.dimensions.aspectRatio} ratio`);
    }

    // Type-specific validations
    switch (need.type) {
      case 'icon':
        if (need.dimensions.width !== need.dimensions.height) {
          suggestions.push('Icons should typically be square for consistency');
        }
        if (need.dimensions.width < 16) {
          issues.push('Icon dimensions too small for clear visibility');
        }
        break;

      case 'social-media':
        if (need.dimensions.width < 1200 || need.dimensions.height < 630) {
          issues.push('Social media images should be at least 1200x630 for optimal display');
        }
        break;

      case 'banner':
        if (need.dimensions.width < 800) {
          suggestions.push('Consider larger width for better banner impact');
        }
        break;
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
}