import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { CodebaseScanner } from './CodebaseScanner';
import { AssetAnalyzer } from './AssetAnalyzer';
import { GeminiOrchestrator } from './GeminiOrchestrator';
import { NanoBananaGenerator } from './NanoBananaGenerator';
import { PlatformAssetGenerator } from './PlatformAssetGenerator';
import { ProjectConfig, CodebaseAnalysis, GenerationPlan, AssetNeed } from '../types';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/ConfigManager';

export class GenAssManager {
  private scanner: CodebaseScanner;
  private analyzer: AssetAnalyzer;
  private orchestrator: GeminiOrchestrator;
  private generator: NanoBananaGenerator;
  private platformAssetGenerator: PlatformAssetGenerator;
  private configManager: ConfigManager;
  private config?: ProjectConfig;
  private moveAction?: 'move' | 'move-flat'; // Temp storage for user's move preference

  constructor() {
    this.scanner = new CodebaseScanner();
    this.analyzer = new AssetAnalyzer();
    this.orchestrator = new GeminiOrchestrator();
    this.generator = new NanoBananaGenerator();
    this.platformAssetGenerator = new PlatformAssetGenerator();
    this.configManager = new ConfigManager();
  }

  async initialize(projectPath: string, configPath?: string): Promise<void> {
    const spinner = ora('Initializing GenAss...').start();

    try {
      // Load or create project configuration
      this.config = await this.configManager.loadConfig(projectPath, configPath);

      // Initialize all services
      await this.orchestrator.initialize();
      await this.generator.initialize();

      spinner.succeed('GenAss initialized successfully');
    } catch (error) {
      spinner.fail('Failed to initialize GenAss');
      throw error;
    }
  }

  async fullWorkflow(): Promise<void> {
    if (!this.config) {
      throw new Error('GenAss not initialized. Run initialize() first.');
    }

    try {
      // Step 1: Scan codebase
      console.log(chalk.blue('\n📁 Step 1: Scanning codebase...'));
      const analysis = await this.scanCodebase();

      // Show if existing logo was found
      if (analysis.existingLogo) {
        console.log(chalk.green(`✓ Found existing logo: ${path.basename(analysis.existingLogo)}`));
        console.log(chalk.gray(`  This will be used as a reference for brand consistency\n`));
      }

      // Step 2: Generate plan using Gemini
      console.log(chalk.blue('\n🧠 Step 2: Analyzing with Gemini AI...'));
      const plan = await this.generatePlan(analysis);

      // Step 3: Present plan to user for approval
      console.log(chalk.blue('\n📋 Step 3: Reviewing generation plan...'));
      const approved = await this.presentPlanForApproval(plan);

      if (!approved) {
        console.log(chalk.yellow('⏸️  Generation cancelled by user'));
        return;
      }

      // Create timestamped folder for this generation session
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' +
                        new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const tempOutputDir = path.join(this.config!.rootPath, 'generated-assets', `session-${timestamp}`);
      await fs.ensureDir(tempOutputDir);

      console.log(chalk.gray(`\n📂 Assets will be generated in: ${path.relative(this.config!.rootPath, tempOutputDir)}`));

      // Step 4: Generate assets (with logo reference if available)
      console.log(chalk.blue('\n🎨 Step 4: Generating assets...'));
      await this.generateAssets(plan, analysis.existingLogo, tempOutputDir);

      // Step 5: Review and approve generated assets
      console.log(chalk.blue('\n👀 Step 5: Reviewing generated assets...'));
      const moveApproved = await this.reviewAndApproveAssets(tempOutputDir);

      if (moveApproved) {
        // Step 6: Move to public/assets folder
        console.log(chalk.blue('\n📦 Step 6: Moving assets to public folder...'));
        await this.moveAssetsToPublic(tempOutputDir);
        console.log(chalk.green('\n✅ Assets moved to public/assets successfully!'));
      } else {
        console.log(chalk.yellow(`\n⏸️  Assets kept in staging folder: ${path.relative(this.config!.rootPath, tempOutputDir)}`));
        console.log(chalk.gray('  Review the assets and run the move command when ready.'));
      }

      await this.showGenerationSummary();

    } catch (error) {
      logger.error('Full workflow failed:', error);
      throw error;
    }
  }

  async analyzeOnly(): Promise<void> {
    if (!this.config) {
      throw new Error('GenAss not initialized. Run initialize() first.');
    }

    const analysis = await this.scanCodebase();
    const plan = await this.generatePlan(analysis);

    await this.displayAnalysisResults(analysis, plan);
  }

  private async scanCodebase(): Promise<CodebaseAnalysis> {
    const spinner = ora('Scanning codebase for assets and patterns...').start();

    try {
      const analysis = await this.scanner.scanProject(this.config!.rootPath, {
        excludePatterns: this.config!.excludePatterns,
        assetDirectories: this.config!.assetDirectories
      });

      spinner.text = 'Generating platform-specific asset requirements...';

      // Generate platform-specific assets based on project type
      const platformAssets = this.platformAssetGenerator.generatePlatformSpecificAssets(
        analysis.projectType,
        analysis.frameworks,
        analysis.existingLogo || undefined
      );

      if (platformAssets.length > 0) {
        logger.info(`Generated ${platformAssets.length} platform-specific asset needs`);

        // Add platform-specific assets to missing assets, avoiding duplicates
        const existingFilePaths = new Set(analysis.missingAssets.map(a => a.filePath));
        const newAssets = platformAssets.filter(asset => !existingFilePaths.has(asset.filePath));

        analysis.missingAssets.push(...newAssets);

        spinner.succeed(
          `Found ${analysis.existingAssets.length} existing assets, ` +
          `${analysis.missingAssets.length} potential needs (${newAssets.length} platform-specific)`
        );
      } else {
        spinner.succeed(`Found ${analysis.existingAssets.length} existing assets, ${analysis.missingAssets.length} potential needs`);
      }

      return analysis;
    } catch (error) {
      spinner.fail('Codebase scan failed');
      throw error;
    }
  }

  private async generatePlan(analysis: CodebaseAnalysis): Promise<GenerationPlan> {
    const spinner = ora('Generating asset plan with Gemini AI...').start();

    try {
      const plan = await this.orchestrator.createGenerationPlan(analysis);
      spinner.succeed(`Generated plan for ${plan.assets.length} assets`);
      return plan;
    } catch (error) {
      spinner.fail('Plan generation failed');
      throw error;
    }
  }

  private async presentPlanForApproval(plan: GenerationPlan): Promise<boolean> {
    console.log(chalk.cyan('\n📊 Asset Generation Plan:'));
    console.log(`Total assets to generate: ${chalk.bold(plan.assets.length)}`);
    console.log(`Estimated cost: ${chalk.bold('$' + plan.estimatedCost.toFixed(2))}`);
    console.log(`Estimated time: ${chalk.bold(plan.estimatedTime)} minutes\n`);

    // Show breakdown by priority
    Object.entries(plan.priorities).forEach(([priority, assets]) => {
      if (assets.length > 0) {
        console.log(chalk.magenta(`${priority.toUpperCase()} Priority (${assets.length} assets):`));
        assets.slice(0, 3).forEach(asset => {
          console.log(`  • ${asset.type}: ${asset.description}`);
        });
        if (assets.length > 3) {
          console.log(`  ... and ${assets.length - 3} more`);
        }
        console.log('');
      }
    });

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'How would you like to proceed?',
        choices: [
          { name: 'Generate all assets', value: 'all' },
          { name: 'Generate high priority only', value: 'high' },
          { name: 'Generate medium and high priority', value: 'medium' },
          { name: 'Customize selection', value: 'custom' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }
    ]);

    if (answers.action === 'cancel') {
      return false;
    }

    if (answers.action === 'custom') {
      const selected = await this.customAssetSelection(plan.assets);
      plan.assets = selected;
    } else if (answers.action === 'high') {
      plan.assets = plan.priorities.high;
    } else if (answers.action === 'medium') {
      plan.assets = [...plan.priorities.high, ...plan.priorities.medium];
    }

    return true;
  }

  private async customAssetSelection(assets: AssetNeed[]): Promise<AssetNeed[]> {
    const choices = assets.map(asset => ({
      name: `${asset.type}: ${asset.description} (${asset.priority} priority)`,
      value: asset,
      checked: asset.priority === 'high'
    }));

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedAssets',
        message: 'Select assets to generate:',
        choices,
        pageSize: 10
      }
    ]);

    return answers.selectedAssets;
  }

  private async generateAssets(plan: GenerationPlan, existingLogo?: string | null, outputDir?: string): Promise<void> {
    const targetDir = outputDir || path.join(this.config!.rootPath, 'generated-assets');
    const progressBar = ora(`Generating ${plan.assets.length} assets...`).start();

    let completed = 0;
    const total = plan.assets.length;

    // Check which assets would benefit from logo reference for brand consistency
    const logoRelatedTypes = ['logo', 'icon', 'banner', 'social-media'];
    const assetsNeedingConsistency = plan.assets.filter(asset =>
      logoRelatedTypes.includes(asset.type)
    );

    // If we have an existing logo and assets that need brand consistency
    if (existingLogo && assetsNeedingConsistency.length > 0) {
      logger.info('Using existing logo as reference for brand consistency', {
        logoPath: existingLogo,
        affectedAssets: assetsNeedingConsistency.length
      });

      console.log(chalk.cyan(`\nUsing existing logo (${path.basename(existingLogo)}) as reference for brand consistency`));

      // Generate assets with character consistency
      try {
        const results = await this.generator.generateWithCharacterConsistency(
          assetsNeedingConsistency,
          existingLogo,
          {
            outputDir: targetDir,
            format: this.config!.preferredImageFormat
          }
        );

        completed += results.filter(r => r.success).length;
        progressBar.text = `Generated ${completed}/${total} assets with brand consistency`;

      } catch (error) {
        logger.error('Failed to generate assets with character consistency', error);
        // Fall back to generating individually
        for (const asset of assetsNeedingConsistency) {
          try {
            await this.generator.generateAsset(asset, {
              outputDir: targetDir,
              format: this.config!.preferredImageFormat,
              blendImages: [existingLogo]
            });
            completed++;
          } catch (err) {
            logger.error(`Failed to generate asset: ${asset.description}`, err);
          }
        }
      }

      // Generate remaining assets without logo reference
      const remainingAssets = plan.assets.filter(asset =>
        !logoRelatedTypes.includes(asset.type)
      );

      for (const asset of remainingAssets) {
        try {
          progressBar.text = `Generating ${asset.type}: ${asset.description} (${completed + 1}/${total})`;

          await this.generator.generateAsset(asset, {
            outputDir: targetDir,
            format: this.config!.preferredImageFormat
          });

          completed++;
          progressBar.text = `Generated ${completed}/${total} assets`;

        } catch (error) {
          logger.error(`Failed to generate asset: ${asset.description}`, error);
        }
      }
    } else {
      // No existing logo or no assets need consistency - generate normally
      if (!existingLogo) {
        logger.info('No existing logo found - generating assets without brand reference');
      }

      for (const asset of plan.assets) {
        try {
          progressBar.text = `Generating ${asset.type}: ${asset.description} (${completed + 1}/${total})`;

          await this.generator.generateAsset(asset, {
            outputDir: targetDir,
            format: this.config!.preferredImageFormat
          });

          completed++;
          progressBar.text = `Generated ${completed}/${total} assets`;

        } catch (error) {
          logger.error(`Failed to generate asset: ${asset.description}`, error);
          // Continue with other assets
        }
      }
    }

    progressBar.succeed(`Generated ${completed}/${total} assets successfully in staging folder`);
  }

  private async reviewAndApproveAssets(stagingDir: string): Promise<boolean> {
    // List all generated assets
    const files = await fs.readdir(stagingDir);
    const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f));

    console.log(chalk.cyan(`\n📋 Review Generated Assets (${imageFiles.length} files):`));
    console.log(chalk.gray(`Location: ${path.relative(this.config!.rootPath, stagingDir)}\n`));

    // Group and display by type
    const byType: Record<string, string[]> = {};
    imageFiles.forEach(file => {
      const typeMatch = file.match(/(?:logo|icon|banner|illustration|background|social-media|ui-element)/i);
      const type = typeMatch ? typeMatch[0].toLowerCase() : 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(file);
    });

    Object.entries(byType).forEach(([type, files]) => {
      console.log(chalk.magenta(`  ${type.toUpperCase()} (${files.length}):`));
      files.forEach(f => {
        const stats = fs.statSync(path.join(stagingDir, f));
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(chalk.gray(`    • ${f} (${sizeKB} KB)`));
      });
    });

    console.log('');

    // Ask for approval
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Would you like to move these assets to public/assets?',
        choices: [
          { name: 'Yes, move to public/assets and organize by type', value: 'move' },
          { name: 'Yes, move to public/assets (flat structure)', value: 'move-flat' },
          { name: 'No, keep in staging folder for manual review', value: 'keep' },
          { name: 'Delete staging folder and cancel', value: 'delete' }
        ]
      }
    ]);

    if (answers.action === 'delete') {
      await fs.remove(stagingDir);
      console.log(chalk.yellow('🗑️  Staging folder deleted'));
      return false;
    }

    if (answers.action === 'keep') {
      return false;
    }

    // Store the action choice for moveAssetsToPublic to use
    this.moveAction = answers.action;
    return true;
  }

  private async moveAssetsToPublic(stagingDir: string): Promise<void> {
    const publicAssetsDir = path.join(this.config!.rootPath, 'public', 'assets');
    await fs.ensureDir(publicAssetsDir);

    const files = await fs.readdir(stagingDir);
    const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f));

    const moveAction = this.moveAction || 'move';
    const spinner = ora(`Moving ${imageFiles.length} assets to public/assets...`).start();

    let moved = 0;

    for (const file of imageFiles) {
      const sourcePath = path.join(stagingDir, file);

      let targetPath: string;

      if (moveAction === 'move') {
        // Organize by type (extract type from filename)
        const typeMatch = file.match(/(?:logo|icon|banner|illustration|background|social-media|ui-element)/i);
        const type = typeMatch ? typeMatch[0].toLowerCase() + 's' : 'misc';
        const typeDir = path.join(publicAssetsDir, type);
        await fs.ensureDir(typeDir);
        targetPath = path.join(typeDir, file);
      } else {
        // Flat structure
        targetPath = path.join(publicAssetsDir, file);
      }

      // Move the file
      await fs.move(sourcePath, targetPath, { overwrite: false });
      moved++;

      logger.info('Asset moved to public', {
        from: path.relative(this.config!.rootPath, sourcePath),
        to: path.relative(this.config!.rootPath, targetPath)
      });
    }

    spinner.succeed(`Moved ${moved} assets to public/assets`);

    // Clean up staging folder
    try {
      await fs.remove(stagingDir);
      logger.debug('Staging folder cleaned up', { path: stagingDir });
    } catch (error) {
      logger.warn('Failed to clean up staging folder', error);
    }
  }

  private async displayAnalysisResults(analysis: CodebaseAnalysis, plan: GenerationPlan): Promise<void> {
    console.log(chalk.cyan('\n📊 Codebase Analysis Results:\n'));

    console.log(`Project Type: ${chalk.bold(analysis.projectType)}`);
    console.log(`Frameworks: ${chalk.bold(analysis.frameworks.join(', '))}`);
    console.log(`Existing Assets: ${chalk.bold(analysis.existingAssets.length)}`);
    console.log(`Asset Needs Identified: ${chalk.bold(analysis.missingAssets.length)}`);

    if (analysis.existingLogo) {
      console.log(`Existing Logo: ${chalk.green(path.basename(analysis.existingLogo))}`);
      console.log(chalk.gray(`  Path: ${analysis.existingLogo}`));
      console.log(chalk.gray(`  Will be used for brand consistency in generated assets`));
    } else {
      console.log(`Existing Logo: ${chalk.yellow('None detected')}`);
    }
    console.log('');

    if (analysis.recommendations.length > 0) {
      console.log(chalk.magenta('💡 Recommendations:'));
      analysis.recommendations.forEach(rec => console.log(`  • ${rec}`));
      console.log('');
    }

    console.log(chalk.cyan('🎯 Suggested Assets:'));
    plan.priorities.high.forEach(asset => {
      console.log(chalk.red(`  HIGH: ${asset.type} - ${asset.description}`));
    });
    plan.priorities.medium.forEach(asset => {
      console.log(chalk.yellow(`  MED:  ${asset.type} - ${asset.description}`));
    });
    plan.priorities.low.forEach(asset => {
      console.log(chalk.gray(`  LOW:  ${asset.type} - ${asset.description}`));
    });
  }

  async generateFromPlan(options: any): Promise<void> {
    console.log(chalk.blue('🎨 Generating assets from plan...'));

    let plan: GenerationPlan;

    // Load plan from file if specified
    if (options.plan) {
      const planPath = path.resolve(options.plan);
      if (!await fs.pathExists(planPath)) {
        throw new Error(`Plan file not found: ${planPath}`);
      }
      console.log(chalk.gray(`Loading plan from: ${planPath}`));
      plan = await fs.readJson(planPath);
    } else {
      // Load from default location
      const defaultPlanPath = path.join(process.cwd(), 'generation-plan.json');
      if (!await fs.pathExists(defaultPlanPath)) {
        throw new Error('No generation plan found. Run "genass init" first or specify a plan file with --plan.');
      }
      console.log(chalk.gray(`Loading plan from: ${defaultPlanPath}`));
      plan = await fs.readJson(defaultPlanPath);
    }

    // Filter by type if specified
    if (options.type) {
      const types = options.type.split(',').map((t: string) => t.trim());
      const originalCount = plan.assets.length;
      plan.assets = plan.assets.filter(asset => types.includes(asset.type));
      console.log(chalk.gray(`Filtered to ${plan.assets.length} assets of type(s): ${types.join(', ')} (from ${originalCount} total)`));
    }

    // Filter by priority if specified
    if (options.priority) {
      const priority = options.priority.toLowerCase();
      const originalCount = plan.assets.length;

      if (priority === 'high') {
        plan.assets = plan.priorities.high;
      } else if (priority === 'medium') {
        plan.assets = [...plan.priorities.high, ...plan.priorities.medium];
      } else if (priority === 'low') {
        plan.assets = [...plan.priorities.high, ...plan.priorities.medium, ...plan.priorities.low];
      }

      console.log(chalk.gray(`Filtered to ${plan.assets.length} assets with ${priority} priority or higher (from ${originalCount} total)`));
    }

    if (plan.assets.length === 0) {
      console.log(chalk.yellow('No assets match the specified criteria'));
      return;
    }

    // Show what will be generated
    console.log(chalk.cyan(`\nGenerating ${plan.assets.length} assets:`));
    plan.assets.forEach((asset, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${asset.type}: ${asset.description}`));
    });

    const estimatedCost = plan.assets.length * 0.039; // Nano Banana cost
    console.log(chalk.yellow(`\nEstimated cost: $${estimatedCost.toFixed(2)}\n`));

    // Confirm generation
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with generation?',
        default: true
      }
    ]);

    if (!answers.proceed) {
      console.log(chalk.yellow('⏸️  Generation cancelled'));
      return;
    }

    // Initialize if not already done
    if (!this.config) {
      await this.initialize(process.cwd());
    }

    // Detect existing logo for brand consistency
    console.log(chalk.blue('\n🔍 Checking for existing logo...'));
    const existingLogo = await this.scanner.detectExistingLogo(process.cwd());

    if (existingLogo) {
      console.log(chalk.green(`✓ Found existing logo: ${path.basename(existingLogo)}`));
      console.log(chalk.gray(`  This will be used as a reference for brand consistency\n`));
    } else {
      console.log(chalk.gray('No existing logo detected\n'));
    }

    // Generate the assets with logo reference if available
    await this.generateAssets(plan, existingLogo);
    console.log(chalk.green('\n✅ Asset generation completed!'));
  }

  async showStatus(projectPath: string): Promise<void> {
    console.log(chalk.blue('📊 GenAss Project Status\n'));

    // Load project configuration
    try {
      const config = await this.configManager.loadConfig(projectPath);

      console.log(chalk.cyan('Project Information:'));
      console.log(`  Name: ${chalk.bold(config.name)}`);
      console.log(`  Path: ${chalk.gray(projectPath)}`);
      console.log('');

      // Check for existing plans
      const planPath = path.join(projectPath, 'generation-plan.json');
      if (await fs.pathExists(planPath)) {
        const plan: GenerationPlan = await fs.readJson(planPath);
        console.log(chalk.cyan('Generation Plan:'));
        console.log(`  Total Assets: ${chalk.bold(plan.assets.length)}`);
        console.log(`  High Priority: ${chalk.red(plan.priorities.high.length)}`);
        console.log(`  Medium Priority: ${chalk.yellow(plan.priorities.medium.length)}`);
        console.log(`  Low Priority: ${chalk.gray(plan.priorities.low.length)}`);
        console.log(`  Estimated Cost: ${chalk.green('$' + plan.estimatedCost.toFixed(2))}`);
        console.log(`  Estimated Time: ${chalk.bold(plan.estimatedTime)} minutes`);
        console.log('');
      } else {
        console.log(chalk.yellow('No generation plan found.'));
        console.log(chalk.gray('  Run "genass init" to create one.\n'));
      }

      // Check for generated assets
      const generatedDir = path.join(projectPath, 'generated-assets');
      if (await fs.pathExists(generatedDir)) {
        const files = await fs.readdir(generatedDir, { recursive: true });
        const imageFiles = files.filter((file: any) => {
          const filePath = typeof file === 'string' ? file : file.name;
          return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(filePath);
        });

        console.log(chalk.cyan('Generated Assets:'));
        console.log(`  Total Files: ${chalk.bold(imageFiles.length)}`);

        // Group by type/subdirectory
        const byType: Record<string, number> = {};
        imageFiles.forEach((file: any) => {
          const filePath = typeof file === 'string' ? file : file.name;
          const dir = path.dirname(filePath);
          const typeDir = dir === '.' ? 'root' : dir.split(path.sep)[0];
          byType[typeDir] = (byType[typeDir] || 0) + 1;
        });

        if (Object.keys(byType).length > 0) {
          console.log('  By Type:');
          Object.entries(byType).forEach(([type, count]) => {
            console.log(`    ${type}: ${count}`);
          });
        }
        console.log('');
      } else {
        console.log(chalk.yellow('No generated assets found.\n'));
      }

      // Check logs
      const logDir = path.join(projectPath, 'logs');
      if (await fs.pathExists(logDir)) {
        const errorLog = path.join(logDir, 'error.log');
        if (await fs.pathExists(errorLog)) {
          const stats = await fs.stat(errorLog);
          if (stats.size > 0) {
            console.log(chalk.yellow(`⚠️  Error log has ${stats.size} bytes`));
            console.log(chalk.gray(`   Check ${errorLog}\n`));
          }
        }
      }

      // Show configuration
      console.log(chalk.cyan('Configuration:'));
      console.log(`  Image Format: ${config.preferredImageFormat}`);
      console.log(`  Max Asset Size: ${(config.maxAssetSize / 1024 / 1024).toFixed(1)} MB`);
      console.log(`  Asset Directories: ${config.assetDirectories.join(', ')}`);
      console.log(`  Exclude Patterns: ${config.excludePatterns.length} patterns`);

    } catch (error) {
      console.log(chalk.red('Failed to load project status'));
      logger.error('showStatus error:', error);
      throw error;
    }
  }

  async setupWizard(): Promise<void> {
    console.log(chalk.blue('🧙‍♂️ GenAss Setup Wizard\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'geminiKey',
        message: 'Enter your Gemini API key:',
        validate: (input) => input.length > 0 || 'API key is required'
      },
      {
        type: 'list',
        name: 'imageProvider',
        message: 'Choose image generation provider:',
        choices: [
          { name: 'Google Vertex AI (Imagen 3)', value: 'vertex' },
          { name: 'Google Gemini API', value: 'gemini' }
        ]
      }
    ]);

    // Save configuration
    await this.configManager.saveGlobalConfig(answers);
    console.log(chalk.green('\n✅ Configuration saved successfully!'));
  }

  async showConfig(): Promise<void> {
    const config = await this.configManager.getGlobalConfig();
    console.log(chalk.cyan('\n⚙️  GenAss Configuration:'));
    console.log(JSON.stringify(config, null, 2));
  }

  private async showGenerationSummary(): Promise<void> {
    console.log(chalk.cyan('\n📈 Generation Summary:'));

    try {
      // Generate and display the integration prompt
      await this.generateIntegrationPrompt();
    } catch (error) {
      logger.warn('Could not generate integration prompt', error);
      console.log(chalk.gray('\nRun `genass integrate` to generate integration guide later.'));
    }
  }

  /**
   * Generates a comprehensive integration prompt for using generated assets with AI tools like Claude Code
   * Analyzes all generated assets and provides detailed integration instructions
   */
  async generateIntegrationPrompt(): Promise<string> {
    if (!this.config) {
      throw new Error('GenAss not initialized. Run initialize() first.');
    }

    const spinner = ora('Generating integration guide...').start();

    try {
      // Gather all information
      const generatedDir = path.join(this.config.rootPath, 'generated-assets');

      // Check if generated assets exist
      if (!await fs.pathExists(generatedDir)) {
        spinner.warn('No generated assets found');
        return 'No assets have been generated yet. Run the generation workflow first.';
      }

      // Scan generated assets
      const generatedAssets = await this.scanGeneratedAssets(generatedDir);

      if (generatedAssets.length === 0) {
        spinner.warn('No assets found in generated-assets directory');
        return 'No assets found in generated-assets directory.';
      }

      // Load the original analysis and plan if available
      const analysis = await this.loadCodebaseAnalysis();
      const plan = await this.loadGenerationPlan();

      // Build the integration prompt
      const prompt = this.buildIntegrationPrompt(generatedAssets, analysis, plan);

      // Save to file
      const guidePath = path.join(generatedDir, 'INTEGRATION_GUIDE.md');
      await fs.writeFile(guidePath, prompt, 'utf8');

      spinner.succeed('Integration guide generated');

      // Print to console
      console.log(chalk.cyan('\n' + '='.repeat(80)));
      console.log(chalk.bold.cyan('📋 INTEGRATION GUIDE'));
      console.log(chalk.cyan('='.repeat(80) + '\n'));
      console.log(prompt);
      console.log(chalk.cyan('\n' + '='.repeat(80)));
      console.log(chalk.gray(`\nGuide saved to: ${guidePath}\n`));

      return prompt;

    } catch (error) {
      spinner.fail('Failed to generate integration guide');
      logger.error('Integration prompt generation failed', error);
      throw error;
    }
  }

  /**
   * Scans the generated-assets directory and categorizes all assets
   */
  private async scanGeneratedAssets(generatedDir: string): Promise<Array<{
    filename: string;
    path: string;
    type: string;
    dimensions: string;
    size: number;
  }>> {
    const assets: Array<{
      filename: string;
      path: string;
      type: string;
      dimensions: string;
      size: number;
    }> = [];

    const files = await fs.readdir(generatedDir, { recursive: true, withFileTypes: true });

    for (const file of files) {
      if (file.isFile()) {
        const filename = typeof file === 'string' ? file : file.name;
        const filePath = path.join(generatedDir, filename);

        // Check if it's an image file
        if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(filename)) {
          const stats = await fs.stat(filePath);

          // Extract type and dimensions from filename (works with both old and new naming schemes)
          const typeMatch = filename.match(/(?:nanobana-)?(?:icon|logo|illustration|background|banner|social-media|ui-element)/i);
          const dimensionsMatch = filename.match(/(\d+x\d+)/);

          let type = 'unknown';
          if (typeMatch) {
            const matchText = typeMatch[0].replace(/^nanobana-/i, '');
            type = matchText;
          }

          assets.push({
            filename,
            path: filePath,
            type,
            dimensions: dimensionsMatch ? dimensionsMatch[1] : 'unknown',
            size: stats.size
          });
        }
      }
    }

    return assets;
  }

  /**
   * Loads the codebase analysis if available
   */
  private async loadCodebaseAnalysis(): Promise<CodebaseAnalysis | null> {
    try {
      const analysisPath = path.join(this.config!.rootPath, 'codebase-analysis.json');
      if (await fs.pathExists(analysisPath)) {
        return await fs.readJson(analysisPath);
      }
    } catch (error) {
      logger.debug('Could not load codebase analysis', error);
    }
    return null;
  }

  /**
   * Loads the generation plan if available
   */
  private async loadGenerationPlan(): Promise<GenerationPlan | null> {
    try {
      const planPath = path.join(this.config!.rootPath, 'generation-plan.json');
      if (await fs.pathExists(planPath)) {
        return await fs.readJson(planPath);
      }
    } catch (error) {
      logger.debug('Could not load generation plan', error);
    }
    return null;
  }

  /**
   * Builds the comprehensive integration prompt
   */
  private buildIntegrationPrompt(
    generatedAssets: Array<{ filename: string; path: string; type: string; dimensions: string; size: number }>,
    analysis: CodebaseAnalysis | null,
    plan: GenerationPlan | null
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('# AI Asset Integration Guide');
    lines.push('');
    lines.push('I\'ve just generated new assets for this project using GenAss. Here\'s what was created and where they should be integrated:');
    lines.push('');

    // Project context
    if (analysis) {
      lines.push('## Project Context');
      lines.push('');
      lines.push(`- **Project Type**: ${analysis.projectType}`);
      if (analysis.frameworks.length > 0) {
        lines.push(`- **Frameworks**: ${analysis.frameworks.join(', ')}`);
      }
      lines.push(`- **Existing Assets**: ${analysis.existingAssets.length} files`);
      lines.push('');
    }

    // Generated Assets section
    lines.push('## Generated Assets');
    lines.push('');

    // Group assets by type
    const assetsByType = this.groupAssetsByType(generatedAssets);

    for (const [type, assets] of Object.entries(assetsByType)) {
      lines.push(`### ${this.capitalizeFirstLetter(type)} Assets (${assets.length})`);
      lines.push('');

      for (const asset of assets) {
        const relativePath = path.relative(this.config!.rootPath, asset.path);
        const sizeInKB = (asset.size / 1024).toFixed(2);

        lines.push(`#### ${asset.filename}`);
        lines.push('');
        lines.push(`- **Path**: \`${relativePath}\``);
        lines.push(`- **Dimensions**: ${asset.dimensions}`);
        lines.push(`- **Size**: ${sizeInKB} KB`);

        // Add usage suggestions based on type and analysis
        const usageSuggestions = this.generateUsageSuggestions(asset, analysis, plan);
        if (usageSuggestions.length > 0) {
          lines.push('- **Suggested Usage**:');
          usageSuggestions.forEach(suggestion => {
            lines.push(`  - ${suggestion}`);
          });
        }

        // Add integration locations
        const integrationPoints = this.findIntegrationPoints(asset, analysis, plan);
        if (integrationPoints.length > 0) {
          lines.push('- **Integration Points**:');
          integrationPoints.forEach(point => {
            lines.push(`  - ${point}`);
          });
        }

        lines.push('');
      }
    }

    // Integration instructions
    lines.push('## Integration Instructions');
    lines.push('');

    if (analysis?.projectType) {
      const instructions = this.getFrameworkSpecificInstructions(analysis.projectType, analysis.frameworks);
      lines.push(...instructions);
      lines.push('');
    }

    // Next steps
    lines.push('## Next Steps');
    lines.push('');
    lines.push('1. **Review Assets**: Check each generated asset to ensure it aligns with your brand guidelines');
    lines.push('2. **Update References**: Replace placeholder assets or update import statements in your code');
    lines.push('3. **Optimize for Production**: Consider adding lazy loading, responsive image variants, or CDN hosting');
    lines.push('4. **Test Across Devices**: Verify assets render correctly on different screen sizes and devices');
    lines.push('5. **Update Documentation**: Document the new assets in your project\'s style guide or README');

    if (analysis?.frameworks.includes('React') || analysis?.frameworks.includes('Vue.js')) {
      lines.push('6. **Add Alt Text**: Ensure all images have appropriate alt text for accessibility');
    }

    if (analysis?.frameworks.includes('Tailwind CSS')) {
      lines.push('7. **Configure Tailwind**: Add asset paths to your Tailwind config if needed');
    }

    lines.push('');

    // Tips section
    lines.push('## Tips for Working with AI Tools');
    lines.push('');
    lines.push('When integrating these assets using Claude Code or similar AI tools, you can:');
    lines.push('');
    lines.push('- **Request specific integrations**: "Add the logo to the Header component with proper sizing"');
    lines.push('- **Ask for optimization**: "Optimize these images for web performance with lazy loading"');
    lines.push('- **Get framework-specific help**: "Create a React component that displays these icons with hover effects"');
    lines.push('- **Request accessibility improvements**: "Add proper alt text and ARIA labels to all images"');
    lines.push('- **Ask for responsive design**: "Make these images responsive using modern CSS techniques"');
    lines.push('');

    // Asset summary table
    lines.push('## Asset Summary');
    lines.push('');
    lines.push('| Type | Count | Total Size |');
    lines.push('|------|-------|------------|');

    for (const [type, assets] of Object.entries(assetsByType)) {
      const totalSize = assets.reduce((sum, a) => sum + a.size, 0);
      const totalSizeKB = (totalSize / 1024).toFixed(2);
      lines.push(`| ${this.capitalizeFirstLetter(type)} | ${assets.length} | ${totalSizeKB} KB |`);
    }

    const totalAssets = generatedAssets.length;
    const totalSize = generatedAssets.reduce((sum, a) => sum + a.size, 0);
    const totalSizeKB = (totalSize / 1024).toFixed(2);
    lines.push(`| **Total** | **${totalAssets}** | **${totalSizeKB} KB** |`);
    lines.push('');

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('**Ready to integrate?** Copy this entire guide and paste it into Claude Code or your preferred AI coding assistant to get started with integration!');
    lines.push('');
    lines.push('*Generated by GenAss - AI-Powered Asset Generation*');

    return lines.join('\n');
  }

  /**
   * Groups assets by their type
   */
  private groupAssetsByType(assets: Array<{ filename: string; path: string; type: string; dimensions: string; size: number }>): Record<string, Array<{ filename: string; path: string; type: string; dimensions: string; size: number }>> {
    const grouped: Record<string, Array<{ filename: string; path: string; type: string; dimensions: string; size: number }>> = {};

    for (const asset of assets) {
      if (!grouped[asset.type]) {
        grouped[asset.type] = [];
      }
      grouped[asset.type].push(asset);
    }

    return grouped;
  }

  /**
   * Generates usage suggestions based on asset type and analysis
   */
  private generateUsageSuggestions(
    asset: { filename: string; type: string; dimensions: string },
    analysis: CodebaseAnalysis | null,
    plan: GenerationPlan | null
  ): string[] {
    const suggestions: string[] = [];

    switch (asset.type.toLowerCase()) {
      case 'icon':
        if (asset.dimensions === '32x32' || asset.dimensions === '16x16') {
          suggestions.push('Use as favicon in `public/favicon.ico` or `index.html`');
        }
        if (asset.dimensions === '192x192' || asset.dimensions === '512x512') {
          suggestions.push('Add to PWA manifest for app icon');
        }
        suggestions.push('Use in navigation menus, buttons, or UI components');
        suggestions.push('Consider creating an icon library/sprite for consistent usage');
        break;

      case 'logo':
        suggestions.push('Place in header/navigation component');
        suggestions.push('Use on landing page and marketing materials');
        suggestions.push('Add to loading screens or splash pages');
        if (analysis?.projectType === 'React' || analysis?.projectType === 'Next.js') {
          suggestions.push('Import in `Header.jsx/tsx` or `Navbar` component');
        }
        break;

      case 'banner':
        suggestions.push('Use as hero section background on landing page');
        suggestions.push('Feature in marketing pages or promotional sections');
        suggestions.push('Consider adding as OpenGraph image for social sharing');
        break;

      case 'background':
        suggestions.push('Apply as CSS background image for sections or containers');
        suggestions.push('Use for card backgrounds or decorative elements');
        suggestions.push('Consider tiling or parallax effects');
        break;

      case 'illustration':
        suggestions.push('Feature in empty states or onboarding flows');
        suggestions.push('Use in blog posts or documentation');
        suggestions.push('Add to About Us or feature explanation sections');
        break;

      case 'social-media':
        suggestions.push('Set as OpenGraph image in meta tags');
        suggestions.push('Use for Twitter card image');
        suggestions.push('Share on social media platforms');
        break;

      case 'ui-element':
        suggestions.push('Integrate into component library');
        suggestions.push('Use in forms, cards, or interactive elements');
        break;
    }

    return suggestions;
  }

  /**
   * Finds specific integration points in the codebase
   */
  private findIntegrationPoints(
    asset: { filename: string; type: string },
    analysis: CodebaseAnalysis | null,
    plan: GenerationPlan | null
  ): string[] {
    const points: string[] = [];

    if (!plan) {
      return points;
    }

    // Find matching asset needs from the plan
    const matchingNeeds = plan.assets.filter(need =>
      need.type === asset.type.toLowerCase()
    );

    for (const need of matchingNeeds) {
      if (need.usage && need.usage.length > 0) {
        need.usage.forEach(usage => {
          points.push(`Replace or add to: \`${usage}\``);
        });
      }

      if (need.filePath) {
        points.push(`Target location: \`${need.filePath}\``);
      }
    }

    // Add common integration points based on type if specific ones not found
    if (points.length === 0) {
      switch (asset.type.toLowerCase()) {
        case 'icon':
          points.push('Check `public/` directory for favicon placement');
          points.push('Review `manifest.json` or `manifest.webmanifest` for PWA icons');
          break;
        case 'logo':
          points.push('Look for logo references in header/navigation components');
          points.push('Check `public/` or `assets/` directory');
          break;
        case 'banner':
          points.push('Find hero sections in landing pages');
          points.push('Check homepage or main layout components');
          break;
      }
    }

    return points;
  }

  /**
   * Gets framework-specific integration instructions
   */
  private getFrameworkSpecificInstructions(projectType: string, frameworks: string[]): string[] {
    const instructions: string[] = [];

    switch (projectType) {
      case 'React':
      case 'Next.js':
        instructions.push('### React/Next.js Integration');
        instructions.push('');
        instructions.push('```jsx');
        instructions.push('// Example: Import and use an asset in a React component');
        instructions.push('import logo from \'../generated-assets/your-logo.png\';');
        instructions.push('');
        instructions.push('function Header() {');
        instructions.push('  return (');
        instructions.push('    <header>');
        instructions.push('      <img src={logo} alt="Company Logo" width={200} height={60} />');
        instructions.push('    </header>');
        instructions.push('  );');
        instructions.push('}');
        instructions.push('```');
        instructions.push('');
        if (projectType === 'Next.js') {
          instructions.push('For Next.js, use the Image component for optimization:');
          instructions.push('');
          instructions.push('```jsx');
          instructions.push('import Image from \'next/image\';');
          instructions.push('import logo from \'../generated-assets/your-logo.png\';');
          instructions.push('');
          instructions.push('<Image src={logo} alt="Company Logo" width={200} height={60} />');
          instructions.push('```');
          instructions.push('');
        }
        break;

      case 'Vue.js':
      case 'Nuxt.js':
        instructions.push('### Vue/Nuxt Integration');
        instructions.push('');
        instructions.push('```vue');
        instructions.push('<template>');
        instructions.push('  <header>');
        instructions.push('    <img :src="logo" alt="Company Logo" width="200" height="60" />');
        instructions.push('  </header>');
        instructions.push('</template>');
        instructions.push('');
        instructions.push('<script>');
        instructions.push('import logo from \'../generated-assets/your-logo.png\';');
        instructions.push('');
        instructions.push('export default {');
        instructions.push('  data() {');
        instructions.push('    return { logo };');
        instructions.push('  }');
        instructions.push('};');
        instructions.push('</script>');
        instructions.push('```');
        instructions.push('');
        break;

      case 'Angular':
        instructions.push('### Angular Integration');
        instructions.push('');
        instructions.push('1. Place assets in `src/assets/` directory');
        instructions.push('2. Reference in templates:');
        instructions.push('');
        instructions.push('```html');
        instructions.push('<img src="assets/your-logo.png" alt="Company Logo" width="200" height="60">');
        instructions.push('```');
        instructions.push('');
        break;

      default:
        instructions.push('### HTML Integration');
        instructions.push('');
        instructions.push('```html');
        instructions.push('<img src="/generated-assets/your-asset.png" alt="Description" />');
        instructions.push('```');
        instructions.push('');
    }

    // Add framework-specific notes
    if (frameworks.includes('Tailwind CSS')) {
      instructions.push('### Tailwind CSS Notes');
      instructions.push('');
      instructions.push('- Use responsive classes: `w-full md:w-1/2 lg:w-1/3`');
      instructions.push('- Apply aspect ratio utilities: `aspect-square`, `aspect-video`');
      instructions.push('- Consider using the Tailwind Image plugin for optimization');
      instructions.push('');
    }

    if (frameworks.includes('Material-UI') || frameworks.includes('Chakra UI')) {
      instructions.push('### UI Library Integration');
      instructions.push('');
      instructions.push('Use the library\'s Image or Avatar components for consistent styling');
      instructions.push('');
    }

    return instructions;
  }

  /**
   * Utility to capitalize first letter
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}