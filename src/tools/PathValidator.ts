/**
 * Path Validator - Centralized path validation logic
 */

import * as path from 'path';

export class PathValidator {
  /**
   * Check if a path is within the workspace directory
   */
  static isWithinWorkspace(targetPath: string, workspaceDir: string): boolean {
    const resolvedPath = path.resolve(targetPath);
    const resolvedWorkspace = path.resolve(workspaceDir);

    // Allow exact workspace directory
    if (resolvedPath === resolvedWorkspace) {
      return true;
    }

    // Check if path is within workspace
    return resolvedPath.startsWith(resolvedWorkspace + path.sep);
  }

  /**
   * Validate that a path is absolute and within workspace
   */
  static validateWorkspacePath(targetPath: string, workspaceDir: string): string | null {
    if (!targetPath || targetPath.trim() === '') {
      return 'Path cannot be empty';
    }

    if (!path.isAbsolute(targetPath)) {
      return `Path must be absolute: ${targetPath}`;
    }

    if (!this.isWithinWorkspace(targetPath, workspaceDir)) {
      return `Path must be within the workspace directory: ${workspaceDir}`;
    }

    return null;
  }

  /**
   * Normalize path separators for cross-platform compatibility
   */
  static normalizePath(targetPath: string): string {
    return path.normalize(targetPath);
  }
}
