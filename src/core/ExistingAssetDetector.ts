import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import { AssetNeed } from '../types';
import { logger } from '../utils/logger';

export interface ExistingAsset {
  path: string;
  type: string;
  dimensions: { width: number; height: number };
  format: string;
  sizeKB: number;
  matchesNeed?: AssetNeed;
}

export class ExistingAssetDetector {
  async detectExistingAssets(projectPath: string, assetDirs: string[]): Promise<ExistingAsset[]> {
    const existingAssets: ExistingAsset[] = [];

    for (const dir of assetDirs) {
      const fullPath = path.join(projectPath, dir);

      if (await fs.pathExists(fullPath)) {
        const assets = await this.scanDirectory(fullPath);
        existingAssets.push(...assets);
      }
    }

    logger.info(`Found ${existingAssets.length} existing assets`, {
      directories: assetDirs
    });

    return existingAssets;
  }

  async filterOutExistingAssets(
    assetNeeds: AssetNeed[],
    existingAssets: ExistingAsset[]
  ): Promise<{ needed: AssetNeed[]; skipped: AssetNeed[]; matched: Map<AssetNeed, ExistingAsset> }> {
    const needed: AssetNeed[] = [];
    const skipped: AssetNeed[] = [];
    const matched = new Map<AssetNeed, ExistingAsset>();

    for (const need of assetNeeds) {
      const match = this.findMatchingAsset(need, existingAssets);

      if (match) {
        // Asset already exists, skip it
        skipped.push(need);
        matched.set(need, match);
        logger.debug(`Skipping asset - already exists`, {
          type: need.type,
          description: need.description,
          existingPath: match.path
        });
      } else {
        // Asset doesn't exist, needs generation
        needed.push(need);
      }
    }

    logger.info(`Asset filtering complete`, {
      total: assetNeeds.length,
      needed: needed.length,
      skipped: skipped.length
    });

    return { needed, skipped, matched };
  }

  private findMatchingAsset(need: AssetNeed, existingAssets: ExistingAsset[]): ExistingAsset | null {
    // Try to find an existing asset that matches this need
    for (const existing of existingAssets) {
      // Match by type first
      if (!this.typeMatches(need.type, existing.path)) {
        continue;
      }

      // Match by dimensions if specified
      if (need.dimensions?.width && need.dimensions?.height) {
        const dimensionMatch = this.dimensionsMatch(
          need.dimensions,
          existing.dimensions
        );

        if (!dimensionMatch) {
          continue;
        }
      }

      // Match by description/purpose
      if (this.descriptionMatches(need, existing.path)) {
        return existing;
      }
    }

    return null;
  }

  private typeMatches(needType: string, assetPath: string): boolean {
    const lowerPath = assetPath.toLowerCase();

    const typeKeywords: Record<string, string[]> = {
      'logo': ['logo', 'brand', 'wordmark'],
      'icon': ['icon', 'favicon', 'app-icon'],
      'banner': ['banner', 'hero', 'header'],
      'illustration': ['illustration', 'graphic', 'artwork'],
      'background': ['background', 'bg', 'pattern'],
      'social-media': ['og-', 'twitter', 'social', 'share'],
      'ui-element': ['button', 'badge', 'ui-']
    };

    const keywords = typeKeywords[needType] || [needType];
    return keywords.some(keyword => lowerPath.includes(keyword));
  }

  private dimensionsMatch(
    needDimensions: { width: number; height: number },
    existingDimensions: { width: number; height: number }
  ): boolean {
    // Allow 10% tolerance
    const tolerance = 0.1;

    const widthMatch = Math.abs(needDimensions.width - existingDimensions.width) / needDimensions.width <= tolerance;
    const heightMatch = Math.abs(needDimensions.height - existingDimensions.height) / needDimensions.height <= tolerance;

    return widthMatch && heightMatch;
  }

  private descriptionMatches(need: AssetNeed, assetPath: string): boolean {
    const filename = path.basename(assetPath, path.extname(assetPath)).toLowerCase();
    const description = need.description.toLowerCase();

    // Extract key words from description
    const descWords = description
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3); // Only words longer than 3 chars

    // Check if filename contains any key words
    return descWords.some(word => filename.includes(word));
  }

  private async scanDirectory(dir: string, assets: ExistingAsset[] = []): Promise<ExistingAsset[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, assets);
      } else if (this.isImageFile(entry.name)) {
        try {
          const asset = await this.analyzeAsset(fullPath);
          if (asset) {
            assets.push(asset);
          }
        } catch (error) {
          logger.warn(`Failed to analyze ${fullPath}`, error);
        }
      }
    }

    return assets;
  }

  private isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'].includes(ext);
  }

  private async analyzeAsset(assetPath: string): Promise<ExistingAsset | null> {
    try {
      const stats = await fs.stat(assetPath);
      const ext = path.extname(assetPath).toLowerCase();

      // For SVG, we can't use sharp
      if (ext === '.svg') {
        return {
          path: assetPath,
          type: this.inferTypeFromPath(assetPath),
          dimensions: { width: 0, height: 0 }, // SVG is scalable
          format: 'svg',
          sizeKB: stats.size / 1024
        };
      }

      // Use sharp for raster images
      const image = sharp(assetPath);
      const metadata = await image.metadata();

      return {
        path: assetPath,
        type: this.inferTypeFromPath(assetPath),
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0
        },
        format: metadata.format || ext.replace('.', ''),
        sizeKB: stats.size / 1024
      };
    } catch (error) {
      logger.warn(`Failed to analyze asset ${assetPath}`, error);
      return null;
    }
  }

  private inferTypeFromPath(assetPath: string): string {
    const lowerPath = assetPath.toLowerCase();

    if (lowerPath.includes('logo')) return 'logo';
    if (lowerPath.includes('icon') || lowerPath.includes('favicon')) return 'icon';
    if (lowerPath.includes('banner') || lowerPath.includes('hero')) return 'banner';
    if (lowerPath.includes('social') || lowerPath.includes('og-')) return 'social-media';
    if (lowerPath.includes('illustration')) return 'illustration';
    if (lowerPath.includes('background') || lowerPath.includes('bg-')) return 'background';

    return 'unknown';
  }
}