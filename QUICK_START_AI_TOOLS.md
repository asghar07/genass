# 🚀 Quick Start: GenAss AI Tools

## What You Just Got

GenAss now has **AI superpowers**! Your asset generator can now:
- 🔍 **Analyze your codebase** automatically
- 🧠 **Understand context** from your components
- 🎨 **Generate perfect prompts** based on usage
- ✨ **Create contextual assets** that fit perfectly
- 🔄 **Update your code** automatically

## 5-Minute Quick Start

### 1. Try the Simple Demo

```bash
cd /Users/asghar/Documents/Software/Development/genass
npm run build
node dist/examples/complete-workflow-example.js /path/to/your/project simple
```

This will analyze your project and show what GenAss can do!

### 2. Use in Your Code

```typescript
import { AIToolsIntegration } from './src/core/AIToolsIntegration';

// Initialize
const ai = new AIToolsIntegration('/path/to/project');

// Analyze a component
const context = await ai.analyzeComponent('./src/components/Header.tsx');

// Generate smart prompt
const prompt = await ai.generateSmartPrompt('./src/components/Header.tsx', 'logo');

console.log(prompt.prompt); // "Professional company logo, modern gradient design..."
```

### 3. See It In Action

```bash
# Interactive demo
node dist/examples/complete-workflow-example.js /path/to/project interactive

# Complete workflow (needs API key)
export GEMINI_API_KEY="your-key-here"
node dist/examples/complete-workflow-example.js /path/to/project complete
```

## Real Example

Let's say you have this component:

```tsx
// src/components/Header.tsx
import logo from './placeholder.png'; // 😢 Placeholder

export function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600">
      <img src={logo} alt="Logo" className="h-12" />
    </header>
  );
}
```

**GenAss AI sees:**
- Navigation header component
- Blue-to-purple gradient background
- 48px height logo needed
- Professional branding context

**GenAss generates:**
- **Smart Prompt**: "Professional company logo, modern design, suitable for navigation header with blue-purple gradient background, 48px height, transparent background, minimalist, clean, vector-style"
- **Perfect Asset**: Context-aware logo that looks amazing
- **Updated Code**: Automatically replaces placeholder import

## Available Tools

### For AI Integration

```typescript
import { ToolRegistry } from './tools';

const registry = new ToolRegistry(workspaceDir);

// Search for patterns
await registry.executeTool('search_file_content', {
  pattern: 'logo|icon',
  include: '*.tsx'
});

// Read files
await registry.executeTool('read_file', {
  absolute_path: '/path/to/file.tsx'
});

// Update code
await registry.executeTool('replace', {
  file_path: '/path/to/file.tsx',
  old_string: 'old import',
  new_string: 'new import'
});
```

### For Smart Analysis

```typescript
import { AIToolsIntegration } from './core/AIToolsIntegration';

const ai = new AIToolsIntegration(workspaceDir);

// Find all assets that need generation
const analysis = await ai.analyzeProjectAssets();

// Analyze specific component
const context = await ai.analyzeComponent(componentPath);

// Generate context-aware prompt
const prompt = await ai.generateSmartPrompt(componentPath, 'logo');
```

## Integration with Gemini AI

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ToolRegistry } from './tools';

const genAI = new GoogleGenerativeAI(apiKey);
const registry = new ToolRegistry(workspaceDir);

// Get tool declarations
const tools = registry.getGeminiToolDeclarations();

// Create AI model with tools
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  tools: [{ functionDeclarations: tools }]
});

// AI can now use tools automatically!
const chat = model.startChat({
  history: [],
  tools: [{ functionDeclarations: tools }]
});

await chat.sendMessage('Analyze this project and generate missing assets');
```

## What's Different?

### Before (Traditional)
```
User → "Generate a logo" → Generic prompt → Generic logo → Manual integration
```

### After (AI-Powered)
```
AI → Analyzes code → Understands context → Smart prompt → Perfect logo → Auto integration
```

## File Structure

Your project now has:

```
genass/
├── src/
│   ├── tools/              # 🆕 AI Tools System
│   │   ├── types.ts        # Core types
│   │   ├── ReadFile.ts     # File reading
│   │   ├── WriteFile.ts    # File writing
│   │   ├── EditFile.ts     # File editing
│   │   ├── ListDirectory.ts # Directory listing
│   │   ├── SearchFileContent.ts # Content search
│   │   ├── RunShellCommand.ts # Shell execution
│   │   ├── ToolRegistry.ts # Central registry
│   │   ├── index.ts        # Public API
│   │   └── README.md       # Tool docs
│   │
│   └── core/
│       └── AIToolsIntegration.ts # 🆕 Smart integration
│
├── docs/
│   └── AI_TOOLS_INTEGRATION.md # 🆕 Integration guide
│
├── examples/
│   ├── tools-integration-example.ts # 🆕 Basic examples
│   └── complete-workflow-example.ts # 🆕 Full workflow
│
├── TOOLS_IMPLEMENTATION_SUMMARY.md # 🆕 Implementation details
└── QUICK_START_AI_TOOLS.md # 🆕 This file!
```

## Next Steps

### 1. Test Basic Functionality
```bash
npm run build
node dist/examples/complete-workflow-example.js . simple
```

### 2. Try It On Your Projects
```bash
node dist/examples/complete-workflow-example.js /path/to/your/react/app simple
```

### 3. Integrate with Your Workflow
- Add to `GenAssManager`
- Use in `InteractiveSession`
- Connect with `NanoBananaGenerator`

### 4. Customize
- Add custom tools in `src/tools/`
- Enhance `AIToolsIntegration` for your needs
- Create project-specific analyzers

## Examples

### Find All Placeholders
```typescript
const ai = new AIToolsIntegration(projectPath);
const analysis = await ai.analyzeProjectAssets();
console.log(`Found ${analysis.placeholders.length} placeholders to replace`);
```

### Generate Logo for Header
```typescript
const prompt = await ai.generateSmartPrompt('./src/Header.tsx', 'logo');
// Use prompt with NanoBananaGenerator
```

### Update All Asset References
```typescript
await ai.updateAssetImports('./old-logo.png', './new-logo.png');
```

## Documentation

- 📖 **Tool Reference**: `src/tools/README.md`
- 🔧 **Integration Guide**: `docs/AI_TOOLS_INTEGRATION.md`
- 📝 **Implementation**: `TOOLS_IMPLEMENTATION_SUMMARY.md`
- 💡 **Examples**: `examples/` directory

## Support

The tools are production-ready and tested! 

- ✅ TypeScript with strict types
- ✅ Comprehensive error handling
- ✅ Security validation
- ✅ Gemini API compatible
- ✅ Workspace boundary protection

## What's Awesome?

1. **Context-Aware**: Understands your code, not just keywords
2. **Automatic**: Scans, analyzes, generates, integrates - all automatic
3. **Smart**: Learns from your styling, layout, and usage patterns
4. **Safe**: Validates everything, stays within workspace bounds
5. **Powerful**: 6 tools + smart integration = unlimited possibilities

---

## 🎉 You're Ready!

Your GenAss is now **AI-powered** and ready to generate contextually perfect assets!

```bash
# Try it now!
npm run build && node dist/examples/complete-workflow-example.js . simple
```

**Enjoy creating amazing assets! 🚀✨**
