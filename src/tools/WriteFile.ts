/**
 * @license
 * Copyright 2025 GenAss
 * SPDX-License-Identifier: MIT
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
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
 * Parameters for the WriteFile tool
 */
export interface WriteFileToolParams {
  /**
   * The absolute path to the file to write to
   */
  file_path: string;

  /**
   * The content to write to the file
   */
  content: string;
}

class WriteFileToolInvocation extends BaseToolInvocation<WriteFileToolParams, ToolResult> {
  constructor(
    private workspaceDir: string,
    params: WriteFileToolParams
  ) {
    super(params);
  }

  toolLocations(): ToolLocation[] {
    return [{ path: this.params.file_path }];
  }

  getDescription(): string {
    const relativePath = path.relative(this.workspaceDir, this.params.file_path);
    return `Writing to ${relativePath}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const { file_path, content } = this.params;
    let isNewFile = false;

    try {
      try {
        await fs.access(file_path);
      } catch {
        isNewFile = true;
      }

      const dirName = path.dirname(file_path);
      if (!fsSync.existsSync(dirName)) {
        await fs.mkdir(dirName, { recursive: true });
      }

      await fs.writeFile(file_path, content, 'utf-8');

      const lines = content.split('\n').length;
      const successMsg = isNewFile
        ? `Successfully created and wrote to new file: ${file_path}.`
        : `Successfully overwrote file: ${file_path}.`;

      return {
        llmContent: successMsg,
        returnDisplay: `${isNewFile ? 'Created' : 'Updated'} ${path.basename(file_path)} (${lines} lines)`,
      };
    } catch (error: any) {
      let errorMsg: string;
      let errorType = ToolErrorType.FILE_WRITE_FAILURE;

      if (error.code === 'EACCES') {
        errorMsg = `Permission denied writing to file: ${file_path}`;
        errorType = ToolErrorType.PERMISSION_DENIED;
      } else if (error.code === 'ENOSPC') {
        errorMsg = `No space left on device: ${file_path}`;
        errorType = ToolErrorType.NO_SPACE_LEFT;
      } else if (error.code === 'EISDIR') {
        errorMsg = `Target is a directory, not a file: ${file_path}`;
        errorType = ToolErrorType.TARGET_IS_DIRECTORY;
      } else {
        errorMsg = `Error writing to file '${file_path}': ${error.message}`;
      }

      return {
        llmContent: errorMsg,
        returnDisplay: errorMsg,
        error: {
          message: errorMsg,
          type: errorType,
        },
      };
    }
  }
}

/**
 * Implementation of the WriteFile tool
 */
export class WriteFileTool extends BaseDeclarativeTool<WriteFileToolParams, ToolResult> {
  static readonly Name: string = 'write_file';

  constructor(private workspaceDir: string) {
    super(
      WriteFileTool.Name,
      'WriteFile',
      `Writes content to a specified file in the local filesystem. Creates the file if it doesn't exist, or overwrites it if it does.`
    );
  }

  protected validateToolParamValues(params: WriteFileToolParams): string | null {
    const filePath = params.file_path;

    if (!filePath) {
      return `Missing or empty "file_path"`;
    }

    if (!path.isAbsolute(filePath)) {
      return `File path must be absolute: ${filePath}`;
    }

    const resolvedPath = path.resolve(filePath);
    const resolvedWorkspace = path.resolve(this.workspaceDir);

    if (resolvedPath !== resolvedWorkspace && !resolvedPath.startsWith(resolvedWorkspace + path.sep)) {
      return `File path must be within the workspace directory: ${this.workspaceDir}`;
    }

    try {
      if (fsSync.existsSync(filePath)) {
        const stats = fsSync.lstatSync(filePath);
        if (stats.isDirectory()) {
          return `Path is a directory, not a file: ${filePath}`;
        }
      }
    } catch (error: any) {
      return `Error accessing path: ${filePath}. Reason: ${error.message}`;
    }

    return null;
  }

  protected createInvocation(params: WriteFileToolParams): ToolInvocation<WriteFileToolParams, ToolResult> {
    return new WriteFileToolInvocation(this.workspaceDir, params);
  }
}
