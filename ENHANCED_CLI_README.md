# 🎨 GenAss Enhanced CLI Interface

## Overview

GenAss now features a **Gemini CLI-inspired interface** with a beautiful, interactive terminal UI that makes working with AI tools intuitive and enjoyable!

![GenAss Enhanced CLI](docs/cli-preview.png)

## Features

### ✨ Visual Enhancements

- **Beautiful Color Scheme**: Orange/cyan GenAss branding
- **Status Bar**: Real-time token count, cost tracking, and session time
- **Smart Prompt**: Clean, minimalist input prompt
- **Formatted Output**: Code blocks, tables, and styled responses
- **Loading Indicators**: Animated spinners for AI processing

### 🎯 User Experience

- **Quick Commands**: Built-in shortcuts for common tasks
- **Help System**: Comprehensive help with `?` or `help`
- **Command History**: Navigate with up/down arrows
- **Keyboard Shortcuts**: Ctrl+C to exit, Ctrl+L to clear
- **Error Handling**: Clear, color-coded error messages

### 🤖 AI Integration

- **Tool Execution Display**: See when AI uses tools in real-time
- **Context Awareness**: AI understands your project structure
- **Smart Suggestions**: Natural language commands
- **Session Tracking**: Monitor costs and token usage

## Quick Start

### Launch Enhanced Mode (Default)

```bash
# Just run genass - enhanced mode is default!
genass

# Or explicitly start chat mode
genass chat
```

### Classic Mode

```bash
# Use classic mode if you prefer
genass chat --classic
```

## Interface Overview

```
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║   GenAss - AI-Powered Asset Generation                                    ║
║   Intelligently analyze codebases and generate perfect visual assets      ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

GenAss is now an AI-powered, context-aware asset generation tool
that can intelligently analyze codebases and create
perfectly fitting visual assets! 🚀✨

Mode: Auto (Medium) - allow reversible commands  shift+tab cycles

Project: /Users/you/project
[0 tokens] ? for help
                                                            Sonnet 4.5

> ▊
```

## Quick Commands

### Built-in Commands

| Command | Description |
|---------|-------------|
| `scan` | Scan project for asset needs |
| `generate` | Generate assets from analysis |
| `status` | Show project status |
| `list` | List files in current directory |
| `analyze <path>` | Analyze specific component |
| `clear` | Clear the screen |
| `help` or `?` | Show help |
| `exit` or `quit` | Exit GenAss |

### AI Conversation Examples

Just talk naturally to the AI:

```
> Scan my React app for missing logos

> Generate a hero banner for the landing page

> What assets does my Header component need?

> Create icons for my navigation menu

> Read the Header.tsx file and tell me what assets it needs

> List all the files in the components directory
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Exit GenAss |
| `Ctrl+L` | Clear screen |
| `Up/Down` | Navigate command history |
| `Tab` | Auto-complete (when available) |
| `?` | Show help |

## Status Display

The status bar shows real-time information:

```
1.2k tokens • $0.0045 • 5m 23s
```

- **Tokens**: Total tokens used in session
- **Cost**: Accumulated cost (USD)
- **Time**: Session duration

## Tool Execution

When AI uses tools, you'll see:

```
▶ Tool: read_file
✓ Tool: read_file - Read 45 lines from Header.tsx
```

Status indicators:
- `▶` - Tool starting
- `✓` - Tool completed successfully
- `✗` - Tool failed

## Color Coding

- **Orange** (`#FF6B35`): Primary brand color (prompts, headers)
- **Cyan** (`#00D4FF`): Accents (commands, highlights)
- **Gray** (`#6C757D`): Secondary text (timestamps, status)
- **Green**: Success messages
- **Red**: Error messages
- **Yellow**: Warnings

## Configuration

### Customize Colors

Create `~/.genass/config.json`:

```json
{
  "ui": {
    "primaryColor": "#FF6B35",
    "accentColor": "#00D4FF",
    "showTokenCount": true,
    "showCostTracking": true
  }
}
```

### Environment Variables

```bash
# Set API key
export GEMINI_API_KEY="your-key-here"

# Set budget limit
export MONTHLY_BUDGET_LIMIT="10.0"
```

## Example Session

```bash
$ genass

╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║   GenAss - AI-Powered Asset Generation                                    ║
║   Intelligently analyze codebases and generate perfect visual assets      ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

GenAss is now an AI-powered, context-aware asset generation tool...

> scan

ℹ Scanning project...
✓ Listed 12 item(s).

src/
  components/
  assets/
  pages/
  ...

> What components need assets?

⠋ AI is thinking...

Based on my analysis, I found:

• Header.tsx - needs a logo (currently using placeholder.png)
• Hero.tsx - needs a banner image (1920x1080)
• Navigation.tsx - needs icon set (24x24px)

Would you like me to analyze these components in detail?

> Yes, analyze Header.tsx

⠋ AI is thinking...
▶ Tool: read_file
✓ Tool: read_file - Read 45 lines from Header.tsx

The Header component uses:
- A logo imported from './placeholder.png'
- Has a blue-to-purple gradient background  
- Logo height is 48px (h-12 class)
- Professional/corporate context

I can generate a perfect logo for this! Should I proceed?

> Yes, generate it

⠋ AI is processing...

[Asset generation flow continues...]
```

## Troubleshooting

### Colors Not Showing?

Your terminal might not support true color. Try:

```bash
# Check terminal capabilities
echo $TERM

# Use classic mode if colors don't work
genass chat --classic
```

### Keyboard Shortcuts Not Working?

Some terminals don't support all shortcuts. The following should always work:
- Type `exit` to quit
- Type `clear` to clear screen
- Type `help` for help

### Status Bar Misaligned?

Resize your terminal to at least 80 columns wide:

```bash
# Check terminal size
tput cols

# Should be >= 80
```

## Comparison: Enhanced vs Classic

| Feature | Enhanced | Classic |
|---------|----------|---------|
| Colored output | ✅ | Basic |
| Status bar | ✅ | ❌ |
| Tool visualization | ✅ | Text only |
| Help system | Interactive | Text |
| Loading indicators | Animated | Spinner |
| Tables | Formatted | Plain text |
| Code blocks | Styled | Plain |

## API Reference

### EnhancedCLI Class

```typescript
import { EnhancedCLI } from './ui/EnhancedCLI';

const cli = new EnhancedCLI({
  appName: 'GenAss',
  primaryColor: chalk.hex('#FF6B35'),
  showTokenCount: true,
});

// Display header
cli.displayHeader();

// Display welcome
cli.displayWelcome('/path/to/project', 'Auto');

// Prompt for input
const input = await cli.prompt();

// Display AI response
cli.displayAIResponse('Hello from AI!');

// Display system message
cli.displaySystemMessage('Success!', 'success');

// Display tool execution
cli.displayToolExecution('read_file', 'completed');

// Show loading
const stopLoading = cli.showLoading('Processing...');
// ... do work ...
stopLoading();

// Display table
cli.displayTable(
  ['Name', 'Value'],
  [['Tokens', '1000'], ['Cost', '$0.10']]
);
```

### EnhancedInteractiveSession Class

```typescript
import { EnhancedInteractiveSession } from './core/EnhancedInteractiveSession';

const session = new EnhancedInteractiveSession('/path/to/project');
await session.start();
```

## Integration with Existing Code

The enhanced CLI integrates seamlessly with:

- **ToolRegistry**: All AI tools work automatically
- **AIToolsIntegration**: Context-aware analysis
- **GenAssManager**: Asset generation workflows
- **CostTracker**: Real-time cost tracking

## Future Enhancements

Planned features:
- [ ] Auto-completion for commands
- [ ] Syntax highlighting for code blocks
- [ ] Interactive file browser
- [ ] Progress bars for long operations
- [ ] Command aliases
- [ ] Session history
- [ ] Multi-line input support
- [ ] Custom themes

## Contributing

Want to improve the CLI? Check out:
- `src/ui/EnhancedCLI.ts` - CLI interface
- `src/core/EnhancedInteractiveSession.ts` - Session management
- Color scheme constants in `EnhancedCLI.ts`

## License

MIT License - Copyright 2025 GenAss

---

**Enjoy the beautiful new interface! 🎨✨**

```
> Let's create amazing assets!
```
