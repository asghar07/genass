import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import chalk from 'chalk';
import readline from 'readline';
import { logger } from '../utils/logger';

export interface SessionContext {
  projectPath: string;
  conversationHistory: Content[];
  cachedContext?: string;
  sessionStartTime: number;
  totalTokensUsed: number;
  totalCost: number;
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
      systemInstruction: `You are GenAss, an AI-powered asset generation assistant. You help users analyze their codebase and generate visual assets.

You have access to:
- Codebase analysis and scanning capabilities
- Asset generation using Nano Banana (Gemini 2.5 Flash Image)
- Project context and file structure understanding
- Multi-agent workflows for comprehensive planning

You should:
- Be conversational and helpful
- Provide clear explanations of what you're doing
- Ask clarifying questions when needed
- Suggest improvements and best practices
- Keep track of generated assets and project state

Current project: ${projectPath}

Available commands:
- Ask me to scan your project
- Request specific asset generation
- Check project status
- Get asset recommendations
- Review generated assets

Session commands (prefix with /):
/help - Show available commands
/status - Show session status
/clear - Clear conversation history
/exit - Exit the session`
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

    this.initializeModel();
  }

  private initializeModel(): void {
    this.model = this.client.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
      systemInstruction: this.config.systemInstruction
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

      // Send message and get streaming response
      const result = await this.chat.sendMessageStream(input);

      clearInterval(thinkingInterval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear thinking indicator

      // Stream the response
      console.log(chalk.bold.green('GenAss: ') + chalk.gray(''));

      let fullResponse = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        process.stdout.write(chalk.white(chunkText));
      }

      console.log('\n'); // Extra line after response

      // Update context
      this.context.conversationHistory.push(
        { role: 'user', parts: [{ text: input }] },
        { role: 'model', parts: [{ text: fullResponse }] }
      );

      // Estimate tokens and cost (rough approximation)
      const tokens = Math.floor((input.length + fullResponse.length) / 4);
      this.context.totalTokensUsed += tokens;
      this.context.totalCost += (tokens / 1000000) * 0.075; // Gemini 2.0 Flash pricing

    } catch (error) {
      console.error(chalk.red('\n✗ Error processing message:'), error instanceof Error ? error.message : 'Unknown error');
      logger.error('Interactive session error', error);
      console.log();
    }
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