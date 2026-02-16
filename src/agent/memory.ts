/**
 * Context management for agent mode
 * Maintains conversation history with intelligent truncation
 */

export interface ContextEntry {
  type: "user_goal" | "action" | "result";
  content: string;
  step?: number;
}

export class AgentMemory {
  private entries: ContextEntry[] = [];
  private maxEntries: number;
  private maxTokensApprox: number;

  constructor(maxEntries = 50, maxTokensApprox = 6000) {
    this.maxEntries = maxEntries;
    this.maxTokensApprox = maxTokensApprox;
  }

  /**
   * Add user goal to context
   */
  addUserGoal(goal: string): void {
    this.entries.push({
      type: "user_goal",
      content: goal,
    });
  }

  /**
   * Add action taken by agent
   */
  addAction(action: string, step: number): void {
    this.entries.push({
      type: "action",
      content: action,
      step,
    });
  }

  /**
   * Add result from tool execution
   */
  addResult(result: string, step: number): void {
    this.entries.push({
      type: "result",
      content: result,
      step,
    });
  }

  /**
   * Build context string for LLM
   * Applies intelligent truncation if needed
   */
  buildContext(): string {
    let parts: string[] = [];

    // Always include user goal
    const userGoal = this.entries.find((e) => e.type === "user_goal");
    if (userGoal) {
      parts.push(`# Task\n${userGoal.content}\n`);
    }

    // Group actions and results by step
    const steps = new Map<number, { action: string; result?: string }>();
    for (const entry of this.entries) {
      if (entry.step !== undefined) {
        if (!steps.has(entry.step)) {
          steps.set(entry.step, { action: "", result: undefined });
        }
        const step = steps.get(entry.step)!;
        if (entry.type === "action") {
          step.action = entry.content;
        } else if (entry.type === "result") {
          step.result = entry.content;
        }
      }
    }

    // Add history
    if (steps.size > 0) {
      parts.push("# Previous Steps\n");
      const sortedSteps = Array.from(steps.entries()).sort((a, b) => a[0] - b[0]);

      // If too many steps, keep first 2 and last N
      let stepsToShow = sortedSteps;
      if (sortedSteps.length > 10) {
        const keepRecent = 6;
        const keepInitial = 2;
        stepsToShow = [
          ...sortedSteps.slice(0, keepInitial),
          ...sortedSteps.slice(-keepRecent),
        ];
        parts.push(`[Showing first ${keepInitial} and last ${keepRecent} steps of ${sortedSteps.length} total]\n\n`);
      }

      for (const [stepNum, step] of stepsToShow) {
        parts.push(`## Step ${stepNum}\n`);
        parts.push(`Action: ${step.action}\n`);
        if (step.result) {
          // Truncate long outputs
          const truncatedResult = this.truncateIfNeeded(step.result, 500);
          parts.push(`Result: ${truncatedResult}\n`);
        }
        parts.push("\n");
      }
    }

    return parts.join("");
  }

  /**
   * Truncate text if it exceeds limit
   */
  private truncateIfNeeded(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }
    return text.substring(0, maxChars) + `...[truncated ${text.length - maxChars} chars]`;
  }

  /**
   * Get number of entries
   */
  getSize(): number {
    return this.entries.length;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }
}
