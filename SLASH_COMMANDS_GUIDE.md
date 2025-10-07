# ⌨️ GenAss Slash Commands Guide

## Overview

GenAss now supports **Gemini CLI-style slash commands** with **automatic dropdown suggestions**!

## How It Works

### Type `/` for Instant Suggestions

When you type `/` in the GenAss prompt, an autocomplete dropdown automatically appears showing all available commands:

```
> /█

┌─ Select a command: ─────────────────────────────┐
│ /scan          Scan current project for assets  │
│ /status        Show project status              │
│ /list          List files in directory          │
│ /analyze       Analyze specific component       │
│ /generate      Generate assets from analysis    │
│ /logo          Generate a logo                  │
│ /icon          Generate an icon set             │
│ /banner        Generate a banner image          │
│ /help          Show help and commands           │
│ /clear         Clear the screen                 │
│ /exit          Exit GenAss                      │
└──────────────────────────────────────────────────┘
```

### Navigate with Arrows

- **Up/Down**: Move through suggestions
- **Enter**: Select command
- **Esc**: Cancel and continue typing
- **Tab**: Auto-complete (shows matching commands)

### Filter as You Type

Start typing after `/` to filter commands:

```
> /gen█

┌─ Select a command: ─────────────────────────────┐
│ /generate      Generate assets from analysis    │
└──────────────────────────────────────────────────┘
```

## Available Commands

### 📁 Project Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/scan` | Scan project for asset needs | `/scan` |
| `/status` | Show project status | `/status` |
| `/list` | List files in directory | `/list` |
| `/analyze` | Analyze specific component | `/analyze src/Header.tsx` |

### 🎨 Asset Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/generate` | Generate assets from analysis | `/generate` |
| `/logo` | Generate a logo | `/logo modern minimalist` |
| `/icon` | Generate icon set | `/icon navigation 24x24` |
| `/banner` | Generate banner image | `/banner hero 1920x1080` |
| `/background` | Generate background | `/background subtle pattern` |

### 🤖 AI Commands  

| Command | Description | Example |
|---------|-------------|---------|
| `/chat` | Switch to natural language mode | `/chat` |
| `/tools` | Show available AI tools | `/tools` |
| `/memory` | Show conversation memory | `/memory` |

### ⚙️ System Commands

| Command | Description | Aliases |
|---------|-------------|---------|
| `/help` | Show help | `/?` |
| `/clear` | Clear screen | `/cls` |
| `/exit` | Exit GenAss | `/quit`, `/q` |
| `/config` | Show configuration | - |

## Command Categories

Commands are color-coded by category:

- **🔵 Cyan**: Project commands
- **🟠 Orange**: Asset commands
- **🟣 Magenta**: AI commands
- **⚫ Gray**: System commands

## Natural Language vs Slash Commands

### When to Use Slash Commands

Use slash commands for:
- Quick, specific actions
- Navigating the tool
- System operations
- When you know exactly what you want

```
> /scan
> /generate logo
> /status
```

### When to Use Natural Language

Use natural language for:
- Complex requests
- When you're not sure which command to use
- Conversational interactions
- Asking questions

```
> What assets does my React app need?
> Generate a logo that matches my brand colors
> Show me all the components that use images
```

## Pro Tips

### 1. Quick Command Access

Just type `/` and immediately see all commands - no need to remember them!

### 2. Search Commands

Type part of what you're looking for:
```
> /gen → Shows /generate commands
> /log → Shows /logo command
```

### 3. Tab Completion

Press **Tab** to cycle through matching commands:
```
> /gen [Tab] → /generate
```

### 4. Command History

Use **Up/Down** arrows to navigate through previous commands (both slash and natural language).

### 5. Mix and Match

You can use both styles in the same session:
```
> /scan
✓ Project scanned

> What logos do I need?
AI analyzes and suggests...

> /generate logo
✓ Logo generated
```

## Examples

### Quick Project Scan

```
> /scan
ℹ Scanning project...
✓ Listed 12 item(s).
Found 3 components needing assets
```

### Analyze Component

```
> /analyze src/components/Header.tsx
ℹ Analyzing src/components/Header.tsx...

Component Type: Navigation
Usage Context: Primary header, branding
Style Info: blue-purple gradient, 48px height
Existing Assets: placeholder.png
```

### Generate Logo

```
> /logo

What style would you like?
1. Modern & Minimalist
2. Bold & Colorful
3. Classic & Professional

> 1

✓ Generating modern minimalist logo...
✓ Logo saved to src/assets/logo.png
```

### Check Status

```
> /status

Project Status
══════════════════════════════════════
Components Found    │ 15
Missing Assets      │ 5
Placeholders        │ 3
Session Duration    │ 5m 23s
Tokens Used         │ 1234
Total Cost          │ $0.0045
```

## Keyboard Shortcuts Summary

| Key | Action |
|-----|--------|
| `/` | Show command dropdown |
| `↑` `↓` | Navigate suggestions |
| `Enter` | Select command |
| `Tab` | Auto-complete |
| `Esc` | Cancel dropdown |
| `Ctrl+C` | Exit GenAss |
| `Ctrl+L` | Clear screen |
| `?` | Show help |

## Customizing Commands

### Add Your Own Commands

You can add custom slash commands programmatically:

```typescript
import { AutoComplete } from './ui/AutoComplete';

const autoComplete = new AutoComplete();

autoComplete.addCommand({
  name: '/deploy',
  description: 'Deploy generated assets',
  category: 'asset',
});
```

### Configuration

Customize autocomplete behavior in your config:

```json
{
  "ui": {
    "autoSuggestions": true,
    "maxSuggestions": 10,
    "showCategories": true
  }
}
```

## Troubleshooting

### Dropdown Not Appearing?

1. Make sure you're running the latest version:
   ```bash
   npm run build
   npm start
   ```

2. Check that your terminal supports interactive input:
   ```bash
   echo $TERM
   # Should show something like: xterm-256color
   ```

3. Try the classic mode if issues persist:
   ```bash
   genass chat --classic
   ```

### Commands Not Working?

- Slash commands must start with `/`
- No spaces before the `/`
- Press Enter after typing the command

### Autocomplete Slow?

The dropdown appears after typing `/`. If it's slow:
- Check terminal performance
- Reduce `maxSuggestions` in config
- Use Tab completion instead

## What's Next?

Upcoming slash command features:
- [ ] Command aliases (e.g., `/g` for `/generate`)
- [ ] Recent commands section
- [ ] Fuzzy search matching
- [ ] Multi-step command wizards
- [ ] Command templates
- [ ] Custom key bindings

## Feedback

The slash command system is designed to make GenAss faster and more intuitive. If you have ideas for new commands or improvements, let us know!

---

**Happy commanding! ⚡**

```
> /lets-create-amazing-assets
```
