/**
 * Enhanced Interactive Session with Gemini CLI-style interface
 * Integrates EnhancedCLI with the AI tools and session management
 */

import { GoogleGenerativeAI, Content, FunctionDeclaration, Tool } from '@google/generative-ai';
import { EnhancedCLI } from '../ui/EnhancedCLI';
import { ToolRegistry } from '../tools/index';
import { AIToolsIntegration } from './AIToolsIntegration';
import { SessionContext, SessionConfig } from './InteractiveSession';
import { CostTracker } from '../utils/CostTracker';
import { logger } from '../utils/logger';
import path from 'path';

export class EnhancedInteractiveSession {
  private cli: EnhancedCLI;
  private client: GoogleGenerativeAI;
  private context: SessionContext;
  private config: SessionConfig;
  private model: any;
  private chat: any;
  private toolRegistry: ToolRegistry;
  private aiTools: AIToolsIntegration;
  private costTracker: CostTracker;
  private isRunning: boolean = false;

  constructor(projectPath: string = process.cwd()) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    // Initialize CLI
    this.cli = new EnhancedCLI({
      appName: 'GenAss',
      version: '1.0.0',
    });

    // Initialize AI client
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Initialize tools
    this.toolRegistry = new ToolRegistry(projectPath);
    this.aiTools = new AIToolsIntegration(projectPath);
    
    // Initialize cost tracking
    this.costTracker = new CostTracker(parseFloat(process.env.MONTHLY_BUDGET_LIMIT || '10.0'));

    // Initialize session context
    this.context = {
      projectPath,
      conversationHistory: [],
      sessionStartTime: Date.now(),
      totalTokensUsed: 0,
      totalCost: 0,
      currentTasks: [],
    };

    // Configure AI model
    this.config = {
      model: 'gemini-2.0-flash-exp',
      temperature: 0.7,
      maxOutputTokens: 8192,
      enableContextCaching: true,
      systemInstruction: this.buildSystemInstruction(projectPath),
    };

    // Initialize model with tools
    this.initializeModel();
  }

  /**
   * Start the enhanced interactive session
   */
  public async start(): Promise<void> {
    this.isRunning = true;
    
    // Display header and welcome
    this.cli.displayHeader();
    this.cli.displayWelcome(this.context.projectPath, 'Auto (Medium)');
    
    // Update CLI with session context
    this.cli.setSessionContext(this.context);

    // Main interaction loop
    while (this.isRunning) {
      try {
        const userInput = await this.cli.prompt();
        
        if (!userInput) continue;

        // Handle built-in commands
        if (await this.handleBuiltInCommand(userInput)) {
          continue;
        }

        // Process with AI
        await this.processAIInteraction(userInput);
        
      } catch (error) {
        logger.error('Session error:', error);
        this.cli.displaySystemMessage(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error'
        );
      }
    }

    this.cleanup();
  }

  /**
   * Stop the session
   */
  public stop(): void {
    this.isRunning = false;
  }

  // Private methods

  private initializeModel(): void {
    // Get tool declarations from registry
    const toolDeclarations = this.toolRegistry.getGeminiToolDeclarations();
    
    this.model = this.client.getGenerativeModel({
      model: this.config.model,
      systemInstruction: this.config.systemInstruction,
      tools: [{ functionDeclarations: toolDeclarations }],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    });

    this.chat = this.model.startChat({
      history: this.context.conversationHistory,
    });
  }

  private async handleBuiltInCommand(input: string): Promise<boolean> {
    const command = input.toLowerCase().trim();

    switch (command) {
      case 'help':
      case '?':
        this.cli.displayHelp();
        return true;

      case 'clear':
      case 'cls':
        console.clear();
        this.cli.displayHeader();
        return true;

      case 'exit':
      case 'quit':
      case 'q':
        this.cli.displaySystemMessage('Goodbye! 👋', 'info');
        this.stop();
        return true;

      case 'status':
        await this.displayStatus();
        return true;

      case 'scan':
        await this.quickScan();
        return true;

      case 'list':
        await this.quickList();
        return true;

      default:
        // Check for analyze command
        if (command.startsWith('analyze ')) {
          const filePath = input.substring(8).trim();
          await this.quickAnalyze(filePath);
          return true;
        }
        return false;
    }
  }

  private async processAIInteraction(userInput: string): Promise<void> {
    try {
      // Show thinking indicator
      const stopLoading = this.cli.showLoading('AI is thinking...');

      // Send message to AI
      const result = await this.chat.sendMessage(userInput);
      stopLoading();

      // Track usage
      const usage = result.response.usageMetadata;
      if (usage) {
        this.context.totalTokensUsed += (usage.totalTokenCount || 0);
        this.context.totalCost += this.calculateCost(usage);
        this.cli.setSessionContext(this.context);
      }

      // Process response
      const response = result.response;
      
      // Handle function calls
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        await this.handleFunctionCalls(functionCalls);
        return;
      }

      // Display text response
      const text = response.text();
      if (text) {
        this.cli.displayAIResponse(text);
      }

    } catch (error) {
      logger.error('AI interaction error:', error);
      this.cli.displaySystemMessage(
        `AI Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private async handleFunctionCalls(functionCalls: any[]): Promise<void> {
    for (const call of functionCalls) {
      const { name, args } = call;
      
      this.cli.displayToolExecution(name, 'starting');
      
      try {
        const result = await this.toolRegistry.executeTool(name, args);
        
        if (result.error) {
          this.cli.displayToolExecution(name, 'failed', result.error.message);
          this.cli.displaySystemMessage(result.returnDisplay, 'error');
        } else {
          this.cli.displayToolExecution(name, 'completed');
          this.cli.displaySystemMessage(result.returnDisplay, 'success');
        }

        // Send function response back to AI
        const functionResponse = {
          functionResponse: {
            name,
            response: { result: result.llmContent },
          },
        };

        const stopLoading = this.cli.showLoading('AI is processing results...');
        const followUp = await this.chat.sendMessage([functionResponse]);
        stopLoading();

        // Display AI's interpretation
        const text = followUp.response.text();
        if (text) {
          this.cli.displayAIResponse(text);
        }

      } catch (error) {
        this.cli.displayToolExecution(name, 'failed', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  private async displayStatus(): Promise<void> {
    try {
      const structure = await this.aiTools.getProjectStructure();
      const analysis = await this.aiTools.analyzeProjectAssets();

      this.cli.displaySystemMessage('Project Status', 'info');
      console.log(this.context.projectPath);
      console.log();

      this.cli.displayTable(
        ['Metric', 'Value'],
        [
          ['Components Found', analysis.components.length.toString()],
          ['Missing Assets', analysis.missingAssets.length.toString()],
          ['Placeholders', analysis.placeholders.length.toString()],
          ['Session Duration', this.formatDuration(Date.now() - this.context.sessionStartTime)],
          ['Tokens Used', this.context.totalTokensUsed.toString()],
          ['Total Cost', `$${this.context.totalCost.toFixed(4)}`],
        ]
      );

    } catch (error) {
      this.cli.displaySystemMessage('Failed to get status', 'error');
    }
  }

  private async quickScan(): Promise<void> {
    this.cli.displaySystemMessage('Scanning project...', 'info');
    
    try {
      const result = await this.toolRegistry.executeTool('list_directory', {
        path: this.context.projectPath,
      });

      if (!result.error) {
        this.cli.displaySystemMessage(result.returnDisplay, 'success');
        console.log(result.llmContent);
      } else {
        this.cli.displaySystemMessage(result.returnDisplay, 'error');
      }
    } catch (error) {
      this.cli.displaySystemMessage('Scan failed', 'error');
    }
  }

  private async quickList(): Promise<void> {
    try {
      const result = await this.toolRegistry.executeTool('list_directory', {
        path: this.context.projectPath,
      });

      if (!result.error) {
        console.log(result.llmContent);
      } else {
        this.cli.displaySystemMessage(result.returnDisplay, 'error');
      }
    } catch (error) {
      this.cli.displaySystemMessage('List failed', 'error');
    }
  }

  private async quickAnalyze(filePath: string): Promise<void> {
    this.cli.displaySystemMessage(`Analyzing ${filePath}...`, 'info');
    
    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.context.projectPath, filePath);

      const context = await this.aiTools.analyzeComponent(absolutePath);

      this.cli.displayTable(
        ['Property', 'Value'],
        [
          ['Component Type', context.componentType || 'Unknown'],
          ['Usage Context', context.usageContext || 'N/A'],
          ['Style Info', context.styleInfo || 'N/A'],
          ['Dimensions', context.dimensions || 'N/A'],
          ['Existing Assets', (context.existingAssets || []).join(', ') || 'None'],
        ]
      );

    } catch (error) {
      this.cli.displaySystemMessage(
        `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }

  private buildSystemInstruction(projectPath: string): string {
    return `You are GenAss, an AI assistant specialized in visual asset generation.

Your purpose: Help users generate logos, icons, banners, illustrations, and other visual assets for their projects.

Current project: ${projectPath}

You have access to powerful tools:
- read_file: Read file contents
- write_file: Write files
- replace: Edit files
- list_directory: List directories
- search_file_content: Search for patterns in files
- run_shell_command: Execute commands

Use these tools to:
1. Analyze project structure
2. Find where assets are needed
3. Understand component context
4. Help generate appropriate assets

Always use tools when appropriate. Don't just describe what to do - actually do it!`;
  }

  private calculateCost(usage: any): number {
    // Gemini 2.0 Flash pricing (example rates)
    const inputCostPer1M = 0.075;  // $0.075 per 1M tokens
    const outputCostPer1M = 0.30;   // $0.30 per 1M tokens

    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;

    const inputCost = (inputTokens / 1_000_000) * inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * outputCostPer1M;

    return inputCost + outputCost;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private cleanup(): void {
    this.cli.close();
    logger.info('Session ended', {
      duration: Date.now() - this.context.sessionStartTime,
      tokensUsed: this.context.totalTokensUsed,
      cost: this.context.totalCost,
    });
  }
}
