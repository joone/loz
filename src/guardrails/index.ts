// List of dangerous commands that should be blocked
const DENYLIST = [
  "rm -rf /",
  "shutdown",
  "reboot",
  ":(){ :|:& };:",
  "mkfs",
  "dd if=",
];

export interface CommandAction {
  cmd: string;
}

/**
 * Enforces guardrails to prevent execution of dangerous shell commands
 * @param command The command to check
 * @param allowShell Whether shell commands are allowed
 * @throws Error if the command is blocked by guardrails
 */
export function enforceGuardrails(command: string, allowShell: boolean): void {
  if (!allowShell) {
    throw new Error("Shell commands are disabled by configuration.");
  }

  const lower = command.toLowerCase();
  const blocked = DENYLIST.find((token) =>
    lower.includes(token.toLowerCase()),
  );
  if (blocked) {
    throw new Error(`Command blocked by guardrails: ${blocked}`);
  }
}
