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
  type ToolLocation,
  ToolErrorType,
} from './types.js';

/**
 * Parameters for the ReadFile tool
 */
export interface ReadFileToolParams {
  /**
   * The absolute path to the file to read
   */
  absolute_path: string;

  /**
   * The line number to start reading from (optional)
   */
  offset?: number;

  /**
   * The number of lines to read (optional)
   */
  limit?: number;
}

class ReadFileToolInvocation extends BaseToolInvocation<ReadFileToolParams, ToolResult> {
  constructor(
    private workspaceDir: string,
    params: ReadFileToolParams
  ) {
    super(params);
  }

  getDescription(): string {
    const relativePath = path.relative(this.workspaceDir, this.params.absolute_path);
    return `Reading ${relativePath}`;
  }

  toolLocations(): ToolLocation[] {
    return [{ path: this.params.absolute_path, line: this.params.offset }];
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const content = await fs.readFile(this.params.absolute_path, 'utf-8');
      const lines = content.split('\n');

      let resultLines = lines;
      let isTruncated = false;
      let start = 1;
      let end = lines.length;

      if (this.params.offset !== undefined || this.params.limit !== undefined) {
        const offset = this.params.offset || 0;
        const limit = this.params.limit || lines.length;
        resultLines = lines.slice(offset, offset + limit);
        start = offset + 1;
        end = offset + resultLines.length;
        isTruncated = end < lines.length;
      }

      const resultContent = resultLines.join('\n');
      let llmContent: string;

      if (isTruncated) {
        const nextOffset = end;
        llmContent = `
IMPORTANT: The file content has been truncated.
Status: Showing lines ${start}-${end} of ${lines.length} total lines.
Action: To read more of the file, use offset: ${nextOffset}.

--- FILE CONTENT (truncated) ---
${resultContent}`;
      } else {
        llmContent = resultContent;
      }

      return {
        llmContent,
        returnDisplay: `Read ${resultLines.length} lines from ${path.basename(this.params.absolute_path)}`,
      };
    } catch (error: any) {
      const errorMsg = `Error reading file '${this.params.absolute_path}': ${error.message}`;
      return {
        llmContent: errorMsg,
        returnDisplay: errorMsg,
        error: {
          message: errorMsg,
          type: error.code === 'ENOENT' ? ToolErrorType.FILE_NOT_FOUND : ToolErrorType.FILE_READ_FAILURE,
        },
      };
    }
  }
}

/**
 * Implementation of the ReadFile tool
 */
export class ReadFileTool extends BaseDeclarativeTool<ReadFileToolParams, ToolResult> {
  static readonly Name: string = 'read_file';

  constructor(private workspaceDir: string) {
    super(
      ReadFileTool.Name,
      'ReadFile',
      `Reads and returns the content of a specified file. If the file is large, the content can be paginated using 'offset' and 'limit' parameters. Handles text files and can read specific line ranges.`
    );
  }

  protected validateToolParamValues(params: ReadFileToolParams): string | null {
    if (!params.absolute_path || params.absolute_path.trim() === '') {
      return "The 'absolute_path' parameter must be non-empty.";
    }

    if (!path.isAbsolute(params.absolute_path)) {
      return `File path must be absolute, but was relative: ${params.absolute_path}. You must provide an absolute path.`;
    }

    const resolvedPath = path.resolve(params.absolute_path);
    const resolvedWorkspace = path.resolve(this.workspaceDir);

    if (resolvedPath !== resolvedWorkspace && !resolvedPath.startsWith(resolvedWorkspace + path.sep)) {
      return `File path must be within the workspace directory: ${this.workspaceDir}`;
    }

    if (params.offset !== undefined && params.offset < 0) {
      return 'Offset must be a non-negative number';
    }

    if (params.limit !== undefined && params.limit <= 0) {
      return 'Limit must be a positive number';
    }

    return null;
  }

  protected createInvocation(params: ReadFileToolParams): ToolInvocation<ReadFileToolParams, ToolResult> {
    return new ReadFileToolInvocation(this.workspaceDir, params);
  }
}
