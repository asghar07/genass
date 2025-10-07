/**
 * Auto-complete functionality for slash commands
 * Provides dropdown suggestions when user types /
 */

import inquirer from 'inquirer';
import inquirerAutocompletePrompt from 'inquirer-autocomplete-prompt';
import chalk from 'chalk';

// Register autocomplete prompt
inquirer.registerPrompt('autocomplete', inquirerAutocompletePrompt);

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  category?: 'project' | 'asset' | 'ai' | 'system';
}

export class AutoComplete {
  private commands: Command[] = [
    // Project Commands
    { name: '/scan', description: 'Scan current project for asset needs', category: 'project' },
    { name: '/status', description: 'Show project status and generated assets', category: 'project' },
    { name: '/list', description: 'List files in current directory', category: 'project' },
    { name: '/analyze', description: 'Analyze specific component file', category: 'project' },
    
    // Asset Commands
    { name: '/generate', description: 'Generate assets from analysis', category: 'asset' },
    { name: '/logo', description: 'Generate a logo', category: 'asset' },
    { name: '/icon', description: 'Generate an icon set', category: 'asset' },
    { name: '/banner', description: 'Generate a banner image', category: 'asset' },
    { name: '/background', description: 'Generate a background image', category: 'asset' },
    
    // AI Commands
    { name: '/chat', description: 'Switch to natural language chat mode', category: 'ai' },
    { name: '/tools', description: 'Show available AI tools', category: 'ai' },
    { name: '/memory', description: 'Show conversation memory', category: 'ai' },
    
    // System Commands
    { name: '/help', description: 'Show help and commands', aliases: ['/?'], category: 'system' },
    { name: '/clear', description: 'Clear the screen', aliases: ['/cls'], category: 'system' },
    { name: '/exit', description: 'Exit GenAss', aliases: ['/quit', '/q'], category: 'system' },
    { name: '/config', description: 'Show configuration', category: 'system' },
  ];

  private categoryColors: Record<string, typeof chalk> = {
    project: chalk.cyan,
    asset: chalk.hex('#FF6B35'),
    ai: chalk.magenta,
    system: chalk.gray,
  };

  /**
   * Search and filter commands based on input
   */
  public searchCommands(input: string): Command[] {
    const searchTerm = input.toLowerCase().replace(/^\//, '');
    
    if (!searchTerm) {
      return this.commands;
    }

    return this.commands.filter(cmd => {
      const nameMatch = cmd.name.toLowerCase().includes(searchTerm);
      const descMatch = cmd.description.toLowerCase().includes(searchTerm);
      const aliasMatch = cmd.aliases?.some(alias => 
        alias.toLowerCase().includes(searchTerm)
      );
      return nameMatch || descMatch || aliasMatch;
    });
  }

  /**
   * Format command for display in autocomplete
   */
  private formatCommand(cmd: Command): string {
    const color = this.categoryColors[cmd.category || 'system'];
    const name = color(cmd.name.padEnd(15));
    const desc = chalk.gray(cmd.description);
    return `${name} ${desc}`;
  }

  /**
   * Show autocomplete suggestions
   */
  public async showSuggestions(currentInput: string): Promise<string | null> {
    const matches = this.searchCommands(currentInput);

    if (matches.length === 0) {
      return null;
    }

    try {
      const answers = await inquirer.prompt([
        {
          type: 'autocomplete',
          name: 'command',
          message: chalk.gray('Select a command:'),
          source: async (_: any, input: string) => {
            const filtered = this.searchCommands(input || currentInput);
            return filtered.map(cmd => ({
              name: this.formatCommand(cmd),
              value: cmd.name,
              short: cmd.name,
            }));
          },
          pageSize: 10,
        },
      ]);

      return answers.command;
    } catch (error) {
      // User cancelled
      return null;
    }
  }

  /**
   * Get command by name
   */
  public getCommand(name: string): Command | undefined {
    return this.commands.find(cmd => 
      cmd.name === name || cmd.aliases?.includes(name)
    );
  }

  /**
   * Get all commands grouped by category
   */
  public getCommandsByCategory(): Record<string, Command[]> {
    const grouped: Record<string, Command[]> = {
      project: [],
      asset: [],
      ai: [],
      system: [],
    };

    this.commands.forEach(cmd => {
      const category = cmd.category || 'system';
      grouped[category].push(cmd);
    });

    return grouped;
  }

  /**
   * Add custom command
   */
  public addCommand(command: Command): void {
    this.commands.push(command);
  }

  /**
   * Display all commands in a formatted list
   */
  public displayAllCommands(): void {
    const grouped = this.getCommandsByCategory();

    console.log(chalk.white.bold('\nAvailable Commands:\n'));

    Object.entries(grouped).forEach(([category, commands]) => {
      if (commands.length === 0) return;

      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      const color = this.categoryColors[category];
      
      console.log(color.bold(`${categoryName} Commands:`));
      commands.forEach(cmd => {
        const aliases = cmd.aliases ? chalk.gray(` (${cmd.aliases.join(', ')})`) : '';
        console.log(`  ${color(cmd.name.padEnd(15))} ${chalk.gray(cmd.description)}${aliases}`);
      });
      console.log();
    });
  }

  /**
   * Get completion suggestions for current input
   */
  public getCompletions(line: string, callback: (err: any, result: [string[], string]) => void): void {
    const matches = this.searchCommands(line);
    const completions = matches.map(cmd => cmd.name);
    callback(null, [completions, line]);
  }
}
