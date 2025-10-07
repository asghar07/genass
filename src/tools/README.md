# GenAss AI Tools

This directory contains AI-powered tools that enable intelligent codebase analysis and asset generation. These tools are inspired by Google's Gemini CLI and designed specifically for GenAss's asset generation workflow.

## Overview

GenAss uses these tools to:
1. **Scan codebases** - Understand project structure and locate asset usage
2. **Analyze context** - Read source files to understand where and how assets are used
3. **Generate smart prompts** - Create contextually appropriate image generation prompts
4. **Manage assets** - Write and organize generated assets in the correct locations

## Available Tools

### 1. ReadFile (`read_file`)
Reads and returns the content of a specified file with optional pagination.

**Parameters:**
- `absolute_path` (required): The absolute path to the file
- `offset` (optional): Line number to start reading from
- `limit` (optional): Number of lines to read

**Use Case in GenAss:**
- Read component files to understand asset context
- Analyze how images are imported and used
- Extract UI/UX context for better image generation

**Example:**
```typescript
const result = await registry.executeTool('read_file', {
  absolute_path: '/path/to/project/src/components/Header.tsx',
  offset: 0,
  limit: 50
});
```

### 2. WriteFile (`write_file`)
Writes content to a specified file, creating it if it doesn't exist.

**Parameters:**
- `file_path` (required): The absolute path to the file
- `content` (required): The content to write

**Use Case in GenAss:**
- Save generated images to the correct location
- Create asset manifest files
- Update configuration files with new asset paths

**Example:**
```typescript
const result = await registry.executeTool('write_file', {
  file_path: '/path/to/project/assets/logo.png',
  content: imageBuffer
});
```

### 3. EditFile (`replace`)
Replaces specific text within a file with surgical precision.

**Parameters:**
- `file_path` (required): The absolute path to the file
- `old_string` (required): The exact text to replace
- `new_string` (required): The replacement text
- `expected_replacements` (optional): Number of expected replacements (default: 1)

**Use Case in GenAss:**
- Update import statements with new asset paths
- Inject generated assets into code
- Modify configuration files

**Example:**
```typescript
const result = await registry.executeTool('replace', {
  file_path: '/path/to/project/src/components/Header.tsx',
  old_string: "import logo from './old-logo.png'",
  new_string: "import logo from './generated-logo.png'"
});
```

### 4. ListDirectory (`list_directory`)
Lists files and directories within a specified path.

**Parameters:**
- `path` (required): The absolute path to the directory
- `ignore` (optional): Array of glob patterns to ignore

**Use Case in GenAss:**
- Discover existing assets in the project
- Scan component directories for asset usage
- Build project structure understanding

**Example:**
```typescript
const result = await registry.executeTool('list_directory', {
  path: '/path/to/project/src/assets',
  ignore: ['*.map', 'node_modules']
});
```

### 5. SearchFileContent (`search_file_content`)
Searches for regex patterns within file contents across the project.

**Parameters:**
- `pattern` (required): Regular expression pattern to search for
- `path` (optional): Directory to search in (defaults to workspace root)
- `include` (optional): File pattern filter (e.g., "*.tsx")

**Use Case in GenAss:**
- Find all image imports across the codebase
- Locate asset references in components
- Identify screens/pages that need assets

**Example:**
```typescript
const result = await registry.executeTool('search_file_content', {
  pattern: "import.*from.*['\"].*\\.(png|jpg|svg)['\"]",
  include: "*.{tsx,jsx,ts,js}"
});
```

### 6. RunShellCommand (`run_shell_command`)
Executes shell commands in the workspace directory.

**Parameters:**
- `command` (required): The shell command to execute
- `description` (optional): Brief description of the command
- `directory` (optional): Specific directory to run the command in

**Use Case in GenAss:**
- Run image optimization tools (e.g., imagemin, sharp)
- Execute build scripts after asset generation
- Install required dependencies

**Example:**
```typescript
const result = await registry.executeTool('run_shell_command', {
  command: 'npm run optimize:images',
  description: 'Optimize generated images'
});
```

## Architecture

### Tool Registry
The `ToolRegistry` class manages all available tools and provides:
- Tool registration and discovery
- Parameter validation
- Execution management
- Gemini API integration

### Base Classes
- `BaseToolInvocation`: Base class for tool implementations
- `BaseDeclarativeTool`: Base class for tool builders
- Type-safe parameter and result handling

### Error Handling
All tools return a standardized `ToolResult` with:
- `llmContent`: Detailed information for the AI
- `returnDisplay`: User-friendly display message
- `error`: Optional error details with type classification

## Integration with Gemini AI

### Tool Declarations
Tools are automatically converted to Gemini function declarations:

```typescript
const registry = new ToolRegistry('/workspace/path');
const declarations = registry.getGeminiToolDeclarations();
// Use declarations in Gemini API calls
```

### Execution Flow
1. AI decides which tool to use based on context
2. AI provides parameters in JSON format
3. Tool validates parameters
4. Tool executes and returns structured results
5. AI uses results to make next decision

## Security

All tools implement workspace boundary validation:
- Paths must be absolute
- Paths must be within the workspace directory
- Shell commands are validated for dangerous patterns
- File operations respect system permissions

## GenAss Workflow Example

Here's how GenAss uses these tools to generate assets:

```typescript
// 1. Discover project structure
await registry.executeTool('list_directory', {
  path: '/project/src/components'
});

// 2. Find image references
await registry.executeTool('search_file_content', {
  pattern: 'logo|icon|banner',
  include: '*.{tsx,jsx}'
});

// 3. Read component for context
await registry.executeTool('read_file', {
  absolute_path: '/project/src/components/Header.tsx'
});

// 4. Generate image (AI decides prompt based on context)
// ... image generation logic ...

// 5. Write generated asset
await registry.executeTool('write_file', {
  file_path: '/project/src/assets/generated-logo.png',
  content: imageBuffer
});

// 6. Update component with new asset
await registry.executeTool('replace', {
  file_path: '/project/src/components/Header.tsx',
  old_string: "import logo from './placeholder.png'",
  new_string: "import logo from '../assets/generated-logo.png'"
});
```

## Future Enhancements

Potential additional tools for GenAss:
- `analyze_image_usage`: Specialized tool to parse image imports and usage
- `generate_asset_manifest`: Create comprehensive asset inventory
- `optimize_asset`: Run image optimization automatically
- `validate_asset_paths`: Check that all asset references are valid
- `suggest_improvements`: Analyze existing assets and suggest regeneration

## License

MIT License - Copyright 2025 GenAss
