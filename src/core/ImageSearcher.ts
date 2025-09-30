import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger';

export interface FoundImage {
  path: string;
  filename: string;
  directory: string;
  matchReason: string;
}

export class ImageSearcher {
  async searchForImages(
    projectPath: string,
    searchTerms: string[],
    assetDirs: string[]
  ): Promise<FoundImage[]> {
    const foundImages: FoundImage[] = [];

    logger.debug('Searching for images', { searchTerms, assetDirs });

    for (const dir of assetDirs) {
      const fullPath = path.join(projectPath, dir);

      if (await fs.pathExists(fullPath)) {
        const images = await this.searchDirectory(fullPath, searchTerms);
        foundImages.push(...images);
      }
    }

    // Also search common locations
    const commonDirs = ['public', 'assets', 'static', 'images', 'src/assets'];
    for (const dir of commonDirs) {
      if (assetDirs.includes(dir)) continue; // Skip if already searched

      const fullPath = path.join(projectPath, dir);
      if (await fs.pathExists(fullPath)) {
        const images = await this.searchDirectory(fullPath, searchTerms);
        foundImages.push(...images);
      }
    }

    logger.info(`Found ${foundImages.length} matching images`, { searchTerms });

    return foundImages;
  }

  detectImageReferences(prompt: string): string[] {
    const references: string[] = [];

    // Pattern 1: Direct mentions with extensions
    const extensionPattern = /(\w+[-_\w]*\.(png|jpg|jpeg|webp|svg|gif))/gi;
    const extensionMatches = prompt.match(extensionPattern);
    if (extensionMatches) {
      references.push(...extensionMatches);
    }

    // Pattern 2: Keywords suggesting reference to existing images
    const keywords = [
      /(?:using|based on|similar to|like|from|reference)\s+(?:my|the|our)?\s*(\w+[-_\w]*)/gi,
      /(?:existing|current)\s+(\w+)/gi,
      /(\w+[-_\w]*)\s+(?:image|logo|icon|banner)/gi
    ];

    for (const pattern of keywords) {
      const matches = prompt.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          references.push(match[1]);
        }
      }
    }

    // Pattern 3: Common asset names
    const assetNames = [
      'logo', 'app-logo', 'brand-logo',
      'hero', 'hero-banner', 'hero-image',
      'icon', 'app-icon', 'favicon',
      'background', 'bg-image',
      'banner', 'header-banner'
    ];

    const lowerPrompt = prompt.toLowerCase();
    for (const name of assetNames) {
      if (lowerPrompt.includes(name)) {
        references.push(name);
      }
    }

    // Remove duplicates and clean up
    return [...new Set(references)]
      .map(ref => ref.toLowerCase().trim())
      .filter(ref => ref.length > 2);
  }

  private async searchDirectory(
    dir: string,
    searchTerms: string[],
    foundImages: FoundImage[] = [],
    depth: number = 0
  ): Promise<FoundImage[]> {
    if (depth > 3) return foundImages; // Limit depth

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip common ignored directories
        if (entry.isDirectory() && ['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.searchDirectory(fullPath, searchTerms, foundImages, depth + 1);
        } else if (this.isImageFile(entry.name)) {
          // Check if filename matches any search term
          const matchReason = this.findMatch(entry.name, searchTerms);
          if (matchReason) {
            foundImages.push({
              path: fullPath,
              filename: entry.name,
              directory: dir,
              matchReason
            });
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to search directory ${dir}`, error);
    }

    return foundImages;
  }

  private isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'].includes(ext);
  }

  private findMatch(filename: string, searchTerms: string[]): string | null {
    const lowerFilename = filename.toLowerCase();
    const baseFilename = path.basename(filename, path.extname(filename)).toLowerCase();

    for (const term of searchTerms) {
      const lowerTerm = term.toLowerCase();

      // Exact match
      if (baseFilename === lowerTerm) {
        return `Exact match: "${term}"`;
      }

      // Contains match
      if (lowerFilename.includes(lowerTerm)) {
        return `Contains: "${term}"`;
      }

      // Fuzzy match (term is subset of filename or vice versa)
      const termWords = lowerTerm.split(/[-_\s]+/);
      const filenameWords = baseFilename.split(/[-_\s]+/);

      const overlap = termWords.filter(word => filenameWords.includes(word));
      if (overlap.length > 0 && overlap.length >= termWords.length * 0.5) {
        return `Fuzzy match: "${term}" (${overlap.join(', ')})`;
      }
    }

    return null;
  }

  async selectBestMatch(foundImages: FoundImage[]): Promise<FoundImage | null> {
    if (foundImages.length === 0) return null;
    if (foundImages.length === 1) return foundImages[0];

    // Prioritize exact matches
    const exactMatches = foundImages.filter(img => img.matchReason.startsWith('Exact'));
    if (exactMatches.length > 0) {
      return exactMatches[0];
    }

    // Return first contains match
    const containsMatches = foundImages.filter(img => img.matchReason.startsWith('Contains'));
    if (containsMatches.length > 0) {
      return containsMatches[0];
    }

    // Return first fuzzy match
    return foundImages[0];
  }
}