/**
 * Enhanced CLI Interface v2 - With slash command autocomplete
 * Gemini CLI inspired design with dropdown suggestions
 */

import chalk from 'chalk';
import readline from 'readline';
import { SessionContext, SessionConfig } from '../core/InteractiveSession';
import { AutoComplete } from './AutoComplete';

type ChalkInstance = typeof chalk;

export interface EnhancedCLIConfig {
  appName: string;
  version: string;
  showTokenCount: boolean;
  showCostTracking: boolean;
  showTimestamp: boolean;
  autoSuggestions: boolean;
  primaryColor: ChalkInstance;
  secondaryColor: ChalkInstance;
  accentColor: ChalkInstance;
  errorColor: ChalkInstance;
  successColor: ChalkInstance;
}

export class EnhancedCLI {
  private rl: readline.Interface;
  private config: EnhancedCLIConfig;
  private sessionContext?: SessionContext;
  private startTime: number;
  private lastInputTime: number;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;
  private autoComplete: AutoComplete;
  private currentLine: string = '';
  
  private readonly DEFAULT_CONFIG: EnhancedCLIConfig = {
    appName: 'GenAss',
    version: '1.0.0',
    showTokenCount: true,
    showCostTracking: true,
    showTimestamp: true,
    autoSuggestions: true,
    primaryColor: chalk.hex('#FF6B35'),
    secondaryColor: chalk.hex('#6C757D'),
    accentColor: chalk.hex('#00D4FF'),
    errorColor: chalk.red,
    successColor: chalk.green,
  };

  constructor(config?: Partial<EnhancedCLIConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
    this.lastInputTime = Date.now();
    this.autoComplete = new AutoComplete();
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '',
      terminal: true,
      completer: this.handleTabCompletion.bind(this),
    });

    this.setupKeyboardShortcuts();
    this.setupReadlineListeners();
  }

  /**
   * Setup readline event listeners for real-time input handling
   */
  private setupReadlineListeners(): void {
    // Listen to line changes to detect '/' for autocomplete
    this.rl.on('line', (line) => {
      this.currentLine = '';
    });

    // Monitor keypress events
    if (process.stdin.isTTY) {
      process.stdin.on('keypress', async (char, key) => {
        if (!key) return;

        // Detect when user types '/'
        if (char === '/' && this.config.autoSuggestions) {
          // Small delay to let the character appear
          setTimeout(async () => {
            await this.showSlashCommandSuggestions();
          }, 50);
        }
      });
    }
  }

  /**
   * Show slash command suggestions dropdown
   */
  private async showSlashCommandSuggestions(): Promise<void> {
    try {
      // Get current line content
      const line = (this.rl as any).line || '';
      
      if (!line.startsWith('/')) return;

      // Clear current line
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);

      // Show autocomplete
      const selected = await this.autoComplete.showSuggestions(line);
      
      if (selected) {
        // Replace line with selected command
        (this.rl as any).line = selected + ' ';
        (this.rl as any).cursor = selected.length + 1;
        (this.rl as any)._refreshLine();
      } else {
        // Restore the line if cancelled
        (this.rl as any).line = line;
        (this.rl as any)._refreshLine();
      }
    } catch (error) {
      // Silently handle cancellation
    }
  }

  /**
   * Handle tab completion
   */
  private handleTabCompletion(line: string): [string[], string] {
    if (line.startsWith('/')) {
      const matches = this.autoComplete.searchCommands(line);
      const completions = matches.map(cmd => cmd.name);
      return [completions, line];
    }
    return [[], line];
  }

  /**
   * Display the application header
   */
  public displayHeader(): void {
    console.clear();
    const header = `
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║   ${this.config.primaryColor.bold('GenAss')} ${this.config.secondaryColor('- AI-Powered Asset Generation')}                          ║
║   ${this.config.secondaryColor('Intelligently analyze codebases and generate perfect visual assets')}  ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`;
    console.log(header);
  }

  /**
   * Display welcome message with context
   */
  public displayWelcome(projectPath: string, mode: string = 'Auto'): void {
    const welcome = `
${this.config.primaryColor('GenAss is now an AI-powered, context-aware asset generation tool')}
${this.config.primaryColor('that can intelligently analyze')} ${chalk.white.bold('codebases')} ${this.config.primaryColor('and create')}
${this.config.primaryColor('perfectly fitting visual assets!')} ${this.config.accentColor('🚀✨')}

${chalk.white.bold('Mode:')} ${this.config.accentColor(mode)} ${this.config.secondaryColor('- allow reversible commands')}  ${this.config.secondaryColor('shift+tab cycles')}

${this.config.secondaryColor('Project:')} ${chalk.white(projectPath)}
${this.config.secondaryColor('Type')} ${this.config.accentColor('/')} ${this.config.secondaryColor('for commands,')} ${this.config.accentColor('?')} ${this.config.secondaryColor('for help, or chat naturally with AI')}
`;
    console.log(welcome);
  }

  /**
   * Display status line (like Gemini CLI's right-aligned status)
   */
  private getStatusLine(): string {
    const elapsed = this.formatElapsedTime(Date.now() - this.startTime);
    
    let status = '';
    
    if (this.config.showTokenCount && this.sessionContext) {
      const tokens = this.sessionContext.totalTokensUsed;
      status += this.config.secondaryColor(`${this.formatNumber(tokens)} tokens`);
    }
    
    if (this.config.showCostTracking && this.sessionContext) {
      const cost = this.sessionContext.totalCost;
      if (status) status += this.config.secondaryColor(' • ');
      status += this.config.secondaryColor(`$${cost.toFixed(4)}`);
    }
    
    if (this.config.showTimestamp) {
      if (status) status += this.config.secondaryColor(' • ');
      status += this.config.secondaryColor(`${elapsed}`);
    }
    
    return status;
  }

  /**
   * Create the prompt line
   */
  public createPrompt(): string {
    return this.config.primaryColor('> ');
  }

  /**
   * Display the input prompt with status
   */
  public async prompt(): Promise<string> {
    return new Promise((resolve) => {
      const statusLine = this.getStatusLine();
      const terminalWidth = process.stdout.columns || 80;
      const padding = Math.max(0, terminalWidth - statusLine.length - 2);
      
      // Print status on the right side
      if (statusLine) {
        process.stdout.write('\r' + ' '.repeat(padding) + statusLine + '\n');
      }
      
      // Print prompt
      const promptText = this.createPrompt();
      this.rl.question(promptText, (answer) => {
        this.lastInputTime = Date.now();
        this.commandHistory.push(answer);
        this.historyIndex = -1;
        resolve(answer.trim());
      });
    });
  }

  /**
   * Display help text with shortcuts
   */
  public displayHelp(): void {
    const help = `
${chalk.white.bold('GenAss AI Commands & Shortcuts')}
${this.config.secondaryColor('═══════════════════════════════════════════════════════════════════════════')}

${chalk.white.bold('Slash Commands')} ${this.config.secondaryColor('(Type')} ${this.config.accentColor('/')} ${this.config.secondaryColor('to see dropdown suggestions)')}

${chalk.white.bold('Project:')}
  ${this.config.accentColor('/scan')}             Scan current project for asset needs
  ${this.config.accentColor('/status')}           Show project status and generated assets
  ${this.config.accentColor('/list')}             List files in current directory
  ${this.config.accentColor('/analyze')}          Analyze specific component file

${chalk.white.bold('Assets:')}
  ${this.config.accentColor('/generate')}         Generate assets from analysis
  ${this.config.accentColor('/logo')}             Generate a logo
  ${this.config.accentColor('/icon')}             Generate an icon set
  ${this.config.accentColor('/banner')}           Generate a banner image

${chalk.white.bold('System:')}
  ${this.config.accentColor('/help')} or ${this.config.accentColor('?')}       Show this help
  ${this.config.accentColor('/clear')}            Clear the screen
  ${this.config.accentColor('/exit')}             Exit GenAss

${chalk.white.bold('AI Conversation:')}
  Just type naturally without ${this.config.accentColor('/')} to chat with AI
  Examples:
    • "Scan my React app for missing logos"
    • "Generate a hero banner for the landing page"  
    • "What assets does my Header component need?"

${chalk.white.bold('Keyboard Shortcuts:')}
  ${this.config.secondaryColor('Ctrl+C')}           Exit GenAss
  ${this.config.secondaryColor('Ctrl+L')}           Clear screen
  ${this.config.secondaryColor('Tab')}              Auto-complete slash commands
  ${this.config.secondaryColor('Up/Down')}          Navigate command history

${this.config.secondaryColor('═══════════════════════════════════════════════════════════════════════════')}
`;
    console.log(help);
  }

  /**
   * Display AI response with formatting
   */
  public displayAIResponse(message: string, isStreaming: boolean = false): void {
    if (!isStreaming) {
      console.log();
    }
    
    const formatted = this.formatMessage(message);
    console.log(formatted);
    console.log();
  }

  /**
   * Display system message
   */
  public displaySystemMessage(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    let prefix = '';
    let colorFn = chalk.white;
    
    switch (type) {
      case 'success':
        prefix = this.config.successColor('✓');
        colorFn = this.config.successColor;
        break;
      case 'warning':
        prefix = chalk.yellow('⚠');
        colorFn = chalk.yellow;
        break;
      case 'error':
        prefix = this.config.errorColor('✗');
        colorFn = this.config.errorColor;
        break;
      case 'info':
        prefix = this.config.accentColor('ℹ');
        colorFn = this.config.secondaryColor;
        break;
    }
    
    console.log(`${prefix} ${colorFn(message)}`);
  }

  /**
   * Display tool execution status
   */
  public displayToolExecution(toolName: string, status: 'starting' | 'running' | 'completed' | 'failed', details?: string): void {
    const icon = status === 'completed' ? '✓' : status === 'failed' ? '✗' : '▶';
    const color = status === 'completed' ? this.config.successColor : status === 'failed' ? this.config.errorColor : this.config.accentColor;
    
    let message = `${color(icon)} Tool: ${chalk.white.bold(toolName)}`;
    if (details) {
      message += this.config.secondaryColor(` - ${details}`);
    }
    
    console.log(message);
  }

  /**
   * Display loading spinner
   */
  public showLoading(message: string): () => void {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    
    const interval = setInterval(() => {
      process.stdout.write(`\r${this.config.accentColor(frames[i])} ${this.config.secondaryColor(message)}`);
      i = (i + 1) % frames.length;
    }, 80);
    
    return () => {
      clearInterval(interval);
      process.stdout.write('\r' + ' '.repeat(message.length + 3) + '\r');
    };
  }

  /**
   * Display a formatted table
   */
  public displayTable(headers: string[], rows: string[][]): void {
    const colWidths = headers.map((header, i) => {
      const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
      return Math.max(header.length, maxRowWidth) + 2;
    });
    
    const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join('│');
    console.log(chalk.white.bold(headerRow));
    console.log(this.config.secondaryColor('─'.repeat(colWidths.reduce((a, b) => a + b, 0) + headers.length - 1)));
    
    rows.forEach(row => {
      const rowText = row.map((cell, i) => cell.padEnd(colWidths[i])).join('│');
      console.log(this.config.secondaryColor(rowText));
    });
    
    console.log();
  }

  /**
   * Update session context
   */
  public setSessionContext(context: SessionContext): void {
    this.sessionContext = context;
  }

  /**
   * Get AutoComplete instance
   */
  public getAutoComplete(): AutoComplete {
    return this.autoComplete;
  }

  /**
   * Clean up and close
   */
  public close(): void {
    this.rl.close();
  }

  // Private helper methods

  private setupKeyboardShortcuts(): void {
    this.rl.on('SIGINT', () => {
      console.log(this.config.secondaryColor('\n\nGoodbye! 👋\n'));
      process.exit(0);
    });

    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
    }
  }

  private formatElapsedTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  private formatMessage(message: string): string {
    message = message.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      return '\n' + this.config.secondaryColor('┌─────') + '\n' +
             chalk.gray(code.trim()) + '\n' +
             this.config.secondaryColor('└─────') + '\n';
    });
    
    message = message.replace(/`([^`]+)`/g, (_, code) => {
      return chalk.cyan(code);
    });
    
    message = message.replace(/\*\*([^*]+)\*\*/g, (_, text) => {
      return chalk.white.bold(text);
    });
    
    message = message.replace(/^[•\-\*] (.+)$/gm, (_, text) => {
      return this.config.accentColor('•') + ' ' + text;
    });
    
    return message;
  }
}
