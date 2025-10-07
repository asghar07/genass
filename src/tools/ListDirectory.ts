/**
 * @license
 * Copyright 2025 GenAss
 * SPDX-License-Identifier: MIT
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  type ToolInvocation,
  type ToolResult,
  ToolErrorType,
} from './types.js';

/**
 * Parameters for the LS tool
 */
export interface LSToolParams {
  /**
   * The absolute path to the directory to list
   */
  path: string;

  /**
   * Array of glob patterns to ignore (optional)
   */
  ignore?: string[];
}

/**
 * File entry returned by LS tool
 */
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

class LSToolInvocation extends BaseToolInvocation<LSToolParams, ToolResult> {
  constructor(
    private workspaceDir: string,
    params: LSToolParams
  ) {
    super(params);
  }

  private shouldIgnore(filename: string, patterns?: string[]): boolean {
    if (!patterns || patterns.length === 0) {
      return false;
    }
    for (const pattern of patterns) {
      const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(filename)) {
        return true;
      }
    }
    return false;
  }

  getDescription(): string {
    const relativePath = path.relative(this.workspaceDir, this.params.path);
    return `Listing ${relativePath || '.'}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const stats = await fs.stat(this.params.path);
      if (!stats.isDirectory()) {
        return {
          llmContent: `Error: Path is not a directory: ${this.params.path}`,
          returnDisplay: `Path is not a directory.`,
          error: {
            message: `Path is not a directory: ${this.params.path}`,
            type: ToolErrorType.PATH_IS_NOT_A_DIRECTORY,
          },
        };
      }

      const files = await fs.readdir(this.params.path);
      if (files.length === 0) {
        return {
          llmContent: `Directory ${this.params.path} is empty.`,
          returnDisplay: `Directory is empty.`,
        };
      }

      const entries: FileEntry[] = [];
      for (const file of files) {
        const fullPath = path.join(this.params.path, file);

        if (this.shouldIgnore(file, this.params.ignore)) {
          continue;
        }

        try {
          const fileStats = await fs.stat(fullPath);
          const isDir = fileStats.isDirectory();
          entries.push({
            name: file,
            path: fullPath,
            isDirectory: isDir,
            size: isDir ? 0 : fileStats.size,
            modifiedTime: fileStats.mtime,
          });
        } catch (error) {
          console.error(`Error accessing ${fullPath}: ${error}`);
        }
      }

      entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      const directoryContent = entries
        .map((entry) => `${entry.isDirectory ? '[DIR] ' : ''}${entry.name}`)
        .join('\n');

      const resultMessage = `Directory listing for ${this.params.path}:\n${directoryContent}`;
      const displayMessage = `Listed ${entries.length} item(s).`;

      return {
        llmContent: resultMessage,
        returnDisplay: displayMessage,
      };
    } catch (error: any) {
      const errorMsg = `Error listing directory: ${error.message}`;
      return {
        llmContent: errorMsg,
        returnDisplay: 'Failed to list directory.',
        error: {
          message: errorMsg,
          type: error.code === 'ENOENT' ? ToolErrorType.DIRECTORY_NOT_FOUND : ToolErrorType.LS_EXECUTION_ERROR,
        },
      };
    }
  }
}

/**
 * Implementation of the LS tool
 */
export class LSTool extends BaseDeclarativeTool<LSToolParams, ToolResult> {
  static readonly Name = 'list_directory';

  constructor(private workspaceDir: string) {
    super(
      LSTool.Name,
      'ListDirectory',
      'Lists the names of files and subdirectories directly within a specified directory path. Can optionally ignore entries matching provided glob patterns.'
    );
  }

  protected validateToolParamValues(params: LSToolParams): string | null {
    if (!path.isAbsolute(params.path)) {
      return `Path must be absolute: ${params.path}`;
    }

    const resolvedPath = path.resolve(params.path);
    const resolvedWorkspace = path.resolve(this.workspaceDir);

    // Allow exact workspace directory OR paths within it
    if (resolvedPath === resolvedWorkspace || resolvedPath.startsWith(resolvedWorkspace + path.sep)) {
      return null;
    }

    return `Path must be within the workspace directory: ${this.workspaceDir}`;
  }

  protected createInvocation(params: LSToolParams): ToolInvocation<LSToolParams, ToolResult> {
    return new LSToolInvocation(this.workspaceDir, params);
  }
}
