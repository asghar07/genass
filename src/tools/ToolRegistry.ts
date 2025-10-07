/**
 * @license
 * Copyright 2025 GenAss
 * SPDX-License-Identifier: MIT
 */

import { ReadFileTool } from './ReadFile.js';
import { WriteFileTool } from './WriteFile.js';
import { EditTool } from './EditFile.js';
import { LSTool } from './ListDirectory.js';
import { SearchTool } from './SearchFileContent.js';
import { ShellTool } from './RunShellCommand.js';
import type { ToolBuilder, ToolResult } from './types.js';

/**
 * Central registry for all AI tools
 */
export class ToolRegistry {
  private tools: Map<string, ToolBuilder<any, ToolResult>> = new Map();
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.registerDefaultTools();
  }

  /**
   * Register all default tools
   */
  private registerDefaultTools(): void {
    this.register(new ReadFileTool(this.workspaceDir));
    this.register(new WriteFileTool(this.workspaceDir));
    this.register(new EditTool(this.workspaceDir));
    this.register(new LSTool(this.workspaceDir));
    this.register(new SearchTool(this.workspaceDir));
    this.register(new ShellTool(this.workspaceDir));
  }

  /**
   * Register a tool
   */
  register(tool: ToolBuilder<any, ToolResult>): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): ToolBuilder<any, ToolResult> | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolBuilder<any, ToolResult>[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool by name with parameters
   */
  async executeTool(
    name: string,
    params: any,
    signal: AbortSignal = new AbortController().signal
  ): Promise<ToolResult> {
    const tool = this.getTool(name);
    if (!tool) {
      return {
        llmContent: `Tool '${name}' not found`,
        returnDisplay: `Tool '${name}' not found`,
        error: {
          message: `Tool '${name}' not found`,
          type: 'TOOL_NOT_FOUND' as any,
        },
      };
    }

    try {
      const invocation = tool.build(params);
      return await invocation.execute(signal);
    } catch (error: any) {
      return {
        llmContent: `Error executing tool '${name}': ${error.message}`,
        returnDisplay: `Error: ${error.message}`,
        error: {
          message: error.message,
          type: 'TOOL_EXECUTION_ERROR' as any,
        },
      };
    }
  }

  /**
   * Get tool descriptions for AI context
   */
  getToolDescriptions(): string {
    const descriptions: string[] = [];
    for (const tool of this.getAllTools()) {
      descriptions.push(`
Tool: ${tool.name}
Display Name: ${tool.displayName}
Description: ${tool.description}
---`);
    }
    return descriptions.join('\n');
  }

  /**
   * Generate tool declarations for Gemini API
   */
  getGeminiToolDeclarations(): any[] {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: this.inferParametersSchema(tool),
    }));
  }

  /**
   * Infer parameter schema from tool (basic implementation)
   */
  private inferParametersSchema(tool: ToolBuilder<any, ToolResult>): any {
    // Return a basic schema - tools should ideally provide their own schema
    const schemas: Record<string, any> = {
      [ReadFileTool.Name]: {
        type: 'object',
        properties: {
          absolute_path: {
            type: 'string',
            description: 'The absolute path to the file to read',
          },
          offset: {
            type: 'number',
            description: 'The line number to start reading from (optional)',
          },
          limit: {
            type: 'number',
            description: 'The number of lines to read (optional)',
          },
        },
        required: ['absolute_path'],
      },
      [WriteFileTool.Name]: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The absolute path to the file to write to',
          },
          content: {
            type: 'string',
            description: 'The content to write to the file',
          },
        },
        required: ['file_path', 'content'],
      },
      [EditTool.Name]: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The absolute path to the file to modify',
          },
          old_string: {
            type: 'string',
            description: 'The text to replace',
          },
          new_string: {
            type: 'string',
            description: 'The text to replace it with',
          },
          expected_replacements: {
            type: 'number',
            description: 'Number of replacements expected (defaults to 1)',
          },
        },
        required: ['file_path', 'old_string', 'new_string'],
      },
      [LSTool.Name]: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The absolute path to the directory to list',
          },
          ignore: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of glob patterns to ignore (optional)',
          },
        },
        required: ['path'],
      },
      [SearchTool.Name]: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'The regular expression pattern to search for',
          },
          path: {
            type: 'string',
            description: 'The directory to search in (optional)',
          },
          include: {
            type: 'string',
            description: 'File pattern to include (e.g., "*.js")',
          },
        },
        required: ['pattern'],
      },
      [ShellTool.Name]: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
          description: {
            type: 'string',
            description: 'Brief description of what the command does',
          },
          directory: {
            type: 'string',
            description: 'The absolute path of the directory to run the command in (optional)',
          },
        },
        required: ['command'],
      },
    };

    return schemas[tool.name] || {
      type: 'object',
      properties: {},
    };
  }
}
