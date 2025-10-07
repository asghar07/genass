# AI Tools Integration Guide

## Overview

GenAss now includes a powerful set of AI tools inspired by Google's Gemini CLI. These tools enable the AI to intelligently scan your codebase, understand asset usage context, and generate perfectly tailored images.

## What Makes This Special?

Unlike traditional asset generators, GenAss's AI tools:
1. **Understand Context** - Reads your component code to understand UI/UX requirements
2. **Smart Analysis** - Finds where images are used and what they represent
3. **Contextual Generation** - Creates images that fit your specific use case
4. **Seamless Integration** - Automatically updates your code with new assets

## Quick Start

### Basic Usage

```typescript
import { ToolRegistry } from './tools';

// Initialize with your workspace directory
const registry = new ToolRegistry(process.cwd());

// AI can now use these tools to analyze your project
const result = await registry.executeTool('search_file_content', {
  pattern: 'logo|icon',
  include: '*.tsx'
});
```

### Integration with Gemini AI

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ToolRegistry } from './tools';

const genAI = new GoogleGenerativeAI(apiKey);
const registry = new ToolRegistry(workspaceDir);

// Get tool declarations for Gemini
const tools = registry.getGeminiToolDeclarations();

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  tools: [{ functionDeclarations: tools }]
});

// AI can now use tools in conversations
const chat = model.startChat({
  history: [],
  tools: [{ functionDeclarations: tools }]
});

const result = await chat.sendMessage(
  'Analyze this React app and suggest what assets need to be generated'
);
```

## Tool Workflow for Asset Generation

### Step 1: Project Discovery
```typescript
// AI scans the project structure
await registry.executeTool('list_directory', {
  path: '/project/src/components'
});
```

### Step 2: Find Asset References
```typescript
// AI finds all image imports
await registry.executeTool('search_file_content', {
  pattern: "import.*\\.(png|jpg|svg)",
  include: "*.{tsx,jsx}"
});
```

### Step 3: Context Analysis
```typescript
// AI reads components to understand context
await registry.executeTool('read_file', {
  absolute_path: '/project/src/components/Header.tsx'
});
```

### Step 4: Generate Smart Prompts
Based on the context, AI generates specific prompts:
- For a Header component: "Professional navigation logo, minimalist design"
- For a Hero section: "Tech-themed hero banner, 1920x1080, modern aesthetic"
- For Icons: "Icon set matching design system, consistent style"

### Step 5: Write Generated Assets
```typescript
// AI saves the generated image
await registry.executeTool('write_file', {
  file_path: '/project/src/assets/generated-logo.png',
  content: imageBuffer
});
```

### Step 6: Update Code
```typescript
// AI updates imports automatically
await registry.executeTool('replace', {
  file_path: '/project/src/components/Header.tsx',
  old_string: "import logo from './placeholder.png'",
  new_string: "import logo from '../assets/generated-logo.png'"
});
```

## Real-World Example

Let's say you have a React app with this Header component:

```tsx
// src/components/Header.tsx
import logo from './placeholder.png'; // Missing proper logo

export function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600">
      <img src={logo} alt="Company Logo" className="h-12" />
      <nav>...</nav>
    </header>
  );
}
```

### AI's Analysis Process

1. **Scan**: Finds the Header component
2. **Read**: Analyzes the code context
3. **Understand**: 
   - It's a navigation header
   - Has a blue-to-purple gradient background
   - Logo should be 48px height (h-12 in Tailwind)
   - Professional/company branding needed
4. **Generate Prompt**: "Professional company logo, modern design, suitable for navigation header with blue-purple gradient background, 48px height, transparent background"
5. **Create Asset**: Uses Nano Banana to generate the perfect logo
6. **Integrate**: Updates the import and saves the file

## Advanced Features

### Custom Tool Creation

You can extend the tool registry with custom tools:

```typescript
import { BaseDeclarativeTool, BaseToolInvocation } from './tools/types';

class CustomAssetAnalyzerTool extends BaseDeclarativeTool<Params, Result> {
  // Your custom implementation
}

registry.register(new CustomAssetAnalyzerTool(workspaceDir));
```

### Error Handling

All tools return structured errors:

```typescript
const result = await registry.executeTool('read_file', {
  absolute_path: '/invalid/path.txt'
});

if (result.error) {
  console.error(`Error Type: ${result.error.type}`);
  console.error(`Message: ${result.error.message}`);
}
```

### Security

Tools enforce workspace boundaries:
- All paths must be absolute
- All paths must be within workspace
- Dangerous shell commands are blocked
- File operations respect permissions

## Integration with Existing GenAss Features

### With AssetAnalyzer
```typescript
import { AssetAnalyzer } from './core/AssetAnalyzer';
import { ToolRegistry } from './tools';

const analyzer = new AssetAnalyzer(projectPath);
const registry = new ToolRegistry(projectPath);

// AI uses tools to enhance analysis
const existingAssets = await analyzer.analyzeAssets();
const codeContext = await registry.executeTool('read_file', {
  absolute_path: componentPath
});

// Combine insights for better generation
```

### With NanoBananaGenerator
```typescript
import { NanoBananaGenerator } from './core/NanoBananaGenerator';
import { ToolRegistry } from './tools';

// AI analyzes context
const context = await registry.executeTool('search_file_content', {
  pattern: 'hero.*banner'
});

// Generate with smart prompt
const generator = new NanoBananaGenerator(config);
const image = await generator.generate({
  prompt: contextAwarePrompt, // Generated by AI based on context
  aspectRatio: '16:9'
});
```

### With InteractiveSession
```typescript
import { InteractiveSession } from './core/InteractiveSession';
import { ToolRegistry } from './tools';

const session = new InteractiveSession();
const registry = new ToolRegistry(projectPath);

// AI-powered interactive mode
session.addToolSupport(registry);
```

## Command Examples

### Analyze Project
```bash
genass analyze --with-ai
```

### Generate with Context
```bash
genass generate --component Header --use-context
```

### Interactive Mode with AI
```bash
genass interactive --ai-tools
```

## Best Practices

1. **Let AI Discover**: Don't hardcode asset paths, let AI find them
2. **Context is King**: More code context = better asset generation
3. **Iterate**: Use AI to refine prompts based on results
4. **Version Control**: AI can update code, so commit frequently
5. **Review**: Always review AI-generated changes before deploying

## Troubleshooting

### Tool Not Found
```typescript
const tool = registry.getTool('read_file');
if (!tool) {
  console.error('Tool not registered');
}
```

### Validation Errors
```typescript
try {
  const invocation = tool.build(params);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Execution Errors
```typescript
const result = await registry.executeTool('write_file', params, abortSignal);
if (result.error) {
  // Handle specific error types
  switch (result.error.type) {
    case ToolErrorType.PERMISSION_DENIED:
      // Handle permission issue
      break;
    case ToolErrorType.FILE_NOT_FOUND:
      // Handle missing file
      break;
  }
}
```

## What's Next?

Future enhancements planned:
- **Asset Usage Analyzer**: Specialized tool for analyzing image usage patterns
- **Smart Batch Generation**: Generate multiple related assets at once
- **Style Consistency**: Ensure all generated assets match your design system
- **A/B Testing**: Generate variants and let AI choose the best
- **Performance Optimization**: Automatic image optimization based on usage

## Resources

- [Tool API Reference](../src/tools/README.md)
- [Example Code](../examples/tools-integration-example.ts)
- [Gemini CLI Inspiration](https://github.com/google-gemini/gemini-cli)

---

**Ready to generate amazing assets?** The AI tools are now part of GenAss, making it smarter and more context-aware than ever before!
