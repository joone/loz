// List of dangerous command patterns that should be blocked
// Patterns are case-insensitive and stored in lowercase for efficiency
const DENYLIST = [
  "rm -rf /",
  "rm -rf/*",
  "rm -rf /.",
  "shutdown",
  "reboot",
  ":(){ :|:& };:",
  "mkfs",
  "dd if=",
];

// Pre-computed lowercase versions for efficient checking
const DENYLIST_LOWER = DENYLIST.map((token) => token.toLowerCase());

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
  const blockedIndex = DENYLIST_LOWER.findIndex((token) =>
    lower.includes(token),
  );
  if (blockedIndex !== -1) {
    throw new Error(
      `Command blocked by guardrails: ${DENYLIST[blockedIndex]}`,
    );
  }
}
