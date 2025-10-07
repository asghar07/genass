/**
 * @license
 * Copyright 2025 GenAss
 * SPDX-License-Identifier: MIT
 */

/**
 * Result of a tool execution
 */
export interface ToolResult {
  /**
   * Content to send to the LLM
   */
  llmContent: string;

  /**
   * Content to display to the user (can be more formatted)
   */
  returnDisplay: string;

  /**
   * Optional error information
   */
  error?: {
    message: string;
    type: ToolErrorType;
  };
}

/**
 * Types of tool errors
 */
export enum ToolErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_FAILURE = 'FILE_READ_FAILURE',
  FILE_WRITE_FAILURE = 'FILE_WRITE_FAILURE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PATH_IS_NOT_A_DIRECTORY = 'PATH_IS_NOT_A_DIRECTORY',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  INVALID_PATH = 'INVALID_PATH',
  SHELL_EXECUTE_ERROR = 'SHELL_EXECUTE_ERROR',
  GREP_EXECUTION_ERROR = 'GREP_EXECUTION_ERROR',
  EDIT_NO_OCCURRENCE_FOUND = 'EDIT_NO_OCCURRENCE_FOUND',
  EDIT_EXPECTED_OCCURRENCE_MISMATCH = 'EDIT_EXPECTED_OCCURRENCE_MISMATCH',
  EDIT_NO_CHANGE = 'EDIT_NO_CHANGE',
  EDIT_PREPARATION_FAILURE = 'EDIT_PREPARATION_FAILURE',
  READ_CONTENT_FAILURE = 'READ_CONTENT_FAILURE',
  ATTEMPT_TO_CREATE_EXISTING_FILE = 'ATTEMPT_TO_CREATE_EXISTING_FILE',
  TARGET_IS_DIRECTORY = 'TARGET_IS_DIRECTORY',
  NO_SPACE_LEFT = 'NO_SPACE_LEFT',
  LS_EXECUTION_ERROR = 'LS_EXECUTION_ERROR',
}

/**
 * Location in the file system that a tool affects
 */
export interface ToolLocation {
  path: string;
  line?: number;
}

/**
 * Base interface for all tool invocations
 */
export interface ToolInvocation<TParams extends object, TResult extends ToolResult> {
  params: TParams;
  getDescription(): string;
  toolLocations(): ToolLocation[];
  execute(signal: AbortSignal): Promise<TResult>;
}

/**
 * Base class for tool invocations
 */
export abstract class BaseToolInvocation<TParams extends object, TResult extends ToolResult>
  implements ToolInvocation<TParams, TResult>
{
  constructor(public readonly params: TParams) {}

  abstract getDescription(): string;

  toolLocations(): ToolLocation[] {
    return [];
  }

  abstract execute(signal: AbortSignal): Promise<TResult>;
}

/**
 * Tool parameter validation interface
 */
export interface ToolValidator<TParams extends object> {
  validate(params: TParams): string | null;
}

/**
 * Base tool builder interface
 */
export interface ToolBuilder<TParams extends object, TResult extends ToolResult> {
  name: string;
  displayName: string;
  description: string;
  validate(params: TParams): string | null;
  build(params: TParams): ToolInvocation<TParams, TResult>;
}

/**
 * Abstract base class for declarative tools
 */
export abstract class BaseDeclarativeTool<TParams extends object, TResult extends ToolResult>
  implements ToolBuilder<TParams, TResult>
{
  constructor(
    public readonly name: string,
    public readonly displayName: string,
    public readonly description: string
  ) {}

  /**
   * Validates tool parameters
   */
  protected abstract validateToolParamValues(params: TParams): string | null;

  /**
   * Creates a tool invocation
   */
  protected abstract createInvocation(params: TParams): ToolInvocation<TParams, TResult>;

  /**
   * Validates parameters
   */
  validate(params: TParams): string | null {
    return this.validateToolParamValues(params);
  }

  /**
   * Builds a tool invocation
   */
  build(params: TParams): ToolInvocation<TParams, TResult> {
    const validationError = this.validate(params);
    if (validationError) {
      throw new Error(`Tool validation failed: ${validationError}`);
    }
    return this.createInvocation(params);
  }
}
