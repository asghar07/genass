import { AssetNeed } from '../types';
import { logger } from '../utils/logger';

/**
 * Platform-specific asset specifications
 */
interface PlatformAssetSpec {
  type: AssetNeed['type'];
  description: string;
  context: string;
  dimensions: { width: number; height: number; aspectRatio: string };
  usage: string[];
  priority: AssetNeed['priority'];
  suggestedPrompt: string;
  filePath: string;
  frameworkSpecific?: string;
}

/**
 * PlatformAssetGenerator
 *
 * Generates platform-specific asset requirements based on project type and frameworks.
 * Supports React Native, Web Dashboard, and Landing Page projects.
 */
export class PlatformAssetGenerator {
  /**
   * Generate platform-specific assets based on project type and frameworks
   *
   * @param projectType - Detected project type (e.g., 'React', 'Next.js', 'React Native')
   * @param frameworks - List of detected frameworks (e.g., ['React Native', 'Expo'])
   * @param existingLogo - Path to existing logo if available (for splash screens, etc.)
   * @returns Array of platform-specific asset needs
   */
  generatePlatformSpecificAssets(
    projectType: string,
    frameworks: string[],
    existingLogo?: string
  ): AssetNeed[] {
    logger.info('Generating platform-specific assets', { projectType, frameworks });

    const assets: AssetNeed[] = [];

    // Detect platform type
    const isReactNative = this.isReactNativePlatform(frameworks);
    const isWebDashboard = this.isWebDashboard(projectType, frameworks);
    const isLandingPage = this.isLandingPage(projectType, frameworks);

    if (isReactNative) {
      logger.info('Detected React Native platform - generating mobile assets');
      assets.push(...this.generateReactNativeAssets(frameworks, existingLogo));
    }

    if (isWebDashboard) {
      logger.info('Detected Web Dashboard platform - generating dashboard assets');
      assets.push(...this.generateWebDashboardAssets(frameworks));
    }

    if (isLandingPage) {
      logger.info('Detected Landing Page platform - generating landing page assets');
      assets.push(...this.generateLandingPageAssets(frameworks));
    }

    // If no specific platform detected, generate generic web assets
    if (!isReactNative && !isWebDashboard && !isLandingPage && this.isWebProject(projectType)) {
      logger.info('Detected generic web project - generating standard web assets');
      assets.push(...this.generateGenericWebAssets(projectType));
    }

    logger.info(`Generated ${assets.length} platform-specific asset needs`);
    return assets;
  }

  /**
   * Detect if project is React Native
   */
  private isReactNativePlatform(frameworks: string[]): boolean {
    return frameworks.some(fw =>
      ['React Native', 'Expo', 'Ionic'].includes(fw)
    );
  }

  /**
   * Detect if project is a Web Dashboard
   * Dashboards typically use admin/data visualization frameworks
   */
  private isWebDashboard(projectType: string, frameworks: string[]): boolean {
    const dashboardIndicators = [
      'Material-UI',
      'Ant Design',
      'Chakra UI'
    ];

    return frameworks.some(fw => dashboardIndicators.includes(fw));
  }

  /**
   * Detect if project is a Landing Page
   * Landing pages typically use marketing-focused frameworks
   */
  private isLandingPage(projectType: string, frameworks: string[]): boolean {
    // Landing pages often use Next.js or simple React with Tailwind
    return (projectType === 'Next.js' || projectType === 'React') &&
           frameworks.includes('Tailwind CSS');
  }

  /**
   * Check if project is a web project
   */
  private isWebProject(projectType: string): boolean {
    return ['React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte'].includes(projectType);
  }

  /**
   * Generate React Native specific assets
   */
  private generateReactNativeAssets(frameworks: string[], existingLogo?: string): AssetNeed[] {
    const assets: AssetNeed[] = [];
    const isExpo = frameworks.includes('Expo');

    // iOS App Icons
    const iosIconSizes = [
      { size: 1024, usage: 'App Store', priority: 'high' as const },
      { size: 180, usage: 'iPhone App (60pt @3x)', priority: 'high' as const },
      { size: 120, usage: 'iPhone App (60pt @2x)', priority: 'high' as const },
      { size: 87, usage: 'iPhone Notification (29pt @3x)', priority: 'medium' as const },
      { size: 80, usage: 'iPhone Spotlight (40pt @2x)', priority: 'medium' as const },
      { size: 76, usage: 'iPad App (76pt @1x)', priority: 'medium' as const },
      { size: 60, usage: 'iPhone App (60pt @1x)', priority: 'low' as const },
      { size: 58, usage: 'iPad Settings (29pt @2x)', priority: 'low' as const },
      { size: 40, usage: 'iPhone Spotlight (40pt @1x)', priority: 'low' as const },
      { size: 29, usage: 'iPhone Settings (29pt @1x)', priority: 'low' as const },
      { size: 20, usage: 'iPhone Notification (20pt @1x)', priority: 'low' as const }
    ];

    iosIconSizes.forEach(({ size, usage, priority }) => {
      assets.push({
        type: 'icon',
        description: `iOS app icon ${size}x${size}`,
        context: `iOS app icon for ${usage}`,
        dimensions: { width: size, height: size, aspectRatio: '1:1' },
        usage: [usage, 'iOS'],
        priority,
        suggestedPrompt: this.generateAppIconPrompt(existingLogo),
        filePath: isExpo
          ? `assets/ios/icon-${size}.png`
          : `ios/AppName/Images.xcassets/AppIcon.appiconset/icon-${size}.png`,
        frameworkSpecific: 'React Native - iOS'
      });
    });

    // Android App Icons
    const androidIconSizes = [
      { size: 192, density: 'xxxhdpi', priority: 'high' as const },
      { size: 144, density: 'xxhdpi', priority: 'high' as const },
      { size: 96, density: 'xhdpi', priority: 'medium' as const },
      { size: 72, density: 'hdpi', priority: 'medium' as const },
      { size: 48, density: 'mdpi', priority: 'low' as const }
    ];

    androidIconSizes.forEach(({ size, density, priority }) => {
      assets.push({
        type: 'icon',
        description: `Android app icon ${size}x${size} (${density})`,
        context: `Android launcher icon for ${density} screens`,
        dimensions: { width: size, height: size, aspectRatio: '1:1' },
        usage: [density, 'Android'],
        priority,
        suggestedPrompt: this.generateAppIconPrompt(existingLogo),
        filePath: isExpo
          ? `assets/android/mipmap-${density}/ic_launcher.png`
          : `android/app/src/main/res/mipmap-${density}/ic_launcher.png`,
        frameworkSpecific: 'React Native - Android'
      });
    });

    // Splash Screens
    const splashScreens = [
      {
        width: 2436,
        height: 1125,
        device: 'iPhone X/XS',
        priority: 'high' as const,
        path: 'splash-iphonex.png'
      },
      {
        width: 2048,
        height: 2732,
        device: 'iPad Pro 12.9"',
        priority: 'medium' as const,
        path: 'splash-ipad-pro.png'
      },
      {
        width: 1242,
        height: 2208,
        device: 'iPhone Plus',
        priority: 'medium' as const,
        path: 'splash-iphone-plus.png'
      }
    ];

    splashScreens.forEach(({ width, height, device, priority, path }) => {
      const aspectRatio = this.calculateAspectRatio(width, height);
      assets.push({
        type: 'background',
        description: `Splash screen for ${device}`,
        context: `App loading splash screen for ${device} (${width}x${height})`,
        dimensions: { width, height, aspectRatio },
        usage: ['splash screen', device],
        priority,
        suggestedPrompt: this.generateSplashScreenPrompt(existingLogo),
        filePath: isExpo
          ? `assets/splash/${path}`
          : `assets/splash-screens/${path}`,
        frameworkSpecific: 'React Native'
      });
    });

    // Adaptive Icon (Android)
    if (!isExpo) {
      assets.push({
        type: 'icon',
        description: 'Android adaptive icon foreground',
        context: 'Foreground layer for Android adaptive icon (API 26+)',
        dimensions: { width: 432, height: 432, aspectRatio: '1:1' },
        usage: ['Android adaptive icon', 'API 26+'],
        priority: 'medium',
        suggestedPrompt: this.generateAppIconPrompt(existingLogo),
        filePath: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
        frameworkSpecific: 'React Native - Android'
      });
    }

    return assets;
  }

  /**
   * Generate Web Dashboard specific assets
   */
  private generateWebDashboardAssets(frameworks: string[]): AssetNeed[] {
    const assets: AssetNeed[] = [];

    // Hero Banner/Header
    assets.push({
      type: 'banner',
      description: 'Dashboard header banner',
      context: 'Hero banner for dashboard header section',
      dimensions: { width: 1440, height: 400, aspectRatio: '18:5' },
      usage: ['header', 'hero section'],
      priority: 'high',
      suggestedPrompt: 'A modern dashboard header banner with clean gradient background, subtle data visualization elements, and professional business aesthetic. Abstract geometric patterns representing analytics and data.',
      filePath: 'public/images/dashboard/header-banner.png',
      frameworkSpecific: frameworks.join(', ')
    });

    // Feature Section Images
    const featureCount = 3;
    for (let i = 1; i <= featureCount; i++) {
      assets.push({
        type: 'illustration',
        description: `Feature section image ${i}`,
        context: `Illustration for dashboard feature section ${i}`,
        dimensions: { width: 600, height: 400, aspectRatio: '3:2' },
        usage: ['features', 'marketing'],
        priority: 'medium',
        suggestedPrompt: `A modern isometric illustration representing business feature ${i}. Clean, professional style with corporate colors. Focus on data visualization, analytics, or business operations themes.`,
        filePath: `public/images/dashboard/feature-${i}.png`,
        frameworkSpecific: frameworks.join(', ')
      });
    }

    // Empty State Illustrations
    const emptyStates = [
      { name: 'no-data', description: 'No data available', icon: 'chart' },
      { name: 'no-results', description: 'No search results', icon: 'search' },
      { name: 'empty-list', description: 'Empty list state', icon: 'list' }
    ];

    emptyStates.forEach(({ name, description, icon }) => {
      assets.push({
        type: 'illustration',
        description: `Empty state: ${description}`,
        context: `Illustration for ${description} empty state`,
        dimensions: { width: 400, height: 400, aspectRatio: '1:1' },
        usage: ['empty state', 'placeholder'],
        priority: 'medium',
        suggestedPrompt: `A friendly, minimalist empty state illustration showing "${description}". Clean line art style with subtle colors. Include a subtle ${icon} icon. Modern, professional, not childish.`,
        filePath: `public/images/dashboard/empty-states/${name}.png`,
        frameworkSpecific: frameworks.join(', ')
      });
    });

    // Background Patterns
    assets.push({
      type: 'background',
      description: 'Dashboard background pattern',
      context: 'Subtle background pattern for dashboard sections',
      dimensions: { width: 1920, height: 1080, aspectRatio: '16:9' },
      usage: ['background', 'texture'],
      priority: 'low',
      suggestedPrompt: 'A very subtle, minimal background pattern for a professional dashboard. Extremely light geometric grid or dots. Nearly white with very low contrast. Modern and clean.',
      filePath: 'public/images/dashboard/background-pattern.png',
      frameworkSpecific: frameworks.join(', ')
    });

    // Chart Placeholder
    assets.push({
      type: 'illustration',
      description: 'Chart placeholder',
      context: 'Placeholder image for chart/graph components',
      dimensions: { width: 800, height: 400, aspectRatio: '2:1' },
      usage: ['placeholder', 'chart'],
      priority: 'low',
      suggestedPrompt: 'A clean, modern illustration of a data chart or graph. Abstract representation with bars, lines, or pie chart elements. Professional color scheme. Suitable as a placeholder.',
      filePath: 'public/images/dashboard/chart-placeholder.png',
      frameworkSpecific: frameworks.join(', ')
    });

    return assets;
  }

  /**
   * Generate Landing Page specific assets
   */
  private generateLandingPageAssets(frameworks: string[]): AssetNeed[] {
    const assets: AssetNeed[] = [];

    // Hero Section Images (multiple sizes for responsive)
    const heroSizes = [
      { width: 1920, height: 1080, device: 'desktop', priority: 'high' as const },
      { width: 1440, height: 900, device: 'laptop', priority: 'high' as const }
    ];

    heroSizes.forEach(({ width, height, device, priority }) => {
      const aspectRatio = this.calculateAspectRatio(width, height);
      assets.push({
        type: 'banner',
        description: `Hero section image (${device})`,
        context: `Hero section background or feature image for ${device} screens`,
        dimensions: { width, height, aspectRatio },
        usage: ['hero', device],
        priority,
        suggestedPrompt: 'A stunning hero section image with modern gradient background, abstract shapes, and professional aesthetic. Vibrant but not overwhelming. Suitable for a SaaS or tech product landing page.',
        filePath: `public/images/landing/hero-${device}.png`,
        frameworkSpecific: frameworks.join(', ')
      });
    });

    // Feature Cards
    const featureCount = 6;
    for (let i = 1; i <= featureCount; i++) {
      assets.push({
        type: 'illustration',
        description: `Feature card image ${i}`,
        context: `Illustration for feature card ${i}`,
        dimensions: { width: 400, height: 300, aspectRatio: '4:3' },
        usage: ['features', 'cards'],
        priority: i <= 3 ? 'medium' : 'low',
        suggestedPrompt: `A modern, clean illustration for a product feature. Isometric or flat design style. Professional and engaging. Represents feature ${i} of a tech product with abstract icons and shapes.`,
        filePath: `public/images/landing/features/feature-${i}.png`,
        frameworkSpecific: frameworks.join(', ')
      });
    }

    // Testimonial Avatars
    const testimonialCount = 3;
    for (let i = 1; i <= testimonialCount; i++) {
      assets.push({
        type: 'icon',
        description: `Testimonial avatar ${i}`,
        context: `Avatar placeholder for testimonial ${i}`,
        dimensions: { width: 80, height: 80, aspectRatio: '1:1' },
        usage: ['testimonials', 'avatar'],
        priority: 'low',
        suggestedPrompt: `A professional, friendly avatar illustration for a testimonial. Abstract or stylized portrait. Modern, diverse, professional. Suitable for business testimonials. Person ${i}.`,
        filePath: `public/images/landing/testimonials/avatar-${i}.png`,
        frameworkSpecific: frameworks.join(', ')
      });
    }

    // CTA (Call to Action) Background
    assets.push({
      type: 'banner',
      description: 'CTA section background',
      context: 'Background image for call-to-action section',
      dimensions: { width: 1600, height: 600, aspectRatio: '8:3' },
      usage: ['CTA', 'conversion'],
      priority: 'high',
      suggestedPrompt: 'A compelling call-to-action background with modern gradient, abstract shapes, and energy. Bold but professional. Creates urgency and excitement without being tacky. Suitable for conversion-focused section.',
      filePath: 'public/images/landing/cta-background.png',
      frameworkSpecific: frameworks.join(', ')
    });

    // Product Screenshots/Mockups
    assets.push({
      type: 'illustration',
      description: 'Product showcase mockup',
      context: 'Product interface mockup for showcasing features',
      dimensions: { width: 1200, height: 800, aspectRatio: '3:2' },
      usage: ['product showcase', 'demo'],
      priority: 'medium',
      suggestedPrompt: 'A clean, modern product interface mockup or screenshot placeholder. Shows a professional dashboard or app interface. High-quality, realistic styling. Suitable for demonstrating product features.',
      filePath: 'public/images/landing/product-mockup.png',
      frameworkSpecific: frameworks.join(', ')
    });

    // Social Proof / Logo Cloud Background
    assets.push({
      type: 'background',
      description: 'Social proof section background',
      context: 'Subtle background for logo cloud / social proof section',
      dimensions: { width: 1920, height: 400, aspectRatio: '24:5' },
      usage: ['social proof', 'trust signals'],
      priority: 'low',
      suggestedPrompt: 'A very subtle, minimal background for a social proof section. Extremely light with barely visible geometric patterns. Professional and trustworthy feel. Nearly white.',
      filePath: 'public/images/landing/social-proof-bg.png',
      frameworkSpecific: frameworks.join(', ')
    });

    return assets;
  }

  /**
   * Generate generic web assets for projects that don't match specific platforms
   */
  private generateGenericWebAssets(projectType: string): AssetNeed[] {
    const assets: AssetNeed[] = [];

    // Basic web essentials
    assets.push(
      {
        type: 'icon',
        description: 'Favicon',
        context: 'Website favicon displayed in browser tabs',
        dimensions: { width: 32, height: 32, aspectRatio: '1:1' },
        usage: ['favicon', 'browser tab'],
        priority: 'high',
        suggestedPrompt: 'A clean, simple favicon icon that represents the brand. Easily recognizable at small sizes. Modern and professional.',
        filePath: 'public/favicon.ico',
        frameworkSpecific: projectType
      },
      {
        type: 'logo',
        description: 'Main logo',
        context: 'Primary logo for website header and branding',
        dimensions: { width: 240, height: 60, aspectRatio: '4:1' },
        usage: ['header', 'branding'],
        priority: 'high',
        suggestedPrompt: 'A professional logo design with modern typography and clean aesthetics. Suitable for web header and branding materials.',
        filePath: 'public/logo.png',
        frameworkSpecific: projectType
      },
      {
        type: 'banner',
        description: 'Open Graph image',
        context: 'Social media preview image (Open Graph)',
        dimensions: { width: 1200, height: 630, aspectRatio: '40:21' },
        usage: ['social media', 'Open Graph', 'sharing'],
        priority: 'medium',
        suggestedPrompt: 'A professional Open Graph image for social media sharing. Clean design with brand colors, suitable for Facebook, LinkedIn, Twitter previews.',
        filePath: 'public/og-image.png',
        frameworkSpecific: projectType
      }
    );

    return assets;
  }

  /**
   * Generate prompt for app icons
   */
  private generateAppIconPrompt(existingLogo?: string): string {
    if (existingLogo) {
      return `A vibrant, professional mobile app icon based on the existing logo. Clean, modern design with bold colors. Easily recognizable at small sizes. Follows platform design guidelines. No text, just icon/symbol.`;
    }
    return `A vibrant, professional mobile app icon. Clean, modern design with bold colors and a memorable symbol. Easily recognizable at small sizes. Follows iOS and Android design guidelines. No text, just icon/symbol.`;
  }

  /**
   * Generate prompt for splash screens
   */
  private generateSplashScreenPrompt(existingLogo?: string): string {
    if (existingLogo) {
      return `A clean mobile app splash screen with centered logo on a modern gradient background. Professional and welcoming. Matches brand identity. Suitable for app loading screen.`;
    }
    return `A clean mobile app splash screen with modern gradient background. Professional and welcoming aesthetic. Centered logo space. Vibrant but not overwhelming colors. Suitable for app loading.`;
  }

  /**
   * Calculate aspect ratio from width and height
   */
  private calculateAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  }
}