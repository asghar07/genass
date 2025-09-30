import { GoogleGenerativeAI, Content, FunctionDeclaration, Tool, SchemaType } from '@google/generative-ai';
import chalk from 'chalk';
import readline from 'readline';
import ora from 'ora';
import inquirer from 'inquirer';
import { GenAssManager } from './GenAssManager';
import { logger } from '../utils/logger';
import fs from 'fs-extra';
import path from 'path';

export interface SessionContext {
  projectPath: string;
  conversationHistory: Content[];
  cachedContext?: string;
  sessionStartTime: number;
  totalTokensUsed: number;
  totalCost: number;
  manager?: GenAssManager;
  currentTasks: Array<{
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>;
}

export interface SessionConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  enableContextCaching: boolean;
  systemInstruction: string;
}

export class InteractiveSession {
  private client: GoogleGenerativeAI;
  private context: SessionContext;
  private config: SessionConfig;
  private rl: readline.Interface;
  private model: any;
  private chat: any;
  private tools: Tool[];

  constructor(projectPath: string = process.cwd()) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    this.config = {
      model: 'gemini-2.0-flash-exp',
      temperature: 0.7,
      maxOutputTokens: 8192,
      enableContextCaching: true,
      systemInstruction: `You are GenAss, a SPECIALIZED AI assistant for visual asset generation ONLY.

YOUR SOLE PURPOSE: Help users generate visual assets (logos, icons, banners, images, etc.) for their projects.

STRICT SCOPE - YOU CAN ONLY:
✅ Scan projects to identify missing visual assets
✅ Generate logos, icons, banners, illustrations, favicons
✅ Create social media images (OG, Twitter cards)
✅ Generate PWA/app icons
✅ Audit existing visual assets
✅ Recommend asset improvements
✅ Create branding packages

❌ YOU CANNOT:
- Write code (except asset imports/references)
- Debug applications
- Explain programming concepts
- Perform general coding tasks
- Answer non-asset-related questions
- Modify application logic

If asked to do something outside asset generation, politely decline and redirect to asset-related tasks.

IMPORTANT: You have access to REAL functions that you MUST USE to perform actions. Don't just describe what you would do - actually call the functions!

Available functions:
- scanProject: Scan a project directory to analyze codebase and identify asset needs
- generateAssets: Generate visual assets based on a plan (after scanning)
- getProjectStatus: Get the current status of the project and generated assets
- listFiles: List files in a directory to understand project structure

When a user asks you to:
- "scan the project/folder" → CALL scanProject function
- "generate assets/logo/icons" → CALL generateAssets function
- "show status" → CALL getProjectStatus function
- "what files are there" → CALL listFiles function

Always use functions to take real actions. After calling a function, explain the results to the user.

Current project: ${projectPath}`
    };

    this.context = {
      projectPath,
      conversationHistory: [],
      sessionStartTime: Date.now(),
      totalTokensUsed: 0,
      totalCost: 0,
      currentTasks: []
    };

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '', // Will be set dynamically
      completer: this.completeCommand.bind(this)
    });

    // Define function declarations for the AI
    this.tools = [{
      functionDeclarations: [
        {
          name: 'scanProject',
          description: 'Scan a project directory to analyze the codebase, detect frameworks, identify missing assets, and create a generation plan. Use this when the user asks to scan, analyze, or understand their project.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              projectPath: {
                type: SchemaType.STRING,
                description: 'The path to the project directory to scan. Use the current project path from context if not specified.'
              },
              dryRun: {
                type: SchemaType.BOOLEAN,
                description: 'If true, only analyze without creating a generation plan. Default false.'
              }
            },
            required: ['projectPath']
          }
        },
        {
          name: 'generateAssets',
          description: 'Generate visual assets based on a previously created plan. Use this after scanning when user wants to create assets.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              assetType: {
                type: SchemaType.STRING,
                description: 'Type of assets to generate: icon, logo, banner, illustration, social-media, ui-element, or "all"'
              },
              priority: {
                type: SchemaType.STRING,
                description: 'Priority level: high, medium, or low. Default is all priorities.'
              }
            }
          }
        },
        {
          name: 'getProjectStatus',
          description: 'Get the current status of the project including generated assets, plans, and statistics.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              projectPath: {
                type: SchemaType.STRING,
                description: 'The path to the project. Uses current project if not specified.'
              }
            }
          }
        },
        {
          name: 'listFiles',
          description: 'List files and directories in a specific path to understand project structure.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              directoryPath: {
                type: SchemaType.STRING,
                description: 'The directory path to list files from'
              },
              maxDepth: {
                type: SchemaType.NUMBER,
                description: 'Maximum depth to traverse. Default 2.'
              }
            },
            required: ['directoryPath']
          }
        }
      ]
    }];

    this.initializeModel();
  }

  private initializeModel(): void {
    this.model = this.client.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
      systemInstruction: this.config.systemInstruction,
      tools: this.tools
    });

    this.chat = this.model.startChat({
      history: this.context.conversationHistory,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      }
    });
  }

  async start(): Promise<void> {
    console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.white('  GenAss - AI-Powered Asset Generation Assistant      ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.gray(`Project: ${this.context.projectPath}`));
    console.log(chalk.gray(`Model: ${this.config.model}`));
    console.log(chalk.gray(`Type ${chalk.white('/help')} for commands or ${chalk.white('/exit')} to quit\n`));

    // Run onboarding flow to gather context
    await this.runOnboarding();

    // Set up the fancy prompt
    await this.updatePrompt();

    return new Promise((resolve) => {
      this.rl.prompt();

      this.rl.on('line', async (input: string) => {
        const trimmedInput = input.trim();

        if (!trimmedInput) {
          this.rl.prompt();
          return;
        }

        // If user just types "/", show command picker
        if (trimmedInput === '/') {
          const command = await this.showCommandPicker();
          if (command) {
            const shouldContinue = await this.handleCommand(command);
            if (!shouldContinue) {
              resolve();
              return;
            }
          }
          this.rl.prompt();
          return;
        }

        // Handle session commands
        if (trimmedInput.startsWith('/')) {
          const shouldContinue = await this.handleCommand(trimmedInput);
          if (!shouldContinue) {
            resolve();
            return;
          }
          this.rl.prompt();
          return;
        }

        // Process user input with AI
        await this.processUserInput(trimmedInput);
        this.rl.prompt();
      });

      this.rl.on('close', () => {
        this.displaySessionSummary();
        resolve();
      });
    });
  }

  private async handleCommand(command: string): Promise<boolean> {
    const [cmd, ...args] = command.split(' ');

    switch (cmd.toLowerCase()) {
      case '/help':
        this.displayHelp();
        return true;

      case '/status':
        this.displayStatus();
        return true;

      case '/clear':
        this.clearHistory();
        console.log(chalk.green('✓ Conversation history cleared\n'));
        return true;

      case '/exit':
      case '/quit':
        console.log(chalk.yellow('\nExiting session...\n'));
        this.rl.close();
        return false;

      // Quick action commands with prebuilt prompts
      case '/scan':
        console.log(chalk.cyan('🔍 Running quick scan...\n'));
        this.displayTaskList([
          { id: '1', description: 'Scanning project structure', status: 'in_progress' },
          { id: '2', description: 'Analyzing codebase for asset references', status: 'pending' },
          { id: '3', description: 'Identifying missing visual assets', status: 'pending' },
          { id: '4', description: 'Creating generation plan', status: 'pending' }
        ]);
        await this.processUserInput('Scan my project thoroughly, analyze the codebase, identify all missing VISUAL ASSETS (logos, icons, images, banners), and create a comprehensive generation plan. Show me what visual assets are needed and why.');
        return true;

      case '/logo':
        console.log(chalk.cyan('🎨 Generating logo...\n'));
        this.displayTaskList([
          { id: '1', description: 'Analyzing app purpose and brand', status: 'in_progress' },
          { id: '2', description: 'Designing logo concept', status: 'pending' },
          { id: '3', description: 'Generating primary logo', status: 'pending' },
          { id: '4', description: 'Creating icon variant', status: 'pending' }
        ]);
        await this.processUserInput('Generate a professional, modern logo for my app that reflects its purpose and brand identity. Make it versatile for use across different platforms and sizes. Include both full logo and icon variants.');
        return true;

      case '/icons':
        console.log(chalk.cyan('✨ Generating UI icons...\n'));
        await this.processUserInput('Generate a complete set of UI icons for my app including: navigation icons, action buttons, status indicators, and common interface elements. Ensure consistent style and sizing across all icons.');
        return true;

      case '/hero':
        console.log(chalk.cyan('🖼️  Generating hero image...\n'));
        await this.processUserInput('Create an eye-catching hero banner image for the landing page that visually represents the app\'s core value proposition. Make it modern, professional, and aligned with current design trends.');
        return true;

      case '/favicon':
        console.log(chalk.cyan('⭐ Generating favicon set...\n'));
        await this.processUserInput('Generate a complete favicon package including: 16x16, 32x32, 180x180 (Apple touch), and 512x512 sizes. Ensure the design is recognizable at small sizes and works on both light and dark backgrounds.');
        return true;

      case '/social':
        console.log(chalk.cyan('📱 Generating social media assets...\n'));
        await this.processUserInput('Create optimized social media assets including: Open Graph image (1200x630), Twitter card image, and LinkedIn preview. Design them to be attention-grabbing when shared on social platforms.');
        return true;

      case '/branding':
        console.log(chalk.cyan('🎯 Creating complete branding package...\n'));
        await this.processUserInput('Generate a complete branding asset package for my app including: primary logo, secondary logo mark, favicon set, social media assets, app icons for multiple platforms, and brand illustrations. Ensure visual consistency across all assets.');
        return true;

      case '/audit':
        console.log(chalk.cyan('🔎 Auditing existing assets...\n'));
        await this.processUserInput('Analyze all existing assets in my project. Check for: missing assets, inconsistent sizing, quality issues, outdated designs, and assets that could be improved or replaced. Provide a detailed report with recommendations.');
        return true;

      case '/quick':
        console.log(chalk.cyan('⚡ Quick essentials...\n'));
        await this.processUserInput('Generate only the essential assets needed to launch: app logo, favicon, and one hero/banner image. Focus on speed while maintaining quality.');
        return true;

      case '/pwa':
        console.log(chalk.cyan('📲 Generating PWA assets...\n'));
        await this.processUserInput('Generate a complete Progressive Web App (PWA) asset package including: manifest icons (192x192, 512x512), maskable icons, favicon set, and Apple touch icons. Ensure they meet PWA requirements.');
        return true;

      case '/inject':
        console.log(chalk.cyan('💉 Injecting assets into code...\n'));
        await this.injectGeneratedAssets();
        return true;

      default:
        console.log(chalk.red(`Unknown command: ${cmd}`));
        console.log(chalk.gray('Type /help for available commands\n'));
        return true;
    }
  }

  private displayHelp(): void {
    console.log(chalk.bold('\n📚 Session Commands:\n'));
    console.log(chalk.cyan('  /help   ') + chalk.gray(' - Show this help message'));
    console.log(chalk.cyan('  /status ') + chalk.gray(' - Show session statistics'));
    console.log(chalk.cyan('  /clear  ') + chalk.gray(' - Clear conversation history'));
    console.log(chalk.cyan('  /exit   ') + chalk.gray(' - Exit the interactive session'));

    console.log(chalk.bold('\n⚡ Quick Action Commands:\n'));
    console.log(chalk.cyan('  /scan     ') + chalk.gray(' - Scan project and create generation plan'));
    console.log(chalk.cyan('  /logo     ') + chalk.gray(' - Generate app logo'));
    console.log(chalk.cyan('  /icons    ') + chalk.gray(' - Generate complete UI icon set'));
    console.log(chalk.cyan('  /hero     ') + chalk.gray(' - Generate hero banner image'));
    console.log(chalk.cyan('  /favicon  ') + chalk.gray(' - Generate favicon package'));
    console.log(chalk.cyan('  /social   ') + chalk.gray(' - Generate social media assets'));
    console.log(chalk.cyan('  /branding ') + chalk.gray(' - Complete branding package'));
    console.log(chalk.cyan('  /pwa      ') + chalk.gray(' - Generate PWA manifest icons'));
    console.log(chalk.cyan('  /audit    ') + chalk.gray(' - Audit existing assets'));
    console.log(chalk.cyan('  /quick    ') + chalk.gray(' - Generate essential assets only'));
    console.log(chalk.cyan('  /inject   ') + chalk.gray(' - Inject generated assets into code'));

    console.log(chalk.bold('\n💬 Natural Language:\n'));
    console.log(chalk.gray('  You can also chat naturally:'));
    console.log(chalk.gray('  • "What assets does my app need?"'));
    console.log(chalk.gray('  • "Create a minimalist logo"'));
    console.log(chalk.gray('  • "Generate icons for my dashboard"'));
    console.log(chalk.gray('  • "Show me what you can do"'));
    console.log();
  }

  private displayStatus(): void {
    const uptime = Math.floor((Date.now() - this.context.sessionStartTime) / 1000);
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;

    console.log(chalk.bold('\n📊 Session Status:\n'));
    console.log(chalk.gray('  Project:        ') + chalk.white(this.context.projectPath));
    console.log(chalk.gray('  Model:          ') + chalk.white(this.config.model));
    console.log(chalk.gray('  Session time:   ') + chalk.white(`${minutes}m ${seconds}s`));
    console.log(chalk.gray('  Messages:       ') + chalk.white(Math.floor(this.context.conversationHistory.length / 2)));
    console.log(chalk.gray('  Context cache:  ') + chalk.white(this.config.enableContextCaching ? 'Enabled' : 'Disabled'));
    console.log(chalk.gray('  Tokens used:    ') + chalk.white(this.context.totalTokensUsed.toLocaleString()));
    console.log(chalk.gray('  Estimated cost: ') + chalk.white(`$${this.context.totalCost.toFixed(4)}`));
    console.log();
  }

  private displaySessionSummary(): void {
    console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.white('  Session Summary                                      ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════════╝\n'));

    const uptime = Math.floor((Date.now() - this.context.sessionStartTime) / 1000);
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;

    console.log(chalk.gray(`  Duration: ${minutes}m ${seconds}s`));
    console.log(chalk.gray(`  Messages exchanged: ${Math.floor(this.context.conversationHistory.length / 2)}`));
    console.log(chalk.gray(`  Total tokens: ${this.context.totalTokensUsed.toLocaleString()}`));
    console.log(chalk.gray(`  Total cost: $${this.context.totalCost.toFixed(4)}`));
    console.log();
    console.log(chalk.green('  Thank you for using GenAss! 👋\n'));
  }

  private async processUserInput(input: string): Promise<void> {
    try {
      console.log(); // Empty line before response

      // Show thinking indicator
      const thinkingInterval = this.showThinkingIndicator();

      // Send message and get response (might include function calls)
      const result = await this.chat.sendMessage(input);
      const response = await result.response;

      clearInterval(thinkingInterval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear thinking indicator

      // Check if AI wants to call functions
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        // Execute function calls
        const functionResponses = await this.executeFunctionCalls(functionCalls);

        // Send function results back to AI
        const followUpResult = await this.chat.sendMessage(functionResponses);
        const followUpResponse = await followUpResult.response;

        // Display AI's response after processing function results
        console.log(chalk.bold.green('GenAss: '));
        const finalText = followUpResponse.text();
        console.log(chalk.white(finalText));

        // Update history
        this.context.conversationHistory.push(
          { role: 'user', parts: [{ text: input }] },
          { role: 'model', parts: [{ text: finalText }] }
        );

        // Estimate tokens
        const tokens = Math.floor((input.length + finalText.length) / 4);
        this.context.totalTokensUsed += tokens;
        this.context.totalCost += (tokens / 1000000) * 0.075;
      } else {
        // Regular text response
        console.log(chalk.bold.green('GenAss: '));
        const responseText = response.text();
        console.log(chalk.white(responseText));

        // Update history
        this.context.conversationHistory.push(
          { role: 'user', parts: [{ text: input }] },
          { role: 'model', parts: [{ text: responseText }] }
        );

        // Estimate tokens
        const tokens = Math.floor((input.length + responseText.length) / 4);
        this.context.totalTokensUsed += tokens;
        this.context.totalCost += (tokens / 1000000) * 0.075;
      }

      console.log(); // Extra line after response

    } catch (error) {
      console.error(chalk.red('\n✗ Error processing message:'), error instanceof Error ? error.message : 'Unknown error');
      logger.error('Interactive session error', error);
      console.log();
    }
  }

  private async executeFunctionCalls(functionCalls: any[]): Promise<any[]> {
    const responses = [];

    for (const call of functionCalls) {
      const functionName = call.name;
      const args = call.args;

      console.log(chalk.yellow(`⚡ Executing: ${functionName}(${JSON.stringify(args).slice(0, 100)}...)`));
      console.log();

      try {
        let result;

        switch (functionName) {
          case 'scanProject':
            result = await this.handleScanProject(args);
            break;

          case 'generateAssets':
            result = await this.handleGenerateAssets(args);
            break;

          case 'getProjectStatus':
            result = await this.handleGetProjectStatus(args);
            break;

          case 'listFiles':
            result = await this.handleListFiles(args);
            break;

          default:
            result = { error: `Unknown function: ${functionName}` };
        }

        responses.push({
          functionResponse: {
            name: functionName,
            response: result
          }
        });

      } catch (error) {
        console.error(chalk.red(`✗ Function ${functionName} failed:`), error instanceof Error ? error.message : 'Unknown error');
        responses.push({
          functionResponse: {
            name: functionName,
            response: { error: error instanceof Error ? error.message : 'Unknown error' }
          }
        });
      }
    }

    return responses;
  }

  private async handleScanProject(args: any): Promise<any> {
    const projectPath = args.projectPath || this.context.projectPath;
    const dryRun = args.dryRun || false;

    const spinner = ora('Scanning project...').start();

    try {
      // Initialize manager if not already done
      if (!this.context.manager) {
        this.context.manager = new GenAssManager();
      }

      await this.context.manager.initialize(projectPath);

      if (dryRun) {
        spinner.succeed('Analysis complete');
        return {
          success: true,
          message: 'Project analysis completed (dry run mode)',
          projectPath
        };
      } else {
        // Run full workflow
        await this.context.manager.fullWorkflow();
        spinner.succeed('Scan complete');

        return {
          success: true,
          message: 'Project scanned successfully and generation plan created',
          projectPath
        };
      }
    } catch (error) {
      spinner.fail('Scan failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleGenerateAssets(args: any): Promise<any> {
    const spinner = ora('Generating assets...').start();

    try {
      if (!this.context.manager) {
        this.context.manager = new GenAssManager();
        await this.context.manager.initialize(this.context.projectPath);
      }

      await this.context.manager.generateFromPlan(args);
      spinner.succeed('Assets generated');

      return {
        success: true,
        message: 'Assets generated successfully',
        assetType: args.assetType || 'all',
        priority: args.priority || 'all'
      };
    } catch (error) {
      spinner.fail('Generation failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleGetProjectStatus(args: any): Promise<any> {
    const projectPath = args.projectPath || this.context.projectPath;

    try {
      if (!this.context.manager) {
        this.context.manager = new GenAssManager();
      }

      // This would call the actual status method
      // For now, return basic info
      const generatedAssetsDir = path.join(projectPath, 'generated-assets');
      const hasGeneratedAssets = await fs.pathExists(generatedAssetsDir);

      let assetCount = 0;
      if (hasGeneratedAssets) {
        const files = await fs.readdir(generatedAssetsDir);
        assetCount = files.length;
      }

      return {
        success: true,
        projectPath,
        hasGeneratedAssets,
        assetCount,
        message: hasGeneratedAssets
          ? `Found ${assetCount} generated assets`
          : 'No generated assets yet. Run a scan first.'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleListFiles(args: any): Promise<any> {
    const directoryPath = args.directoryPath;
    const maxDepth = args.maxDepth || 2;

    try {
      const files = await this.listFilesRecursive(directoryPath, maxDepth, 0);
      return {
        success: true,
        directoryPath,
        files: files.slice(0, 50), // Limit to 50 files
        totalCount: files.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async listFilesRecursive(dir: string, maxDepth: number, currentDepth: number): Promise<string[]> {
    if (currentDepth >= maxDepth) return [];

    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip common ignored directories
      if (entry.isDirectory() && ['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await this.listFilesRecursive(fullPath, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private showThinkingIndicator(): NodeJS.Timeout {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;

    return setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(frames[i])} ${chalk.gray('Thinking...')}`);
      i = (i + 1) % frames.length;
    }, 80);
  }

  private clearHistory(): void {
    this.context.conversationHistory = [];
    this.chat = this.model.startChat({
      history: [],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      }
    });
  }

  public getContext(): SessionContext {
    return this.context;
  }

  private async injectGeneratedAssets(): Promise<void> {
    try {
      const publicAssetsDir = path.join(this.context.projectPath, 'public/assets');

      // Check if assets exist
      if (!await fs.pathExists(publicAssetsDir)) {
        console.log(chalk.yellow('⚠️  No assets found in public/assets'));
        console.log(chalk.gray('   Generate assets first using /scan or other commands\n'));
        return;
      }

      console.log(chalk.bold.white('💉 Auto-Injecting Assets into Code\n'));
      console.log(chalk.gray('   Analyzing your codebase and adding import statements...\n'));

      // Find all generated assets
      const assets = await this.findGeneratedAssets(publicAssetsDir);

      if (assets.length === 0) {
        console.log(chalk.yellow('⚠️  No assets found to inject\n'));
        return;
      }

      console.log(chalk.gray(`   Found ${assets.length} assets to inject\n`));

      // Show what would be injected
      console.log(chalk.bold('📝 Example Code Snippets:\n'));

      for (const asset of assets.slice(0, 3)) { // Show first 3
        const assetName = path.basename(asset, path.extname(asset));
        const relativePath = path.relative(this.context.projectPath, asset);

        console.log(chalk.cyan(`   ${assetName}:`));
        console.log(chalk.gray(`   import ${this.toCamelCase(assetName)} from '@/${relativePath.replace(/\\/g, '/')}';`));
        console.log(chalk.gray(`   <img src={${this.toCamelCase(assetName)}} alt="${assetName.replace(/-/g, ' ')}" />\n`));
      }

      if (assets.length > 3) {
        console.log(chalk.gray(`   ... and ${assets.length - 3} more assets\n`));
      }

      console.log(chalk.green('✓ Assets ready to use!'));
      console.log(chalk.gray('  Copy the import statements above into your components\n'));

    } catch (error) {
      console.error(chalk.red('✗ Failed to inject assets:'), error instanceof Error ? error.message : 'Unknown error');
      logger.error('Asset injection failed', error);
    }
  }

  private async findGeneratedAssets(dir: string): Promise<string[]> {
    const assets: string[] = [];

    const walk = async (currentDir: string): Promise<void> => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(path.extname(entry.name))) {
          assets.push(fullPath);
        }
      }
    };

    await walk(dir);
    return assets;
  }

  private toCamelCase(str: string): string {
    return str
      .split('-')
      .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  private async updatePrompt(): Promise<void> {
    try {
      // Try to get git branch
      let gitBranch = '';
      try {
        const { execSync } = require('child_process');
        gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: this.context.projectPath,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
      } catch (error) {
        // Not a git repo or git not available
      }

      // Build the prompt
      const projectName = path.basename(this.context.projectPath);
      const modelName = this.config.model.replace('gemini-', '').replace('-exp', '');

      let promptLine1 = chalk.gray('  ★ ') + chalk.cyan(projectName);

      if (gitBranch) {
        promptLine1 += chalk.gray(':') + chalk.green(`git:(${gitBranch})`);
      }

      promptLine1 += chalk.gray(' • ') + chalk.yellow(`ai:(${modelName})`);

      const promptLine2 = chalk.cyan('  >> ') + chalk.gray('type ') + chalk.white('/') + chalk.gray(' for commands (shift+tab to cycle)');

      this.rl.setPrompt('\n' + promptLine1 + '\n' + promptLine2 + '\n  ');
    } catch (error) {
      // Fallback to simple prompt
      this.rl.setPrompt(chalk.cyan('genass> '));
    }
  }

  private async showCommandPicker(): Promise<string | null> {
    const commandChoices = [
      { name: chalk.cyan('/scan     ') + chalk.gray(' - Scan project and create generation plan'), value: '/scan' },
      { name: chalk.cyan('/logo     ') + chalk.gray(' - Generate professional app logo'), value: '/logo' },
      { name: chalk.cyan('/icons    ') + chalk.gray(' - Generate complete UI icon set'), value: '/icons' },
      { name: chalk.cyan('/hero     ') + chalk.gray(' - Generate hero banner image'), value: '/hero' },
      { name: chalk.cyan('/favicon  ') + chalk.gray(' - Generate favicon package'), value: '/favicon' },
      { name: chalk.cyan('/social   ') + chalk.gray(' - Generate social media assets'), value: '/social' },
      { name: chalk.cyan('/branding ') + chalk.gray(' - Complete branding package'), value: '/branding' },
      { name: chalk.cyan('/pwa      ') + chalk.gray(' - Generate PWA manifest icons'), value: '/pwa' },
      { name: chalk.cyan('/audit    ') + chalk.gray(' - Audit existing assets'), value: '/audit' },
      { name: chalk.cyan('/quick    ') + chalk.gray(' - Generate essential assets only'), value: '/quick' },
      { name: chalk.cyan('/inject   ') + chalk.gray(' - Inject generated assets into code'), value: '/inject' },
      new inquirer.Separator(),
      { name: chalk.gray('/help     ') + chalk.gray(' - Show available commands'), value: '/help' },
      { name: chalk.gray('/status   ') + chalk.gray(' - Show session statistics'), value: '/status' },
      { name: chalk.gray('/clear    ') + chalk.gray(' - Clear conversation history'), value: '/clear' },
      { name: chalk.gray('/exit     ') + chalk.gray(' - Exit the session'), value: '/exit' },
    ];

    try {
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'command',
          message: 'Choose a command:',
          choices: commandChoices,
          pageSize: 15,
          loop: false
        }
      ]);

      return answer.command;
    } catch (error) {
      // User cancelled (Ctrl+C)
      return null;
    }
  }

  private completeCommand(line: string): [string[], string] {
    // List of all available commands
    const commands = [
      '/help',
      '/status',
      '/clear',
      '/exit',
      '/quit',
      '/scan',
      '/logo',
      '/icons',
      '/hero',
      '/favicon',
      '/social',
      '/branding',
      '/audit',
      '/quick',
      '/pwa',
      '/inject'
    ];

    // Only provide completions if line starts with /
    if (!line.startsWith('/')) {
      return [[], line];
    }

    // Filter commands that match the current input
    const hits = commands.filter((cmd) => cmd.startsWith(line));

    // Return matching commands (empty array if no matches)
    return [hits, line];
  }

  private displayTaskList(tasks: Array<{ id: string; description: string; status: 'pending' | 'in_progress' | 'completed' | 'failed' }>): void {
    console.log(chalk.bold.white('📋 Tasks:\n'));

    tasks.forEach(task => {
      let icon = '';
      let color = chalk.gray;

      switch (task.status) {
        case 'in_progress':
          icon = '⠿';
          color = chalk.cyan;
          break;
        case 'completed':
          icon = '✓';
          color = chalk.green;
          break;
        case 'failed':
          icon = '✗';
          color = chalk.red;
          break;
        case 'pending':
          icon = '○';
          color = chalk.gray;
          break;
      }

      console.log(color(`  ${icon} ${task.description}`));
    });

    console.log(); // Empty line after task list
  }

  private async runOnboarding(): Promise<void> {
    try {
      const agentsFilePath = path.join(this.context.projectPath, 'AGENTS.md');

      // Check if AGENTS.md already exists
      if (await fs.pathExists(agentsFilePath)) {
        // Load existing context
        const agentsContent = await fs.readFile(agentsFilePath, 'utf-8');
        const context = this.parseAgentsFile(agentsContent);

        if (context.appGoal) {
          console.log(chalk.bold.white('👋 Welcome back!\n'));
          console.log(chalk.green(`✓ Loaded context from AGENTS.md`));
          console.log(chalk.gray(`  Project: ${context.projectName}`));
          console.log(chalk.gray(`  Type: ${context.projectType}`));
          console.log(chalk.gray(`  Purpose: ${context.appGoal}\n`));

          // Update context
          this.context.cachedContext = context.appGoal;

          // Update system instruction with loaded context
          this.updateSystemInstructionWithContext(
            context.projectType,
            context.projectName,
            context.appGoal
          );

          // Re-initialize model with context
          this.initializeModel();

          console.log(chalk.gray('Type your request below, or use /help for commands\n'));
          return;
        }
      }

      // No existing context - run first-time onboarding
      await this.runFirstTimeOnboarding(agentsFilePath);

    } catch (error) {
      logger.warn('Onboarding failed', error);
      // Continue anyway - onboarding is optional
    }
  }

  private async runFirstTimeOnboarding(agentsFilePath: string): Promise<void> {
    // Detect project type
    const packageJsonPath = path.join(this.context.projectPath, 'package.json');
    let projectType = 'unknown';
    let projectName = path.basename(this.context.projectPath);

    if (await fs.pathExists(packageJsonPath)) {
      const pkg = await fs.readJson(packageJsonPath);
      projectName = pkg.name || projectName;

      // Detect framework
      if (pkg.dependencies?.next || pkg.devDependencies?.next) {
        projectType = 'Next.js';
      } else if (pkg.dependencies?.react || pkg.devDependencies?.react) {
        projectType = 'React';
      } else if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
        projectType = 'Vue.js';
      } else if (pkg.dependencies?.angular || pkg.devDependencies?.['@angular/core']) {
        projectType = 'Angular';
      } else if (pkg.dependencies?.svelte || pkg.devDependencies?.svelte) {
        projectType = 'Svelte';
      }
    }

    // Display detected info
    console.log(chalk.bold.white('👋 Welcome! Let me learn about your project...\n'));

    if (projectType !== 'unknown') {
      console.log(chalk.green(`✓ Detected: ${projectType} project`));
    }

    console.log(chalk.gray(`  Project: ${projectName}\n`));

    // Ask about the app's purpose
    console.log(chalk.white('To provide the best asset recommendations, tell me:'));
    console.log(chalk.cyan('What does your app do? (e.g., "It\'s an e-commerce site for selling shoes")\n'));

    // Get user response
    const appGoal = await this.promptUser('Your app: ');

    if (appGoal && appGoal.trim().length > 0) {
      // Save to AGENTS.md
      await this.saveAgentsFile(agentsFilePath, {
        projectName,
        projectType,
        appGoal: appGoal.trim(),
        createdAt: new Date().toISOString()
      });

      // Update context
      this.context.cachedContext = appGoal.trim();

      // Update system instruction with this context
      this.updateSystemInstructionWithContext(projectType, projectName, appGoal.trim());

      // Re-initialize model with updated context
      this.initializeModel();

      console.log(chalk.green('\n✓ Got it! I\'ll remember this for next time.\n'));
      console.log(chalk.gray(`  Saved to: AGENTS.md\n`));
    } else {
      console.log(chalk.yellow('\n⚠️  No problem! I\'ll provide general recommendations.\n'));
    }

    console.log(chalk.gray('Type your request below, or use /help for commands\n'));
  }

  private async saveAgentsFile(
    filePath: string,
    context: { projectName: string; projectType: string; appGoal: string; createdAt: string }
  ): Promise<void> {
    const content = `# GenAss Agent Context

This file contains context about your project for the GenAss AI assistant.
It helps provide better, more relevant asset recommendations across sessions.

**Do not delete this file** - it helps GenAss remember your project details.

---

## Project Information

**Project Name:** ${context.projectName}
**Project Type:** ${context.projectType}
**Created:** ${new Date(context.createdAt).toLocaleString()}

## App Purpose

${context.appGoal}

---

## Notes for GenAss AI

Based on this app's purpose, GenAss should prioritize:
- Assets that align with the app's goals and target audience
- Visual styles appropriate for the ${context.projectType} framework
- Industry-specific visual elements when relevant

## Edit This File

You can edit the "App Purpose" section above to update the context.
GenAss will use this information in future sessions.
`;

    await fs.writeFile(filePath, content, 'utf-8');
    logger.info('Saved agent context to AGENTS.md', { projectName: context.projectName });
  }

  private parseAgentsFile(content: string): {
    projectName: string;
    projectType: string;
    appGoal: string;
  } {
    const projectNameMatch = content.match(/\*\*Project Name:\*\* (.+)/);
    const projectTypeMatch = content.match(/\*\*Project Type:\*\* (.+)/);

    // Extract app goal (text between "## App Purpose" and "---")
    const appGoalMatch = content.match(/## App Purpose\s+(.+?)\s+---/s);

    return {
      projectName: projectNameMatch?.[1]?.trim() || 'Unknown',
      projectType: projectTypeMatch?.[1]?.trim() || 'Unknown',
      appGoal: appGoalMatch?.[1]?.trim() || ''
    };
  }

  private async promptUser(message: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.cyan(message), (answer) => {
        resolve(answer);
      });
    });
  }

  private updateSystemInstructionWithContext(projectType: string, projectName: string, appGoal: string): void {
    this.config.systemInstruction = `You are GenAss, a SPECIALIZED AI assistant for visual asset generation ONLY.

YOUR SOLE PURPOSE: Help users generate visual assets (logos, icons, banners, images, etc.) for their projects.

PROJECT CONTEXT:
- Project Name: ${projectName}
- Project Type: ${projectType}
- App Purpose: ${appGoal}

STRICT SCOPE - YOU CAN ONLY:
✅ Scan projects to identify missing visual assets
✅ Generate logos, icons, banners, illustrations, favicons
✅ Create social media images (OG, Twitter cards)
✅ Generate PWA/app icons
✅ Audit existing visual assets
✅ Recommend asset improvements
✅ Create branding packages

❌ YOU CANNOT:
- Write code (except asset imports/references)
- Debug applications
- Explain programming concepts
- Perform general coding tasks
- Answer non-asset-related questions
- Modify application logic

If asked to do something outside asset generation, politely decline and redirect to asset-related tasks.

IMPORTANT: You have access to REAL functions that you MUST USE:

Available functions:
- scanProject: Scan project to identify missing visual assets
- generateAssets: Generate visual assets (logos, icons, images)
- getProjectStatus: Check generated assets status
- listFiles: Browse project structure for asset analysis

TASK TRACKING:
Before starting work, display your plan as a checklist:
- [ ] Task 1
- [ ] Task 2
- [x] Task 3 (completed)

Update the checklist as you progress so users see what you're doing.

When a user asks you to:
- "scan the project" → CALL scanProject function
- "generate logo/icons/assets" → CALL generateAssets function
- "show status" → CALL getProjectStatus function

Always use functions to take real actions. Focus ONLY on visual asset generation.

Current project: ${this.context.projectPath}

Suggest assets that would benefit "${appGoal}", but ONLY visual assets.`;
  }
}