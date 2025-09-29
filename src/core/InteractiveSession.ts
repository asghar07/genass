import { GoogleGenerativeAI, Content, FunctionDeclaration, Tool, SchemaType } from '@google/generative-ai';
import chalk from 'chalk';
import readline from 'readline';
import ora from 'ora';
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
      systemInstruction: `You are GenAss, an AI-powered asset generation assistant. You help users analyze their codebase and generate visual assets using Google Gemini API and Nano Banana (Gemini 2.5 Flash Image).

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
      totalCost: 0
    };

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('genass> ')
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

    return new Promise((resolve) => {
      this.rl.prompt();

      this.rl.on('line', async (input: string) => {
        const trimmedInput = input.trim();

        if (!trimmedInput) {
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

      default:
        console.log(chalk.red(`Unknown command: ${cmd}`));
        console.log(chalk.gray('Type /help for available commands\n'));
        return true;
    }
  }

  private displayHelp(): void {
    console.log(chalk.bold('\n📚 Available Commands:\n'));
    console.log(chalk.cyan('  /help') + chalk.gray('    - Show this help message'));
    console.log(chalk.cyan('  /status') + chalk.gray('  - Show session statistics and context info'));
    console.log(chalk.cyan('  /clear') + chalk.gray('   - Clear conversation history'));
    console.log(chalk.cyan('  /exit') + chalk.gray('    - Exit the interactive session'));

    console.log(chalk.bold('\n💡 Examples:\n'));
    console.log(chalk.gray('  • "Scan my project and find missing assets"'));
    console.log(chalk.gray('  • "Generate a logo for my app"'));
    console.log(chalk.gray('  • "What assets do I need for a React app?"'));
    console.log(chalk.gray('  • "Show me the status of my generated assets"'));
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
}