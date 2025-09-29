import path from 'path';
import fs from 'fs-extra';
import { globby } from 'globby';
import mime from 'mime-types';
import { CodebaseAnalysis, AssetNeed } from '../types';
import { logger } from '../utils/logger';

interface ScanOptions {
  excludePatterns: string[];
  assetDirectories: string[];
}

export class CodebaseScanner {
  private readonly imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
  private readonly codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.html', '.css', '.scss', '.sass', '.less'];

  async scanProject(projectPath: string, options: ScanOptions): Promise<CodebaseAnalysis> {
    logger.info('Starting codebase scan', { projectPath });

    const analysis: CodebaseAnalysis = {
      projectType: '',
      frameworks: [],
      existingAssets: [],
      missingAssets: [],
      assetDirectories: options.assetDirectories,
      recommendations: [],
      existingLogo: null
    };

    try {
      // Detect project type and frameworks
      analysis.projectType = await this.detectProjectType(projectPath);
      analysis.frameworks = await this.detectFrameworks(projectPath);

      // Find existing assets
      analysis.existingAssets = await this.findExistingAssets(projectPath, options.excludePatterns);

      // Detect existing logo for brand consistency
      analysis.existingLogo = await this.detectExistingLogo(projectPath);

      // Scan code files for asset references and needs
      const codeFiles = await this.findCodeFiles(projectPath, options.excludePatterns);
      const assetNeeds = await this.analyzeCodeFiles(codeFiles, projectPath);

      // Detect missing assets based on common patterns
      const missingAssets = await this.detectMissingAssets(projectPath, analysis, assetNeeds);
      analysis.missingAssets = missingAssets;

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      logger.info('Codebase scan completed', {
        projectType: analysis.projectType,
        frameworks: analysis.frameworks,
        existingAssets: analysis.existingAssets.length,
        missingAssets: analysis.missingAssets.length,
        existingLogo: analysis.existingLogo ? path.basename(analysis.existingLogo) : 'none'
      });

      return analysis;
    } catch (error) {
      logger.error('Codebase scan failed', error);
      throw error;
    }
  }

  private async detectProjectType(projectPath: string): Promise<string> {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);

      // React/Next.js detection
      if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
        if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
          return 'Next.js';
        }
        return 'React';
      }

      // Vue.js detection
      if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
        if (packageJson.dependencies?.nuxt || packageJson.devDependencies?.nuxt) {
          return 'Nuxt.js';
        }
        return 'Vue.js';
      }

      // Angular detection
      if (packageJson.dependencies?.['@angular/core']) {
        return 'Angular';
      }

      // Svelte detection
      if (packageJson.dependencies?.svelte || packageJson.devDependencies?.svelte) {
        return 'Svelte';
      }

      return 'Node.js';
    }

    // Check for other project types
    if (await fs.pathExists(path.join(projectPath, 'Cargo.toml'))) {
      return 'Rust';
    }

    if (await fs.pathExists(path.join(projectPath, 'go.mod'))) {
      return 'Go';
    }

    if (await fs.pathExists(path.join(projectPath, 'requirements.txt')) ||
        await fs.pathExists(path.join(projectPath, 'pyproject.toml'))) {
      return 'Python';
    }

    return 'Unknown';
  }

  private async detectFrameworks(projectPath: string): Promise<string[]> {
    const frameworks: string[] = [];
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // UI Libraries
      if (deps['@mui/material'] || deps['@material-ui/core']) frameworks.push('Material-UI');
      if (deps['antd']) frameworks.push('Ant Design');
      if (deps['@chakra-ui/react']) frameworks.push('Chakra UI');
      if (deps['react-bootstrap'] || deps['bootstrap']) frameworks.push('Bootstrap');
      if (deps['tailwindcss']) frameworks.push('Tailwind CSS');

      // Mobile frameworks
      if (deps['react-native']) frameworks.push('React Native');
      if (deps['@ionic/react'] || deps['@ionic/angular']) frameworks.push('Ionic');
      if (deps['expo']) frameworks.push('Expo');

      // Desktop frameworks
      if (deps['electron']) frameworks.push('Electron');
      if (deps['@tauri-apps/api']) frameworks.push('Tauri');

      // Backend frameworks
      if (deps['express']) frameworks.push('Express');
      if (deps['fastify']) frameworks.push('Fastify');
      if (deps['@nestjs/core']) frameworks.push('NestJS');
    }

    return frameworks;
  }

  private async findExistingAssets(projectPath: string, excludePatterns: string[]): Promise<string[]> {
    const patterns = [
      `**/*{${this.imageExtensions.join(',')}}`,
      '!node_modules/**',
      '!dist/**',
      '!build/**',
      ...excludePatterns.map(pattern => `!${pattern}`)
    ];

    const files = await globby(patterns, { cwd: projectPath, absolute: true });
    return files;
  }

  private async findCodeFiles(projectPath: string, excludePatterns: string[]): Promise<string[]> {
    const patterns = [
      `**/*{${this.codeExtensions.join(',')}}`,
      '!node_modules/**',
      '!dist/**',
      '!build/**',
      '!coverage/**',
      ...excludePatterns.map(pattern => `!${pattern}`)
    ];

    const files = await globby(patterns, { cwd: projectPath, absolute: true });
    return files;
  }

  private async analyzeCodeFiles(codeFiles: string[], projectPath: string): Promise<AssetNeed[]> {
    const assetNeeds: AssetNeed[] = [];

    for (const filePath of codeFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const needs = this.extractAssetNeedsFromCode(content, filePath, projectPath);
        assetNeeds.push(...needs);
      } catch (error) {
        logger.warn(`Failed to read file: ${filePath}`, error);
      }
    }

    return assetNeeds;
  }

  private extractAssetNeedsFromCode(content: string, filePath: string, projectPath: string): AssetNeed[] {
    const needs: AssetNeed[] = [];
    const relativePath = path.relative(projectPath, filePath);

    // Common asset patterns to look for
    const patterns = [
      // Image imports/requires
      /(?:import|require)\s*\(\s*['"](.*?\.(png|jpg|jpeg|gif|svg|webp|ico))['"]\s*\)/g,
      // CSS background-image
      /background-image:\s*url\s*\(\s*['"](.*?)['"]\s*\)/g,
      // HTML img src
      /<img[^>]+src\s*=\s*['"](.*?)['"]/g,
      // Missing alt text indicators
      /<img[^>]+(?!.*alt\s*=)/g,
      // Placeholder text patterns
      /(?:placeholder|missing|default|no-image|placeholder\.png)/gi,
      // Icon usage patterns
      /(?:icon|Icon)['":\s]*['"](.*?)['"]/g,
      // Logo patterns
      /(?:logo|Logo)['":\s]*['"](.*?)['"]/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const assetPath = match[1];

        if (assetPath && this.isAssetMissing(assetPath, projectPath)) {
          needs.push({
            type: this.determineAssetType(assetPath, content),
            description: `Missing asset referenced in ${relativePath}`,
            context: this.extractContext(content, match.index),
            dimensions: this.inferDimensions(content, match.index),
            usage: [relativePath],
            priority: this.determinePriority(assetPath, content),
            suggestedPrompt: this.generateSuggestedPrompt(assetPath, content),
            filePath: assetPath,
            existingAsset: undefined
          });
        }
      }
    });

    return needs;
  }

  private isAssetMissing(assetPath: string, projectPath: string): boolean {
    // Check if the asset path exists
    const fullPath = path.resolve(projectPath, assetPath);
    return !fs.existsSync(fullPath);
  }

  private determineAssetType(assetPath: string, content: string): AssetNeed['type'] {
    const path = assetPath.toLowerCase();
    const context = content.toLowerCase();

    if (path.includes('icon') || context.includes('icon')) return 'icon';
    if (path.includes('logo') || context.includes('logo')) return 'logo';
    if (path.includes('banner') || context.includes('banner')) return 'banner';
    if (path.includes('background') || context.includes('background')) return 'background';
    if (path.includes('social') || context.includes('social')) return 'social-media';
    if (path.includes('illustration') || context.includes('illustration')) return 'illustration';

    return 'ui-element';
  }

  private extractContext(content: string, index: number): string {
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + 100);
    return content.slice(start, end);
  }

  private inferDimensions(content: string, index: number): { width: number; height: number; aspectRatio: string } {
    // Look for width/height hints in nearby code
    const context = this.extractContext(content, index);

    // Common dimension patterns
    const dimensionPatterns = [
      /width[:\s]*(\d+)/i,
      /height[:\s]*(\d+)/i,
      /size[:\s]*(\d+)/i
    ];

    let width = 256; // default
    let height = 256; // default

    dimensionPatterns.forEach(pattern => {
      const match = pattern.exec(context);
      if (match) {
        const value = parseInt(match[1]);
        if (pattern.source.includes('width')) width = value;
        if (pattern.source.includes('height')) height = value;
        if (pattern.source.includes('size')) width = height = value;
      }
    });

    const aspectRatio = this.calculateAspectRatio(width, height);
    return { width, height, aspectRatio };
  }

  private calculateAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  }

  private determinePriority(assetPath: string, content: string): 'high' | 'medium' | 'low' {
    const path = assetPath.toLowerCase();
    const context = content.toLowerCase();

    // High priority indicators
    if (path.includes('logo') || path.includes('icon') || path.includes('favicon')) return 'high';
    if (context.includes('required') || context.includes('essential')) return 'high';
    if (path.includes('hero') || path.includes('banner')) return 'high';

    // Medium priority indicators
    if (path.includes('social') || path.includes('share')) return 'medium';
    if (context.includes('important')) return 'medium';

    return 'low';
  }

  private generateSuggestedPrompt(assetPath: string, content: string): string {
    const type = this.determineAssetType(assetPath, content);
    const context = this.extractContext(content, 0);

    const basePrompts = {
      icon: 'A modern, minimalist icon with clean lines and flat design',
      logo: 'A professional logo design with modern typography and clean aesthetics',
      banner: 'A modern banner design with gradient background and professional layout',
      background: 'A subtle background pattern or gradient suitable for web use',
      illustration: 'A modern illustration with clean vector style and contemporary design',
      'social-media': 'A social media optimized image with engaging design and proper dimensions',
      'ui-element': 'A clean UI element with modern design principles and proper styling'
    };

    return basePrompts[type] || 'A modern, professional design element';
  }

  private async detectMissingAssets(
    projectPath: string,
    analysis: CodebaseAnalysis,
    codeBasedNeeds: AssetNeed[]
  ): Promise<AssetNeed[]> {
    const allNeeds: AssetNeed[] = [...codeBasedNeeds];

    // Add common missing assets based on project type
    const commonAssets = this.getCommonMissingAssets(analysis.projectType, analysis.frameworks);
    allNeeds.push(...commonAssets);

    // Remove duplicates and filter existing assets
    const uniqueNeeds = this.deduplicateAssets(allNeeds);

    return uniqueNeeds.filter(need =>
      !analysis.existingAssets.some(existing =>
        existing.includes(path.basename(need.filePath))
      )
    );
  }

  private getCommonMissingAssets(projectType: string, frameworks: string[]): AssetNeed[] {
    const commonAssets: AssetNeed[] = [];

    // Web application common assets
    if (['React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js'].includes(projectType)) {
      commonAssets.push(
        {
          type: 'icon',
          description: 'Favicon for browser tab',
          context: 'Website favicon displayed in browser tabs and bookmarks',
          dimensions: { width: 32, height: 32, aspectRatio: '1:1' },
          usage: ['public/favicon.ico', 'static/favicon.ico'],
          priority: 'high',
          suggestedPrompt: 'A clean, recognizable favicon icon that represents the brand',
          filePath: 'public/favicon.ico'
        },
        {
          type: 'logo',
          description: 'Main application logo',
          context: 'Primary logo displayed in header and branding',
          dimensions: { width: 200, height: 60, aspectRatio: '10:3' },
          usage: ['components/Header', 'layout'],
          priority: 'high',
          suggestedPrompt: 'A professional logo design with modern typography and brand colors',
          filePath: 'public/logo.png'
        },
        {
          type: 'banner',
          description: 'Hero section banner image',
          context: 'Main banner for landing page hero section',
          dimensions: { width: 1200, height: 600, aspectRatio: '2:1' },
          usage: ['homepage', 'landing'],
          priority: 'medium',
          suggestedPrompt: 'A modern hero banner with gradient background and professional design',
          filePath: 'public/hero-banner.png'
        }
      );
    }

    // Mobile app specific assets
    if (['React Native', 'Ionic', 'Expo'].some(fw => frameworks.includes(fw))) {
      commonAssets.push(
        {
          type: 'icon',
          description: 'App store icon',
          context: 'Icon displayed in app stores and on device home screens',
          dimensions: { width: 1024, height: 1024, aspectRatio: '1:1' },
          usage: ['app stores', 'device home screen'],
          priority: 'high',
          suggestedPrompt: 'A vibrant app icon with clear, recognizable design suitable for mobile platforms',
          filePath: 'assets/app-icon.png'
        },
        {
          type: 'icon',
          description: 'Splash screen logo',
          context: 'Logo displayed on app loading screen',
          dimensions: { width: 400, height: 400, aspectRatio: '1:1' },
          usage: ['splash screen'],
          priority: 'medium',
          suggestedPrompt: 'A centered logo design for app splash screen with transparent background',
          filePath: 'assets/splash-logo.png'
        }
      );
    }

    return commonAssets;
  }

  private deduplicateAssets(assets: AssetNeed[]): AssetNeed[] {
    const seen = new Set<string>();
    return assets.filter(asset => {
      const key = `${asset.type}-${asset.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private generateRecommendations(analysis: CodebaseAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.existingAssets.length === 0) {
      recommendations.push('Consider creating a dedicated assets directory (e.g., /assets or /public/images)');
    }

    if (analysis.missingAssets.filter(a => a.type === 'icon').length > 3) {
      recommendations.push('Create a consistent icon system with unified style and sizing');
    }

    if (analysis.frameworks.includes('Tailwind CSS')) {
      recommendations.push('Generate assets optimized for Tailwind CSS design system');
    }

    if (analysis.projectType.includes('React') || analysis.projectType.includes('Vue')) {
      recommendations.push('Consider creating SVG icons for better scalability and performance');
    }

    if (analysis.missingAssets.filter(a => a.priority === 'high').length > 0) {
      recommendations.push('Prioritize generating high-priority assets like logos and favicons first');
    }

    return recommendations;
  }

  /**
   * Detects existing logo files in the codebase
   * Searches common directories for logo files and returns the best match
   * Priority: SVG > PNG > JPG > WEBP
   */
  async detectExistingLogo(projectPath: string): Promise<string | null> {
    logger.info('Detecting existing logo in project', { projectPath });

    try {
      // Common directories where logos are typically stored
      const searchDirectories = [
        'public',
        'public/images',
        'public/assets',
        'public/img',
        'static',
        'static/images',
        'static/assets',
        'assets',
        'assets/images',
        'src/assets',
        'src/assets/images',
        'src/images',
        'images',
        'img'
      ];

      // Logo file patterns to search for
      const logoPatterns = [
        '**/logo.svg',
        '**/logo.png',
        '**/logo.jpg',
        '**/logo.jpeg',
        '**/logo.webp',
        '**/*logo*.svg',
        '**/*logo*.png',
        '**/*logo*.jpg',
        '**/*logo*.jpeg',
        '**/*logo*.webp'
      ];

      // Build search patterns with exclusions
      const patterns = [
        ...logoPatterns,
        '!node_modules/**',
        '!dist/**',
        '!build/**',
        '!.next/**',
        '!.nuxt/**',
        '!coverage/**',
        '!.git/**'
      ];

      // Search for logo files
      const logoFiles = await globby(patterns, {
        cwd: projectPath,
        absolute: true,
        caseSensitiveMatch: false
      });

      if (logoFiles.length === 0) {
        logger.info('No existing logo files found');
        return null;
      }

      logger.info(`Found ${logoFiles.length} logo file(s)`, { files: logoFiles.map(f => path.basename(f)) });

      // Prioritize logos by format and location
      const prioritizedLogo = this.prioritizeLogoFile(logoFiles, projectPath);

      if (prioritizedLogo) {
        logger.info('Selected logo file', {
          path: prioritizedLogo,
          basename: path.basename(prioritizedLogo)
        });
      }

      return prioritizedLogo;

    } catch (error) {
      logger.error('Failed to detect existing logo', error);
      return null;
    }
  }

  /**
   * Prioritizes logo files based on format and location
   * Priority order:
   * 1. Format: SVG > PNG > JPG > WEBP
   * 2. Location: public > static > assets > src
   * 3. Filename: Exact 'logo.*' over partial matches
   */
  private prioritizeLogoFile(logoFiles: string[], projectPath: string): string | null {
    if (logoFiles.length === 0) return null;
    if (logoFiles.length === 1) return logoFiles[0];

    // Score each logo file
    const scoredLogos = logoFiles.map(filePath => {
      let score = 0;
      const basename = path.basename(filePath).toLowerCase();
      const relativePath = path.relative(projectPath, filePath).toLowerCase();
      const ext = path.extname(basename).toLowerCase();

      // Format priority (higher is better)
      if (ext === '.svg') score += 1000;
      else if (ext === '.png') score += 800;
      else if (ext === '.jpg' || ext === '.jpeg') score += 600;
      else if (ext === '.webp') score += 400;

      // Location priority
      if (relativePath.startsWith('public/')) score += 300;
      else if (relativePath.startsWith('static/')) score += 250;
      else if (relativePath.startsWith('assets/')) score += 200;
      else if (relativePath.startsWith('src/assets/')) score += 180;
      else if (relativePath.startsWith('src/')) score += 150;

      // Exact filename match bonus
      if (basename === 'logo.svg' || basename === 'logo.png' ||
          basename === 'logo.jpg' || basename === 'logo.jpeg' ||
          basename === 'logo.webp') {
        score += 100;
      }

      // Shorter path is often more canonical
      const pathDepth = relativePath.split(path.sep).length;
      score += Math.max(0, 50 - pathDepth * 5);

      return { filePath, score };
    });

    // Sort by score descending and return the highest scored logo
    scoredLogos.sort((a, b) => b.score - a.score);

    logger.debug('Logo prioritization results', {
      topCandidate: {
        path: scoredLogos[0].filePath,
        score: scoredLogos[0].score
      },
      allCandidates: scoredLogos.map(l => ({
        basename: path.basename(l.filePath),
        score: l.score
      }))
    });

    return scoredLogos[0].filePath;
  }
}