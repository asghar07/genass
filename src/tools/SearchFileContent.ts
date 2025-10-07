/**
 * @license
 * Copyright 2025 GenAss
 * SPDX-License-Identifier: MIT
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  type ToolInvocation,
  type ToolResult,
  ToolErrorType,
} from './types.js';

/**
 * Parameters for the SearchTool
 */
export interface SearchToolParams {
  /**
   * The regular expression pattern to search for in file contents
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to workspace root)
   */
  path?: string;

  /**
   * File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")
   */
  include?: string;
}

/**
 * Result object for a single grep match
 */
interface SearchMatch {
  filePath: string;
  lineNumber: number;
  line: string;
}

class SearchToolInvocation extends BaseToolInvocation<SearchToolParams, ToolResult> {
  constructor(
    private workspaceDir: string,
    params: SearchToolParams
  ) {
    super(params);
  }

  getDescription(): string {
    let description = `'${this.params.pattern}'`;
    if (this.params.include) {
      description += ` in ${this.params.include}`;
    }
    if (this.params.path) {
      const relativePath = path.relative(this.workspaceDir, this.params.path);
      description += ` within ${relativePath || '.'}`;
    }
    return description;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    try {
      const searchDir = this.params.path || this.workspaceDir;
      const globPattern = this.params.include || '**/*';

      const files = await glob(globPattern, {
        cwd: searchDir,
        dot: true,
        absolute: true,
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
      });

      if (signal.aborted) {
        throw new Error('Search was aborted');
      }

      const regex = new RegExp(this.params.pattern, 'i');
      const allMatches: SearchMatch[] = [];

      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split(/\r?\n/);
          lines.forEach((line, index) => {
            if (regex.test(line)) {
              allMatches.push({
                filePath: path.relative(searchDir, filePath),
                lineNumber: index + 1,
                line,
              });
            }
          });
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      const searchLocationDescription = this.params.path
        ? `in path "${path.relative(this.workspaceDir, this.params.path)}"`
        : 'in workspace';

      if (allMatches.length === 0) {
        const noMatchMsg = `No matches found for pattern "${this.params.pattern}" ${searchLocationDescription}${this.params.include ? ` (filter: "${this.params.include}")` : ''}.`;
        return { llmContent: noMatchMsg, returnDisplay: `No matches found` };
      }

      const matchesByFile = allMatches.reduce((acc, match) => {
        if (!acc[match.filePath]) {
          acc[match.filePath] = [];
        }
        acc[match.filePath].push(match);
        acc[match.filePath].sort((a, b) => a.lineNumber - b.lineNumber);
        return acc;
      }, {} as Record<string, SearchMatch[]>);

      const matchCount = allMatches.length;
      const matchTerm = matchCount === 1 ? 'match' : 'matches';

      let llmContent = `Found ${matchCount} ${matchTerm} for pattern "${this.params.pattern}" ${searchLocationDescription}${this.params.include ? ` (filter: "${this.params.include}")` : ''}:
---
`;

      for (const filePath in matchesByFile) {
        llmContent += `File: ${filePath}\n`;
        matchesByFile[filePath].forEach((match) => {
          const trimmedLine = match.line.trim();
          llmContent += `L${match.lineNumber}: ${trimmedLine}\n`;
        });
        llmContent += '---\n';
      }

      return {
        llmContent: llmContent.trim(),
        returnDisplay: `Found ${matchCount} ${matchTerm}`,
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      return {
        llmContent: `Error during search operation: ${errorMessage}`,
        returnDisplay: `Error: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.GREP_EXECUTION_ERROR,
        },
      };
    }
  }
}

/**
 * Implementation of the Search tool
 */
export class SearchTool extends BaseDeclarativeTool<SearchToolParams, ToolResult> {
  static readonly Name = 'search_file_content';

  constructor(private workspaceDir: string) {
    super(
      SearchTool.Name,
      'SearchFileContent',
      'Searches for a regular expression pattern within the content of files in a specified directory (or workspace root). Can filter files by a glob pattern. Returns the lines containing matches, along with their file paths and line numbers.'
    );
  }

  protected validateToolParamValues(params: SearchToolParams): string | null {
    try {
      new RegExp(params.pattern);
    } catch (error: any) {
      return `Invalid regular expression pattern: ${params.pattern}. Error: ${error.message}`;
    }

    if (params.path) {
      if (!path.isAbsolute(params.path)) {
        return `Path must be absolute: ${params.path}`;
      }

      const resolvedPath = path.resolve(params.path);
      const resolvedWorkspace = path.resolve(this.workspaceDir);

      if (resolvedPath !== resolvedWorkspace && !resolvedPath.startsWith(resolvedWorkspace + path.sep)) {
        return `Path must be within the workspace directory: ${this.workspaceDir}`;
      }
    }

    return null;
  }

  protected createInvocation(params: SearchToolParams): ToolInvocation<SearchToolParams, ToolResult> {
    return new SearchToolInvocation(this.workspaceDir, params);
  }
}
