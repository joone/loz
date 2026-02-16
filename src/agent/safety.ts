/**
 * Safety layer for command execution in agent mode
 * Provides allowlist, denylist, and sandbox validation
 */

import { enforceGuardrails } from "../guardrails";
import * as path from "path";

// Commands that are always safe and allowed
const ALLOWLIST = [
  "ls",
  "pwd",
  "cat",
  "grep",
  "find",
  "head",
  "tail",
  "wc",
  "echo",
  "which",
  "git",
  "npm",
  "node",
  "python",
  "python3",
  "pip",
  "pip3",
  "tsc",
  "npx",
  "mkdir",
  "touch",
  "cp",
  "mv",
  "diff",
  "test",
  "mocha",
  "jest",
];

// Network commands that require enableNetwork flag
const NETWORK_COMMANDS = [
  "curl",
  "wget",
  "ssh",
  "scp",
  "nc",
  "netcat",
  "telnet",
  "ftp",
  "rsync",
];

// Additional dangerous patterns beyond basic guardrails
const AGENT_DENYLIST = [
  "> /dev/",
  "chmod 777",
  "chown",
  "useradd",
  "userdel",
];

export interface SafetyConfig {
  allowlistMode: boolean; // If true, only allowlisted commands are permitted
  sandboxMode: boolean; // If true, restrict to working directory
  maxOutputBytes: number; // Max output size
  timeoutSeconds: number; // Command timeout
  enableNetwork: boolean; // Allow network commands
}

export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  allowlistMode: false,
  sandboxMode: true,
  maxOutputBytes: 10000, // 10KB
  timeoutSeconds: 30,
  enableNetwork: false,
};

/**
 * Validate command against safety rules
 * @param cmd Command to validate
 * @param config Safety configuration
 * @param workingDir Working directory path
 * @throws Error if command violates safety rules
 */
export function validateCommand(
  cmd: string,
  config: SafetyConfig,
  workingDir: string,
): void {
  // Apply basic guardrails
  enforceGuardrails(cmd, true);

  const cmdLower = cmd.toLowerCase();
  
  // Check network commands if network is disabled
  if (!config.enableNetwork) {
    for (const netCmd of NETWORK_COMMANDS) {
      if (cmdLower.includes(netCmd)) {
        throw new Error(
          `Network command '${netCmd}' is blocked. Enable network with --enable-network flag.`,
        );
      }
    }
  }

  // Check agent-specific denylist
  for (const denied of AGENT_DENYLIST) {
    if (cmdLower.includes(denied)) {
      throw new Error(`Command blocked by safety policy: contains '${denied}'`);
    }
  }

  // Allowlist mode: check if command starts with allowed command
  if (config.allowlistMode) {
    const firstWord = cmd.trim().split(/\s+/)[0];
    const isAllowed = ALLOWLIST.some((allowed) => firstWord === allowed || firstWord.endsWith(`/${allowed}`));
    if (!isAllowed) {
      throw new Error(
        `Command '${firstWord}' is not in allowlist. Allowed commands: ${ALLOWLIST.join(", ")}`,
      );
    }
  }

  // Sandbox mode: prevent directory traversal outside working directory
  if (config.sandboxMode) {
    // Check for suspicious path patterns with .. (but allow git commands)
    if (cmd.includes("..") && !cmd.includes("git")) {
      throw new Error(
        "Path traversal detected (..). Commands must stay within working directory in sandbox mode.",
      );
    }

    // Check for absolute paths that might be outside working directory
    // But allow common safe paths like ./relative/path
    const absolutePaths = cmd.match(/(?:^|\s)(\/[^\s]*)/g);
    if (absolutePaths) {
      for (const pathMatch of absolutePaths) {
        const absPath = pathMatch.trim();
        // Skip common safe patterns like /dev/null or if it's just a flag
        if (absPath.startsWith("/dev/") || absPath.match(/^-[a-zA-Z]/)) {
          continue;
        }
        const normalized = path.normalize(absPath);
        const relative = path.relative(workingDir, normalized);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          throw new Error(
            `Absolute path '${absPath}' is outside working directory. Sandbox mode restricts operations to ${workingDir}.`,
          );
        }
      }
    }
  }
}

/**
 * Validate file path for editing
 * @param filePath Path to file
 * @param workingDir Working directory
 * @throws Error if path is unsafe
 */
export function validateFilePath(filePath: string, workingDir: string): void {
  // Prevent directory traversal
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(workingDir, normalized);
  const relative = path.relative(workingDir, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      `File path '${filePath}' is outside working directory. Operations restricted to ${workingDir}.`,
    );
  }

  // Prevent editing sensitive files
  const sensitivePatterns = [
    /\.ssh/,
    /\.aws/,
    /\.env/,
    /password/i,
    /secret/i,
    /\.key$/,
    /\.pem$/,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(filePath)) {
      throw new Error(
        `Cannot edit potentially sensitive file: ${filePath}`,
      );
    }
  }
}

/**
 * Truncate output to maximum size
 */
export function truncateOutput(output: string, maxBytes: number): string {
  if (output.length <= maxBytes) {
    return output;
  }
  const truncated = output.substring(0, maxBytes);
  return truncated + `\n\n... [output truncated, ${output.length - maxBytes} bytes hidden]`;
}
