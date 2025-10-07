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
 * Parameters for the Edit tool
 */
export interface EditToolParams {
  /**
   * The absolute path to the file to modify
   */
  file_path: string;

  /**
   * The text to replace
   */
  old_string: string;

  /**
   * The text to replace it with
   */
  new_string: string;

  /**
   * Number of replacements expected. Defaults to 1 if not specified.
   */
  expected_replacements?: number;
}

function applyReplacement(
  currentContent: string | null,
  oldString: string,
  newString: string,
  isNewFile: boolean
): string {
  if (isNewFile) {
    return newString;
  }
  if (currentContent === null) {
    return oldString === '' ? newString : '';
  }
  if (oldString === '' && !isNewFile) {
    return currentContent;
  }

  // Simple replacement - count and replace
  const parts = currentContent.split(oldString);
  return parts.join(newString);
}

class EditToolInvocation extends BaseToolInvocation<EditToolParams, ToolResult> {
  constructor(
    private workspaceDir: string,
    params: EditToolParams
  ) {
    super(params);
  }

  toolLocations(): ToolLocation[] {
    return [{ path: this.params.file_path }];
  }

  getDescription(): string {
    const relativePath = path.relative(this.workspaceDir, this.params.file_path);
    if (this.params.old_string === '') {
      return `Create ${relativePath}`;
    }

    const oldSnippet = this.params.old_string.split('\n')[0].substring(0, 30) +
      (this.params.old_string.length > 30 ? '...' : '');
    const newSnippet = this.params.new_string.split('\n')[0].substring(0, 30) +
      (this.params.new_string.length > 30 ? '...' : '');

    return `${relativePath}: ${oldSnippet} => ${newSnippet}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const expectedReplacements = this.params.expected_replacements ?? 1;
    let currentContent: string | null = null;
    let fileExists = false;
    let isNewFile = false;

    try {
      try {
        currentContent = await fs.readFile(this.params.file_path, 'utf-8');
        currentContent = currentContent.replace(/\r\n/g, '\n');
        fileExists = true;
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        fileExists = false;
      }

      if (this.params.old_string === '' && !fileExists) {
        isNewFile = true;
      } else if (!fileExists) {
        return {
          llmContent: `File not found. Cannot apply edit. Use an empty old_string to create a new file.`,
          returnDisplay: `File not found: ${path.basename(this.params.file_path)}`,
          error: {
            message: `File not found: ${this.params.file_path}`,
            type: ToolErrorType.FILE_NOT_FOUND,
          },
        };
      }

      let occurrences = 0;
      if (fileExists && currentContent !== null) {
        occurrences = (currentContent.match(new RegExp(this.params.old_string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

        if (this.params.old_string === '') {
          return {
            llmContent: `Failed to edit. Attempted to create a file that already exists.`,
            returnDisplay: `File already exists: ${path.basename(this.params.file_path)}`,
            error: {
              message: `File already exists: ${this.params.file_path}`,
              type: ToolErrorType.ATTEMPT_TO_CREATE_EXISTING_FILE,
            },
          };
        } else if (occurrences === 0) {
          return {
            llmContent: `Failed to edit, could not find the string to replace in ${this.params.file_path}. No edits made.`,
            returnDisplay: `String not found in ${path.basename(this.params.file_path)}`,
            error: {
              message: `Failed to edit, 0 occurrences found`,
              type: ToolErrorType.EDIT_NO_OCCURRENCE_FOUND,
            },
          };
        } else if (occurrences !== expectedReplacements) {
          return {
            llmContent: `Failed to edit, expected ${expectedReplacements} occurrence(s) but found ${occurrences} in file: ${this.params.file_path}`,
            returnDisplay: `Expected ${expectedReplacements} but found ${occurrences}`,
            error: {
              message: `Expected ${expectedReplacements} but found ${occurrences}`,
              type: ToolErrorType.EDIT_EXPECTED_OCCURRENCE_MISMATCH,
            },
          };
        } else if (this.params.old_string === this.params.new_string) {
          return {
            llmContent: `No changes to apply. The old_string and new_string are identical.`,
            returnDisplay: `No changes to apply`,
            error: {
              message: `No changes to apply`,
              type: ToolErrorType.EDIT_NO_CHANGE,
            },
          };
        }
      }

      const newContent = applyReplacement(
        currentContent,
        this.params.old_string,
        this.params.new_string,
        isNewFile
      );

      if (fileExists && currentContent === newContent) {
        return {
          llmContent: `No changes to apply. The new content is identical to the current content.`,
          returnDisplay: `No changes needed`,
          error: {
            message: `No changes to apply`,
            type: ToolErrorType.EDIT_NO_CHANGE,
          },
        };
      }

      const dirName = path.dirname(this.params.file_path);
      if (!fsSync.existsSync(dirName)) {
        await fs.mkdir(dirName, { recursive: true });
      }

      await fs.writeFile(this.params.file_path, newContent, 'utf-8');

      const successMsg = isNewFile
        ? `Created new file: ${this.params.file_path} with provided content.`
        : `Successfully modified file: ${this.params.file_path} (${occurrences} replacements).`;

      return {
        llmContent: successMsg,
        returnDisplay: `${isNewFile ? 'Created' : 'Modified'} ${path.basename(this.params.file_path)}`,
      };
    } catch (error: any) {
      const errorMsg = `Error executing edit: ${error.message}`;
      return {
        llmContent: errorMsg,
        returnDisplay: errorMsg,
        error: {
          message: errorMsg,
          type: ToolErrorType.EDIT_PREPARATION_FAILURE,
        },
      };
    }
  }
}

/**
 * Implementation of the Edit tool
 */
export class EditTool extends BaseDeclarativeTool<EditToolParams, ToolResult> {
  static readonly Name = 'replace';

  constructor(private workspaceDir: string) {
    super(
      EditTool.Name,
      'Edit',
      `Replaces text within a file. By default, replaces a single occurrence, but can replace multiple occurrences when 'expected_replacements' is specified. This tool requires providing significant context around the change to ensure precise targeting.`
    );
  }

  protected validateToolParamValues(params: EditToolParams): string | null {
    if (!params.file_path) {
      return "The 'file_path' parameter must be non-empty.";
    }

    if (!path.isAbsolute(params.file_path)) {
      return `File path must be absolute: ${params.file_path}`;
    }

    const resolvedPath = path.resolve(params.file_path);
    const resolvedWorkspace = path.resolve(this.workspaceDir);

    if (resolvedPath !== resolvedWorkspace && !resolvedPath.startsWith(resolvedWorkspace + path.sep)) {
      return `File path must be within the workspace directory: ${this.workspaceDir}`;
    }

    return null;
  }

  protected createInvocation(params: EditToolParams): ToolInvocation<EditToolParams, ToolResult> {
    return new EditToolInvocation(this.workspaceDir, params);
  }
}
