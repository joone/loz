/**
 * Tool execution handlers for agent mode
 * Handles command execution and file editing
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { ToolResult } from "./protocol";
import { SafetyConfig, validateCommand, validateFilePath, truncateOutput } from "./safety";

/**
 * Execute a shell command with safety checks
 * @param cmd Command to execute
 * @param config Safety configuration
 * @param workingDir Working directory
 * @returns Tool result with output and exit code
 */
export async function executeCommand(
  cmd: string,
  config: SafetyConfig,
  workingDir: string,
): Promise<ToolResult> {
  // Validate command first
  try {
    validateCommand(cmd, config, workingDir);
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.message,
    };
  }

  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const shell = isWindows ? "powershell.exe" : "bash";
    const shellArgs = isWindows ? ["-Command", cmd] : ["-c", cmd];

    const child = spawn(shell, shellArgs, {
      cwd: workingDir,
      timeout: config.timeoutSeconds * 1000,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      resolve({
        success: false,
        output: stdout + stderr,
        error: error.message,
      });
    });

    child.on("close", (code) => {
      const output = truncateOutput(stdout + stderr, config.maxOutputBytes);
      resolve({
        success: code === 0,
        output,
        exitCode: code || 0,
      });
    });
  });
}

/**
 * Apply a unified diff patch to a file
 * @param filePath Path to file to edit
 * @param patch Unified diff patch
 * @param workingDir Working directory
 * @returns Tool result
 */
export async function applyPatch(
  filePath: string,
  patch: string,
  workingDir: string,
): Promise<ToolResult> {
  try {
    // Validate file path
    validateFilePath(filePath, workingDir);

    const fullPath = path.resolve(workingDir, filePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return {
        success: false,
        output: "",
        error: `File does not exist: ${filePath}`,
      };
    }

    // Read current file content
    const currentContent = fs.readFileSync(fullPath, "utf-8");

    // Apply patch using simple line-based approach
    // For production, could use a proper patch library
    const patchedContent = applyUnifiedDiff(currentContent, patch);

    if (patchedContent === null) {
      return {
        success: false,
        output: "",
        error: "Failed to apply patch - patch format invalid or does not match file",
      };
    }

    // Write patched content
    fs.writeFileSync(fullPath, patchedContent, "utf-8");

    return {
      success: true,
      output: `Successfully edited ${filePath}`,
    };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.message,
    };
  }
}

/**
 * Simple unified diff parser and applier
 * Note: This is a basic implementation. For production use, consider a proper patch library.
 */
function applyUnifiedDiff(content: string, patch: string): string | null {
  try {
    const lines = content.split("\n");
    const patchLines = patch.split("\n");

    // Parse patch - look for hunks (@@ -start,count +start,count @@)
    let result = [...lines];
    let offset = 0;

    for (let i = 0; i < patchLines.length; i++) {
      const line = patchLines[i];

      // Hunk header
      if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
        if (!match) continue;

        const oldStart = parseInt(match[1]) - 1; // Convert to 0-based
        const oldCount = parseInt(match[2]);
        const newStart = parseInt(match[3]) - 1;

        // Collect hunk lines
        const hunkLines: string[] = [];
        i++;
        while (i < patchLines.length && !patchLines[i].startsWith("@@")) {
          hunkLines.push(patchLines[i]);
          i++;
        }
        i--; // Back up one since loop will increment

        // Apply hunk
        const newLines: string[] = [];
        for (const hunkLine of hunkLines) {
          if (hunkLine.startsWith("+")) {
            newLines.push(hunkLine.substring(1));
          } else if (hunkLine.startsWith("-")) {
            // Skip removed lines
          } else if (hunkLine.startsWith(" ")) {
            newLines.push(hunkLine.substring(1));
          }
        }

        // Replace lines
        const actualStart = oldStart + offset;
        result.splice(actualStart, oldCount, ...newLines);
        offset += newLines.length - oldCount;
      }
    }

    return result.join("\n");
  } catch (error) {
    return null;
  }
}

/**
 * Create a new file
 */
export async function createFile(
  filePath: string,
  content: string,
  workingDir: string,
): Promise<ToolResult> {
  try {
    validateFilePath(filePath, workingDir);

    const fullPath = path.resolve(workingDir, filePath);

    // Create parent directories if needed
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Check if file already exists
    if (fs.existsSync(fullPath)) {
      return {
        success: false,
        output: "",
        error: `File already exists: ${filePath}`,
      };
    }

    fs.writeFileSync(fullPath, content, "utf-8");

    return {
      success: true,
      output: `Created file: ${filePath}`,
    };
  } catch (error: any) {
    return {
      success: false,
      output: "",
      error: error.message,
    };
  }
}
