import { GoogleGenerativeAI } from '@google/generative-ai';
import { AssetNeed } from '../types';
import { logger } from '../utils/logger';

export class SmartFilenameGenerator {
  private client: GoogleGenerativeAI;
  private model: any;
  private cache: Map<string, string> = new Map();

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required for smart filename generation');
    }

    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 100,
      }
    });
  }

  async generateFilename(assetNeed: AssetNeed, context?: string): Promise<string> {
    // Create cache key
    const cacheKey = `${assetNeed.type}-${assetNeed.description}-${context || ''}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const prompt = this.buildFilenamePrompt(assetNeed, context);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const filename = this.sanitizeFilename(response.text());

      // Cache the result
      this.cache.set(cacheKey, filename);

      logger.debug('Generated smart filename', {
        type: assetNeed.type,
        description: assetNeed.description,
        filename,
        context
      });

      return filename;
    } catch (error) {
      logger.warn('Smart filename generation failed, using fallback', error);
      return this.generateFallbackFilename(assetNeed);
    }
  }

  private buildFilenamePrompt(assetNeed: AssetNeed, context?: string): string {
    return `Generate a SHORT, descriptive filename for this asset. Maximum 3 words, kebab-case.

Asset Type: ${assetNeed.type}
Description: ${assetNeed.description}
${context ? `Context/Page: ${context}` : ''}
${assetNeed.usage?.length ? `Usage: ${assetNeed.usage.join(', ')}` : ''}
${assetNeed.priority ? `Priority: ${assetNeed.priority}` : ''}

Requirements:
- Maximum 3 words (prefer 1-2)
- Use kebab-case (lowercase with hyphens)
- Be specific and semantic
- NO file extension
- NO dimensions
- NO timestamps

Examples:
- logo → "app-logo" or "brand-logo"
- icon for settings page → "settings-icon"
- banner for homepage hero → "hero-banner"
- social media preview → "og-preview"
- profile placeholder → "avatar-placeholder"
- loading spinner → "loader-spinner"

Output ONLY the filename, nothing else:`;
  }

  private sanitizeFilename(rawFilename: string): string {
    // Extract just the filename part if there's extra text
    let filename = rawFilename.trim();

    // Remove any markdown formatting
    filename = filename.replace(/[`*_]/g, '');

    // Take only the first line
    filename = filename.split('\n')[0];

    // Remove any file extensions that might have been added
    filename = filename.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');

    // Ensure kebab-case
    filename = filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Limit to 3 words (2 hyphens max)
    const parts = filename.split('-');
    if (parts.length > 3) {
      filename = parts.slice(0, 3).join('-');
    }

    // Ensure not empty
    if (!filename) {
      filename = 'asset';
    }

    return filename;
  }

  private generateFallbackFilename(assetNeed: AssetNeed): string {
    // Simple fallback based on type
    const typeMap: Record<string, string> = {
      'logo': 'app-logo',
      'icon': 'app-icon',
      'banner': 'hero-banner',
      'illustration': 'illustration',
      'background': 'background',
      'social-media': 'og-image',
      'ui-element': 'ui-element'
    };

    return typeMap[assetNeed.type] || assetNeed.type;
  }

  clearCache(): void {
    this.cache.clear();
  }
}