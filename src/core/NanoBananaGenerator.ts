import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AssetNeed, GeneratedAsset } from '../types';
import { logger } from '../utils/logger';

interface GenerationOptions {
  outputDir: string;
  format: 'png' | 'jpg' | 'webp';
  quality?: number;
  maxRetries?: number;
  enableCharacterConsistency?: boolean;
  blendImages?: string[];
}

interface NanoBananaConfig {
  model: string;
  quality: 'standard' | 'high';
  costPerGeneration: number;
  enableWatermark: boolean;
  negativePrompt: string;
  minQualityThreshold: number;
  maxRegenerationAttempts: number;
}

interface QualityCheckResult {
  passed: boolean;
  score: number;
  issues: string[];
}

export class NanoBananaGenerator {
  private client: GoogleGenerativeAI;
  private defaultConfig: NanoBananaConfig;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    // Use v1 API to avoid OAuth2 requirement
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    this.defaultConfig = {
      model: process.env.NANO_BANANA_MODEL || 'gemini-2.5-flash-image-preview',
      quality: (process.env.IMAGE_GENERATION_QUALITY as 'standard' | 'high') || 'high',
      costPerGeneration: parseFloat(process.env.IMAGE_COST_PER_GENERATION || '0.039'),
      enableWatermark: true, // SynthID watermark is automatically applied
      negativePrompt: 'blurry, low quality, pixelated, watermark, text overlay, signature, distorted, noisy, grainy, jpeg artifacts, oversaturated, amateur, ugly, deformed, messy, cluttered, inconsistent',
      minQualityThreshold: 0.7, // Minimum quality score (0-1)
      maxRegenerationAttempts: 2 // Max attempts if quality check fails
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Nano Banana Generator');

    try {
      // Test basic connectivity with Nano Banana model
      logger.info('Nano Banana Generator initialized successfully', {
        model: this.defaultConfig.model,
        costPerGeneration: this.defaultConfig.costPerGeneration,
        quality: this.defaultConfig.quality
      });
    } catch (error) {
      logger.error('Failed to initialize Nano Banana Generator', error);
      throw new Error(`Nano Banana initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateAsset(
    assetNeed: AssetNeed,
    options: GenerationOptions
  ): Promise<GeneratedAsset> {
    const startTime = Date.now();
    logger.info('Starting Nano Banana asset generation', {
      type: assetNeed.type,
      description: assetNeed.description,
      dimensions: assetNeed.dimensions
    });

    let totalCost = 0;
    let regenerationAttempts = 0;

    try {
      // Prepare enhanced prompt for Nano Banana
      const enhancedPrompt = this.enhancePromptForNanoBanana(assetNeed);

      let imageData: { imageData: Buffer; mimeType: string };
      let filePath: string;
      let qualityScore = 0;

      // Quality validation loop with regeneration
      while (regenerationAttempts <= this.defaultConfig.maxRegenerationAttempts) {
        // Generate the image using Nano Banana
        imageData = await this.generateWithNanoBanana(enhancedPrompt, assetNeed, options);
        totalCost += this.defaultConfig.costPerGeneration;

        // Process and save the image
        filePath = await this.processAndSaveImage(
          imageData,
          assetNeed,
          options
        );

        // Perform quality check
        const qualityCheck = await this.performQualityCheck(filePath, assetNeed);
        qualityScore = qualityCheck.score;

        logger.info('Quality check completed', {
          score: qualityScore,
          passed: qualityCheck.passed,
          issues: qualityCheck.issues,
          attempt: regenerationAttempts + 1
        });

        if (qualityCheck.passed) {
          // Quality check passed, return the result
          const generationTime = Date.now() - startTime;

          const result: GeneratedAsset = {
            assetNeed,
            filePath,
            prompt: enhancedPrompt,
            success: true,
            metadata: {
              model: this.defaultConfig.model,
              generationTime,
              cost: totalCost,
              qualityScore,
              regenerationAttempts
            }
          };

          logger.info('Nano Banana asset generated successfully', {
            type: assetNeed.type,
            filePath,
            generationTime,
            cost: totalCost,
            qualityScore,
            regenerationAttempts
          });

          return result;
        } else {
          // Quality check failed, regenerate if attempts remain
          regenerationAttempts++;

          if (regenerationAttempts <= this.defaultConfig.maxRegenerationAttempts) {
            logger.warn('Quality check failed, regenerating', {
              attempt: regenerationAttempts,
              maxAttempts: this.defaultConfig.maxRegenerationAttempts,
              issues: qualityCheck.issues
            });

            // Clean up the low-quality image
            await fs.remove(filePath);

            // Add delay before regeneration
            await this.delay(2000);
          } else {
            // Max regeneration attempts reached, return with warning
            logger.warn('Max regeneration attempts reached, using last generated image', {
              qualityScore,
              issues: qualityCheck.issues
            });

            const generationTime = Date.now() - startTime;

            return {
              assetNeed,
              filePath,
              prompt: enhancedPrompt,
              success: true,
              metadata: {
                model: this.defaultConfig.model,
                generationTime,
                cost: totalCost,
                qualityScore,
                regenerationAttempts,
                warning: 'Quality below threshold but max regeneration attempts reached'
              }
            };
          }
        }
      }

      // This should not be reached, but added for completeness
      throw new Error('Unexpected error in quality validation loop');

    } catch (error) {
      logger.error('Nano Banana asset generation failed', {
        type: assetNeed.type,
        description: assetNeed.description,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        assetNeed,
        filePath: '',
        prompt: assetNeed.suggestedPrompt,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          model: this.defaultConfig.model,
          generationTime: Date.now() - startTime,
          cost: totalCost
        }
      };
    }
  }

  async generateMultipleAssets(
    assets: AssetNeed[],
    options: GenerationOptions,
    concurrencyLimit: number = 3
  ): Promise<GeneratedAsset[]> {
    logger.info(`Starting Nano Banana batch generation of ${assets.length} assets`);

    const results: GeneratedAsset[] = [];
    const batches = this.createBatches(assets, concurrencyLimit);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} assets)`);

      const batchPromises = batch.map(asset =>
        this.generateAsset(asset, options)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error(`Batch generation failed for asset ${index}`, result.reason);
          results.push({
            assetNeed: batch[index],
            filePath: '',
            prompt: batch[index].suggestedPrompt,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Batch generation failed',
            metadata: {
              model: this.defaultConfig.model,
              generationTime: 0,
              cost: 0
            }
          });
        }
      });

      // Add delay between batches to respect rate limits
      if (i < batches.length - 1) {
        await this.delay(6000); // 6 second delay for free tier rate limits
      }
    }

    const successful = results.filter(r => r.success).length;
    const totalCost = results.reduce((sum, r) => sum + r.metadata.cost, 0);

    logger.info(`Nano Banana batch generation completed`, {
      total: assets.length,
      successful,
      failed: assets.length - successful,
      totalCost: totalCost.toFixed(3)
    });

    return results;
  }

  private enhancePromptForNanoBanana(assetNeed: AssetNeed): string {
    let prompt = assetNeed.suggestedPrompt;

    // Modern design color palettes based on trending design systems
    const colorPalettes: Record<string, string> = {
      icon: 'Use modern, vibrant colors from Material Design 3 or iOS design guidelines. Consider monochromatic schemes for simplicity or accent colors for emphasis.',
      logo: 'Apply professional brand color palettes: primary brand color with complementary accent. Follow 60-30-10 color rule. Consider psychological impact of colors.',
      banner: 'Use eye-catching gradient overlays or bold color blocks. Trending: subtle glassmorphism, vibrant gradients (purple-to-pink, blue-to-cyan), or high-contrast duotones.',
      illustration: 'Contemporary illustration colors: pastel palettes for softness, or saturated colors for energy. Trending: earthy tones, neon accents, or retro color schemes.',
      background: 'Subtle gradients or geometric patterns in muted tones. Trending: soft mesh gradients, abstract shapes, or minimalist textures in neutral colors.',
      'social-media': 'Bold, attention-grabbing colors optimized for social platforms. Use platform-specific color psychology (Instagram: warm/vibrant, LinkedIn: professional/blue, Twitter: energetic).',
      'ui-element': 'Follow modern UI color systems: neutral base with semantic colors (success green, error red, warning amber). Ensure WCAG AA accessibility contrast ratios.'
    };

    // Enhanced style guidelines with composition instructions
    const styleGuidelines: Record<string, string> = {
      icon: 'Modern flat design with subtle depth through shadows or gradients. Use geometric precision with 2-4px stroke weight. Maintain 20% padding around icon boundaries. Center composition with clear focal point.',
      logo: 'Professional vector aesthetic with scalable elements. Use golden ratio proportions (1.618:1). Create balanced negative space. Design for horizontal and vertical layouts. Ensure legibility at 16px minimum size.',
      banner: 'Eye-catching hero composition with rule of thirds. Create clear visual hierarchy: primary message (largest), secondary info (medium), CTA (prominent). Use directional flow (left-to-right, Z-pattern). Add subtle parallax depth.',
      illustration: 'Contemporary flat illustration style with cohesive visual language. Use consistent line weights (2-3px). Apply limited color palette (3-5 colors max). Create depth through layering and overlapping shapes.',
      background: 'Subtle, non-distracting patterns that enhance foreground content. Use low-opacity elements (10-20%). Create gentle movement through organic shapes. Maintain visual breathing room.',
      'social-media': 'Platform-optimized composition with safe zones (avoid text near edges). Place key elements in upper-left quadrant (first point of attention). Use bold typography (minimum 24px). Create thumb-stopping visual contrast.',
      'ui-element': 'Clean component design following atomic design principles. Use 8px grid system. Maintain consistent border-radius (4px, 8px, or 16px). Provide clear interactive states (default, hover, active, disabled).'
    };

    // Technical quality specifications
    const qualitySpecs = [
      'ultra high quality',
      'professional grade',
      'crisp details',
      'sharp edges',
      'clean execution',
      'polished finish',
      'production-ready'
    ];

    // Composition and layout instructions
    const compositionInstructions: Record<string, string> = {
      icon: 'Centered composition with optical balance. Use grid-based alignment. Maintain consistent visual weight.',
      logo: 'Balanced layout with golden ratio proportions. Ensure wordmark-icon harmony. Create memorable silhouette.',
      banner: 'Rule of thirds composition. Create focal point with size/color contrast. Establish clear reading hierarchy.',
      illustration: 'Dynamic but balanced composition. Use overlapping layers for depth. Guide eye flow with directional elements.',
      background: 'Seamless tile-able pattern or full-bleed gradient. Subtle directional flow. Maintain visual harmony.',
      'social-media': 'Platform-optimized framing. Text-safe zones. Attention-grabbing focal point in upper third.',
      'ui-element': 'Consistent spacing (8px grid). Clear affordance through visual cues. Proper state differentiation.'
    };

    // Get enhancements for this asset type
    const colorGuidance = colorPalettes[assetNeed.type] || 'Use professional, harmonious color scheme';
    const styleGuide = styleGuidelines[assetNeed.type] || 'Modern professional design style';
    const composition = compositionInstructions[assetNeed.type] || 'Balanced, professional composition';
    const qualityTerms = qualitySpecs.join(', ');

    // Build enhanced prompt with all improvements
    prompt = `${prompt}.

STYLE: ${styleGuide}

COMPOSITION: ${composition}

COLORS: ${colorGuidance}

QUALITY: ${qualityTerms}. AVOID: ${this.defaultConfig.negativePrompt}.

TECHNICAL SPECS: ${assetNeed.dimensions.width}x${assetNeed.dimensions.height}px, ${assetNeed.dimensions.aspectRatio} aspect ratio, optimized for digital displays.`;

    // Add format-specific enhancements
    if (assetNeed.type === 'icon' || assetNeed.type === 'logo') {
      prompt += '\n\nFORMAT: Transparent background (PNG/RGBA). Scalable vector-style appearance. Test at 16px, 32px, 64px, and 256px sizes.';
    }

    // Add usage context for better generation
    if (assetNeed.usage && assetNeed.usage.length > 0) {
      prompt += `\n\nUSAGE CONTEXT: Designed for ${assetNeed.usage.join(', ')}. Ensure visual consistency across all use cases.`;
    }

    // Add modern design principles
    prompt += '\n\nDESIGN PRINCIPLES: Follow modern minimalism, maintain visual hierarchy, ensure accessibility (WCAG AA), create thumb-stopping appeal.';

    logger.debug('Enhanced prompt for Nano Banana', {
      original: assetNeed.suggestedPrompt,
      enhanced: prompt.substring(0, 200) + '...',
      type: assetNeed.type
    });

    return prompt;
  }

  private async performQualityCheck(filePath: string, assetNeed: AssetNeed): Promise<QualityCheckResult> {
    const issues: string[] = [];
    let score = 1.0; // Start with perfect score

    try {
      // Load image with sharp for analysis
      const image = sharp(filePath);
      const metadata = await image.metadata();
      const stats = await image.stats();

      // 1. Dimension validation (critical)
      if (metadata.width !== assetNeed.dimensions.width || metadata.height !== assetNeed.dimensions.height) {
        issues.push(`Dimension mismatch: expected ${assetNeed.dimensions.width}x${assetNeed.dimensions.height}, got ${metadata.width}x${metadata.height}`);
        score -= 0.3;
      }

      // 2. File size validation (too small = low quality, too large = bloated)
      const fileStats = await fs.stat(filePath);
      const fileSizeKB = fileStats.size / 1024;

      // Expected size ranges based on dimensions
      const pixelCount = assetNeed.dimensions.width * assetNeed.dimensions.height;
      const minSizeKB = pixelCount / 1000; // Minimum 1KB per 1000 pixels
      const maxSizeKB = pixelCount / 50; // Maximum 1KB per 50 pixels

      if (fileSizeKB < minSizeKB) {
        issues.push(`File size too small (${fileSizeKB.toFixed(2)}KB), may indicate low quality or excessive compression`);
        score -= 0.2;
      } else if (fileSizeKB > maxSizeKB) {
        issues.push(`File size too large (${fileSizeKB.toFixed(2)}KB), may need optimization`);
        score -= 0.1; // Less severe
      }

      // 3. Color channel analysis
      const channels = stats.channels;

      // Check for very low standard deviation (indicates flat/boring image)
      const avgStdDev = channels.reduce((sum, ch) => sum + ch.stdev, 0) / channels.length;
      if (avgStdDev < 10) {
        issues.push(`Low color variation detected (stdev: ${avgStdDev.toFixed(2)}), image may be too flat or monotone`);
        score -= 0.15;
      }

      // Check for extreme pixel values (blown out whites or crushed blacks)
      const hasBlownHighlights = channels.some(ch => ch.max === 255 && ch.mean > 240);
      const hasCrushedBlacks = channels.some(ch => ch.min === 0 && ch.mean < 15);

      if (hasBlownHighlights) {
        issues.push('Blown out highlights detected, may indicate overexposure');
        score -= 0.1;
      }
      if (hasCrushedBlacks) {
        issues.push('Crushed blacks detected, may indicate underexposure');
        score -= 0.1;
      }

      // 4. Format-specific checks
      if (metadata.format !== 'png' && metadata.format !== 'jpeg' && metadata.format !== 'webp') {
        issues.push(`Unexpected format: ${metadata.format}`);
        score -= 0.15;
      }

      // 5. Transparency check for icons and logos
      if ((assetNeed.type === 'icon' || assetNeed.type === 'logo') && metadata.channels === 3) {
        issues.push('Expected transparency (alpha channel) for icon/logo but found opaque image');
        score -= 0.1;
      }

      // 6. Aspect ratio validation
      const actualAspectRatio = metadata.width! / metadata.height!;
      const expectedAspectRatio = assetNeed.dimensions.width / assetNeed.dimensions.height;
      const aspectRatioDiff = Math.abs(actualAspectRatio - expectedAspectRatio);

      if (aspectRatioDiff > 0.01) {
        issues.push(`Aspect ratio deviation: expected ${expectedAspectRatio.toFixed(2)}, got ${actualAspectRatio.toFixed(2)}`);
        score -= 0.1;
      }

      // Ensure score stays within bounds
      score = Math.max(0, Math.min(1, score));

      const passed = score >= this.defaultConfig.minQualityThreshold;

      logger.debug('Quality check details', {
        filePath,
        score,
        passed,
        issues,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          channels: metadata.channels,
          fileSizeKB: fileSizeKB.toFixed(2)
        },
        stats: {
          avgStdDev: avgStdDev.toFixed(2)
        }
      });

      return { passed, score, issues };

    } catch (error) {
      logger.error('Quality check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath
      });

      // If quality check fails, assume it passed with warning
      return {
        passed: true,
        score: 0.5,
        issues: [`Quality check error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private async generateWithNanoBanana(
    prompt: string,
    assetNeed: AssetNeed,
    options: GenerationOptions
  ): Promise<{ imageData: Buffer; mimeType: string }> {
    const maxRetries = options.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Nano Banana generation attempt ${attempt}/${maxRetries}`, {
          prompt: prompt.substring(0, 100) + '...',
          type: assetNeed.type
        });

        // Prepare request for Nano Banana
        const requestContent = this.prepareNanoBananaRequest(prompt, assetNeed, options);

        // Make the API call to Nano Banana
        const model = this.client.getGenerativeModel(
          { model: this.defaultConfig.model },
          { apiVersion: 'v1beta' }
        );
        const result = await model.generateContent(requestContent);
        const response = await result.response;

        // Extract image from response
        const imageData = this.extractImageFromResponse(response);

        if (imageData) {
          return imageData;
        } else {
          throw new Error('No image data returned from Nano Banana');
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Check if it's a rate limit or quota error
        const isRateLimit = await this.handleRateLimitError(error, attempt);

        logger.warn(`Nano Banana generation attempt ${attempt} failed`, {
          error: lastError.message,
          isRateLimit,
          retriesRemaining: maxRetries - attempt
        });

        if (attempt < maxRetries) {
          // Use longer exponential backoff for rate limits
          const baseDelay = isRateLimit ? 5000 : 2000;
          const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 60000); // Cap at 60 seconds
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('All Nano Banana generation attempts failed');
  }

  private prepareNanoBananaRequest(
    prompt: string,
    assetNeed: AssetNeed,
    options: GenerationOptions
  ): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
    const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // Add reference images if provided for blending
    if (options.blendImages && options.blendImages.length > 0) {
      for (const imagePath of options.blendImages) {
        try {
          const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });
          // Determine MIME type based on file extension
          const ext = path.extname(imagePath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif'
          };
          const mimeType = mimeTypes[ext] || 'image/png';

          contents.push({
            inlineData: {
              mimeType,
              data: imageData
            }
          });

          logger.debug('Added reference image for blending', {
            path: imagePath,
            mimeType
          });
        } catch (error) {
          logger.warn('Failed to load blend image', {
            path: imagePath,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // Build enhanced text prompt
    let enhancedPrompt = prompt;

    // Add Nano Banana specific instructions
    if (options.enableCharacterConsistency) {
      enhancedPrompt += '\n\nCHARACTER CONSISTENCY: Maintain consistent character design, style, colors, and proportions across the design.';
    }

    // Add quality instructions based on config
    if (this.defaultConfig.quality === 'high') {
      enhancedPrompt += '\n\nQUALITY MODE: Generate in HIGH QUALITY with maximum detail, clarity, and professional finish. Optimize every pixel for production use.';
    }

    // Add aspect ratio enforcement
    const aspectRatio = assetNeed.dimensions.aspectRatio;
    enhancedPrompt += `\n\nASPECT RATIO ENFORCEMENT: MUST maintain exact ${aspectRatio} aspect ratio (${assetNeed.dimensions.width}:${assetNeed.dimensions.height}). Do not crop or distort.`;

    // Add blending instructions if images were provided
    if (options.blendImages && options.blendImages.length > 0) {
      enhancedPrompt += `\n\nIMAGE BLENDING: Harmoniously blend visual elements from the ${options.blendImages.length} reference image(s) provided above while maintaining the design requirements.`;
    }

    // Add text prompt to contents
    contents.push({ text: enhancedPrompt });

    return contents;
  }

  private extractImageFromResponse(response: any): { imageData: Buffer; mimeType: string } | null {
    try {
      // Extract from correct Gemini API response structure
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        logger.warn('No parts found in Gemini response', {
          hasResponse: !!response,
          hasCandidates: !!response.candidates,
          candidatesLength: response.candidates?.length
        });
        return null;
      }

      // Iterate through parts to find image data
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          logger.debug('Found image data in response part', {
            mimeType: part.inlineData.mimeType,
            dataLength: part.inlineData.data.length
          });

          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          return {
            imageData: imageBuffer,
            mimeType: part.inlineData.mimeType || 'image/png'
          };
        }
      }

      logger.warn('No image data found in any response part', {
        partsCount: parts.length
      });
      return null;
    } catch (error) {
      logger.error('Failed to extract image from Nano Banana response', error);
      return null;
    }
  }

  private async processAndSaveImage(
    imageData: { imageData: Buffer; mimeType: string },
    assetNeed: AssetNeed,
    options: GenerationOptions
  ): Promise<string> {
    // Ensure output directory exists
    await fs.ensureDir(options.outputDir);

    // Generate filename
    const filename = this.generateFilename(assetNeed, options.format);
    const outputPath = path.join(options.outputDir, filename);

    try {
      // Process image with Sharp
      let sharpInstance = sharp(imageData.imageData);

      // Get current image metadata
      const metadata = await sharpInstance.metadata();
      logger.debug('Original image metadata', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      });

      // Resize if needed to exact dimensions
      if (assetNeed.dimensions.width > 0 && assetNeed.dimensions.height > 0) {
        // Check if resize is needed
        if (metadata.width !== assetNeed.dimensions.width ||
            metadata.height !== assetNeed.dimensions.height) {

          sharpInstance = sharpInstance.resize(
            assetNeed.dimensions.width,
            assetNeed.dimensions.height,
            {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
            }
          );
        }
      }

      // Convert format if needed
      switch (options.format) {
        case 'png':
          sharpInstance = sharpInstance.png({
            quality: options.quality || 90,
            compressionLevel: 6
          });
          break;
        case 'jpg':
          sharpInstance = sharpInstance.jpeg({
            quality: options.quality || 85,
            progressive: true
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: options.quality || 85,
            effort: 6
          });
          break;
      }

      // Save the processed image
      await sharpInstance.toFile(outputPath);

      // Verify the saved file
      const stats = await fs.stat(outputPath);
      logger.debug('Image processed and saved successfully', {
        path: outputPath,
        format: options.format,
        dimensions: assetNeed.dimensions,
        fileSize: stats.size
      });

      return outputPath;

    } catch (error) {
      logger.error('Image processing failed, saving raw image', error);
      // Fallback: save raw image data
      await fs.writeFile(outputPath, imageData.imageData);
      return outputPath;
    }
  }

  private generateFilename(assetNeed: AssetNeed, format: string): string {
    // Generate a clean, descriptive filename
    const cleanDescription = assetNeed.description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 40);

    const timestamp = Date.now();
    const dimensions = `${assetNeed.dimensions.width}x${assetNeed.dimensions.height}`;

    return `nanobana-${assetNeed.type}-${cleanDescription}-${dimensions}-${timestamp}.${format}`;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleRateLimitError(error: any, attempt: number): Promise<boolean> {
    // Check for rate limit indicators
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorStatus = error?.status || error?.response?.status || 0;

    // Common rate limit indicators
    const isRateLimit =
      errorStatus === 429 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota exceeded') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('resource exhausted');

    if (isRateLimit) {
      const delay = Math.min(5000 * Math.pow(2, attempt), 60000);
      logger.warn('Rate limit detected, implementing exponential backoff', {
        attempt,
        delayMs: delay,
        errorStatus,
        errorMessage: error.message
      });
    }

    return isRateLimit;
  }

  // Character consistency feature for assets that need it
  async generateWithCharacterConsistency(
    assets: AssetNeed[],
    referenceImage?: string,
    options?: GenerationOptions
  ): Promise<GeneratedAsset[]> {
    logger.info('Generating assets with character consistency using Nano Banana', {
      hasReferenceImage: !!referenceImage,
      assetCount: assets.length
    });

    const consistentOptions = {
      ...options,
      enableCharacterConsistency: true,
      // Pass reference image for API to use
      blendImages: referenceImage ? [referenceImage] : options?.blendImages || []
    };

    // Add reference image instruction if provided
    if (referenceImage) {
      logger.info('Using reference image for character consistency', { path: referenceImage });
      for (const asset of assets) {
        asset.suggestedPrompt = `Using the character/style from the reference image, ${asset.suggestedPrompt}. Maintain visual consistency and character identity throughout.`;
      }
    }

    const defaultOptions: GenerationOptions = {
      outputDir: './generated-assets',
      format: 'png',
      ...consistentOptions
    };

    return await this.generateMultipleAssets(assets, defaultOptions, 2); // Slower for consistency
  }

  // Multi-image blending capability
  async generateWithImageBlending(
    assetNeed: AssetNeed,
    blendImages: string[],
    options: GenerationOptions
  ): Promise<GeneratedAsset> {
    logger.info('Generating asset with image blending using Nano Banana', {
      type: assetNeed.type,
      blendCount: blendImages.length
    });

    // Enhanced prompt for blending
    const blendPrompt = `Create a ${assetNeed.type} by blending elements from multiple source images. ${assetNeed.suggestedPrompt}. Harmoniously combine the visual elements while maintaining the core design requirements.`;

    const blendedAsset = {
      ...assetNeed,
      suggestedPrompt: blendPrompt
    };

    const blendOptions = {
      ...options,
      blendImages
    };

    return await this.generateAsset(blendedAsset, blendOptions);
  }

  // Health check method
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Test basic model availability
      logger.info('Performing Nano Banana health check');

      return {
        status: 'healthy',
        details: {
          model: this.defaultConfig.model,
          costPerGeneration: this.defaultConfig.costPerGeneration,
          quality: this.defaultConfig.quality,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Cost calculation helper
  calculateTotalCost(assetCount: number): number {
    return assetCount * this.defaultConfig.costPerGeneration;
  }

  // Get generation statistics
  getGenerationStats(): any {
    return {
      model: this.defaultConfig.model,
      costPerGeneration: this.defaultConfig.costPerGeneration,
      quality: this.defaultConfig.quality,
      features: [
        'Character consistency',
        'Multi-image blending',
        'Natural language editing',
        'High-quality generation',
        'SynthID watermarking',
        'Quality validation',
        'Auto-regeneration'
      ]
    };
  }
}