/**
 * @license
 * Copyright 2025 GenAss
 * SPDX-License-Identifier: MIT
 */

import { spawn } from 'child_process';
import * as path from 'path';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  type ToolInvocation,
  type ToolResult,
  ToolErrorType,
} from './types.js';

/**
 * Parameters for the Shell tool
 */
export interface ShellToolParams {
  /**
   * The command to execute
   */
  command: string;

  /**
   * Optional description of what the command does
   */
  description?: string;

  /**
   * Optional directory to run the command in
   */
  directory?: string;
}

class ShellToolInvocation extends BaseToolInvocation<ShellToolParams, ToolResult> {
  constructor(
    private workspaceDir: string,
    params: ShellToolParams
  ) {
    super(params);
  }

  getDescription(): string {
    let description = this.params.command;
    if (this.params.directory) {
      description += ` [in ${this.params.directory}]`;
    }
    if (this.params.description) {
      description += ` (${this.params.description.replace(/\n/g, ' ')})`;
    }
    return description;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const cwd = this.params.directory || this.workspaceDir;

    return new Promise((resolve) => {
      if (signal.aborted) {
        resolve({
          llmContent: 'Command was cancelled by user before it could start.',
          returnDisplay: 'Command cancelled by user.',
        });
        return;
      }

      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : 'bash';
      const shellArgs = isWindows ? ['/c', this.params.command] : ['-c', this.params.command];

      const child = spawn(shell, shellArgs, {
        cwd,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const cleanup = () => {
        if (!child.killed) {
          child.kill();
        }
      };

      signal.addEventListener('abort', cleanup);

      child.on('error', (error) => {
        signal.removeEventListener('abort', cleanup);
        resolve({
          llmContent: `Error executing command: ${error.message}`,
          returnDisplay: `Error: ${error.message}`,
          error: {
            message: error.message,
            type: ToolErrorType.SHELL_EXECUTE_ERROR,
          },
        });
      });

      child.on('close', (code, sig) => {
        signal.removeEventListener('abort', cleanup);

        if (signal.aborted) {
          resolve({
            llmContent: 'Command was cancelled by user before it could complete.',
            returnDisplay: 'Command cancelled by user.',
          });
          return;
        }

        const llmContent = [
          `Command: ${this.params.command}`,
          `Directory: ${this.params.directory || '(workspace root)'}`,
          `Output: ${stdout || '(empty)'}`,
          `Error: ${stderr || '(none)'}`,
          `Exit Code: ${code ?? '(none)'}`,
          `Signal: ${sig ?? '(none)'}`,
        ].join('\n');

        let returnDisplayMessage = '';
        if (stdout.trim()) {
          returnDisplayMessage = stdout;
        } else if (stderr.trim()) {
          returnDisplayMessage = stderr;
        } else if (code !== null && code !== 0) {
          returnDisplayMessage = `Command exited with code: ${code}`;
        } else {
          returnDisplayMessage = 'Command completed successfully';
        }

        const executionError = code !== 0 && code !== null
          ? {
              error: {
                message: stderr || `Command exited with code ${code}`,
                type: ToolErrorType.SHELL_EXECUTE_ERROR,
              },
            }
          : {};

        resolve({
          llmContent,
          returnDisplay: returnDisplayMessage,
          ...executionError,
        });
      });
    });
  }
}

/**
 * Implementation of the Shell tool
 */
export class ShellTool extends BaseDeclarativeTool<ShellToolParams, ToolResult> {
  static readonly Name = 'run_shell_command';

  constructor(private workspaceDir: string) {
    super(
      ShellTool.Name,
      'Shell',
      'Executes a shell command in the workspace directory. Useful for running project scripts, installing dependencies, or executing build commands.'
    );
  }

  protected validateToolParamValues(params: ShellToolParams): string | null {
    if (!params.command || !params.command.trim()) {
      return 'Command cannot be empty.';
    }

    // Security checks
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, // rm -rf /
      /:\(\)\{\s*:\|:&\s*\};:/, // fork bomb
      /mkfs/, // format disk
      /dd\s+if=.*of=\/dev/, // disk operations
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(params.command)) {
        return `Command contains dangerous pattern and is not allowed: ${params.command}`;
      }
    }

    if (params.directory) {
      if (!path.isAbsolute(params.directory)) {
        return 'Directory must be an absolute path.';
      }

      const resolvedPath = path.resolve(params.directory);
      const resolvedWorkspace = path.resolve(this.workspaceDir);

      if (resolvedPath !== resolvedWorkspace && !resolvedPath.startsWith(resolvedWorkspace + path.sep)) {
        return `Directory must be within the workspace directory: ${this.workspaceDir}`;
      }
    }

    return null;
  }

  protected createInvocation(params: ShellToolParams): ToolInvocation<ShellToolParams, ToolResult> {
    return new ShellToolInvocation(this.workspaceDir, params);
  }
}
