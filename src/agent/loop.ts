/**
 * Main agent loop implementation
 * Implements ReAct-style iterative execution
 */

import { Loz } from "../loz";
import { AgentMemory } from "./memory";
import { parseAgentAction, formatToolResult, AgentAction } from "./protocol";
import { executeCommand, applyPatch } from "./tools";
import { SafetyConfig, DEFAULT_SAFETY_CONFIG } from "./safety";
import { LLMSettings } from "../llm";

export interface AgentConfig {
  maxSteps: number;
  verbose: boolean;
  safetyConfig: SafetyConfig;
  temperature: number;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxSteps: 20,
  verbose: false,
  safetyConfig: DEFAULT_SAFETY_CONFIG,
  temperature: 0,
};

const AGENT_SYSTEM_PROMPT = `You are an autonomous coding agent. Your task is to complete the given goal by:
1. Analyzing the situation
2. Deciding on the next action
3. Executing commands or editing files
4. Verifying results
5. Iterating until the goal is achieved

CRITICAL RULES:
- Respond ONLY with valid JSON
- Never include markdown code blocks, explanations, or commentary outside the JSON
- Use ONLY one of these three action types:

Action 1 - Run a command:
{"action": "run", "cmd": "ls -la", "reasoning": "Need to see files"}

Action 2 - Edit a file (use unified diff format):
{"action": "edit", "file": "src/index.ts", "patch": "--- a/src/index.ts\\n+++ b/src/index.ts\\n@@ -1,2 +1,2 @@\\n-old line\\n+new line", "reasoning": "Fix bug"}

Action 3 - Mark task as complete:
{"action": "done", "summary": "Successfully completed the task. All tests passing."}

IMPORTANT:
- Think step by step
- Verify your changes by running tests
- Always provide "reasoning" field to explain your decision
- If you encounter repeated failures, try a different approach
- When the goal is achieved, use the "done" action with a summary`;

// Maximum number of times the agent can attempt the same action before being considered stuck
const MAX_REPEATED_ATTEMPTS = 3;

export class AgentLoop {
  private loz: Loz;
  private memory: AgentMemory;
  private config: AgentConfig;
  private workingDir: string;
  private failureHistory: Map<string, number> = new Map();

  constructor(loz: Loz, config: Partial<AgentConfig> = {}) {
    this.loz = loz;
    this.memory = new AgentMemory();
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.workingDir = process.cwd();
  }

  /**
   * Run the agent loop to complete a goal
   */
  async run(goal: string): Promise<string> {
    console.log(`\n🤖 Starting agent mode...\n`);
    console.log(`📋 Goal: ${goal}\n`);

    this.memory.addUserGoal(goal);

    let step = 0;
    let isDone = false;
    let finalSummary = "";

    while (!isDone && step < this.config.maxSteps) {
      step++;

      if (this.config.verbose) {
        console.log(`\n${"=".repeat(50)}`);
        console.log(`Step ${step}/${this.config.maxSteps}`);
        console.log("=".repeat(50));
      }

      try {
        // Get LLM decision
        const action = await this.getNextAction(step);

        if (this.config.verbose) {
          console.log(`\n💭 LLM Decision:`);
          console.log(`   Action: ${action.action}`);
          if ("reasoning" in action && action.reasoning) {
            console.log(`   Reasoning: ${action.reasoning}`);
          }
        }

        // Execute action
        if (action.action === "done") {
          isDone = true;
          finalSummary = action.summary;
          if (this.config.verbose) {
            console.log(`\n✅ Task completed!`);
          }
        } else if (action.action === "run") {
          await this.handleRunCommand(action, step);
        } else if (action.action === "edit") {
          await this.handleEditFile(action, step);
        }

        // Check for repeated failures
        if (!isDone && this.detectRepeatedFailure(action)) {
          console.log("\n⚠️  Detected repeated failures. Stopping agent.");
          finalSummary = "Agent stopped due to repeated failures without progress.";
          isDone = true;
        }
      } catch (error: any) {
        console.error(`\n❌ Error in step ${step}: ${error.message}`);
        this.memory.addResult(`Error: ${error.message}`, step);

        // If we can't parse LLM response, that's a critical error
        if (error.message.includes("Invalid JSON") || error.message.includes("action")) {
          console.log("\n⚠️  LLM response format error. Stopping agent.");
          finalSummary = `Agent stopped due to LLM protocol error: ${error.message}`;
          isDone = true;
        }
      }
    }

    if (!isDone && step >= this.config.maxSteps) {
      console.log(`\n⚠️  Reached maximum steps (${this.config.maxSteps})`);
      finalSummary = `Agent stopped after ${this.config.maxSteps} steps without completing the goal.`;
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`📊 Agent Summary`);
    console.log("=".repeat(50));
    console.log(`Total steps: ${step}`);
    console.log(`Status: ${isDone && step < this.config.maxSteps ? "✅ Completed" : "⚠️  Incomplete"}`);
    console.log(`\n📝 Summary:\n${finalSummary}\n`);

    return finalSummary;
  }

  /**
   * Get next action from LLM
   */
  private async getNextAction(step: number): Promise<AgentAction> {
    const context = this.memory.buildContext();
    const prompt = `${AGENT_SYSTEM_PROMPT}\n\n${context}\n\nWhat is your next action? Respond with JSON only:`;

    const params: LLMSettings = {
      model: this.loz.defaultSettings.model,
      prompt,
      temperature: this.config.temperature,
      max_tokens: 1000,
      top_p: 1.0,
      stream: false,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    };

    const completion = await this.loz.llmAPI.completion(params);
    const response = completion.content;

    if (this.config.verbose) {
      console.log(`\n🔍 Raw LLM Response:\n${response.substring(0, 200)}${response.length > 200 ? "..." : ""}`);
    }

    // Parse and validate response
    const action = parseAgentAction(response);
    this.memory.addAction(JSON.stringify(action), step);

    return action;
  }

  /**
   * Handle run command action
   */
  private async handleRunCommand(action: { action: "run"; cmd: string }, step: number): Promise<void> {
    if (this.config.verbose) {
      console.log(`\n🔧 Executing command: ${action.cmd}`);
    } else {
      console.log(`\n[Step ${step}] Running: ${action.cmd}`);
    }

    const result = await executeCommand(
      action.cmd,
      this.config.safetyConfig,
      this.workingDir,
    );

    if (this.config.verbose) {
      console.log(`\n📤 Command result:`);
      console.log(`   Success: ${result.success}`);
      console.log(`   Exit Code: ${result.exitCode || 0}`);
      if (result.output) {
        console.log(`   Output:\n${result.output}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } else if (!result.success) {
      console.log(`❌ Command failed: ${result.error || "Unknown error"}`);
    } else {
      console.log(`✅ Command succeeded`);
      if (result.output && result.output.trim()) {
        console.log(`Output: ${result.output.substring(0, 200)}${result.output.length > 200 ? "..." : ""}`);
      }
    }

    this.memory.addResult(formatToolResult(result), step);
  }

  /**
   * Handle edit file action
   */
  private async handleEditFile(action: { action: "edit"; file: string; patch: string }, step: number): Promise<void> {
    if (this.config.verbose) {
      console.log(`\n📝 Editing file: ${action.file}`);
      console.log(`   Patch:\n${action.patch.substring(0, 300)}${action.patch.length > 300 ? "..." : ""}`);
    } else {
      console.log(`\n[Step ${step}] Editing: ${action.file}`);
    }

    const result = await applyPatch(
      action.file,
      action.patch,
      this.workingDir,
    );

    if (this.config.verbose) {
      console.log(`\n📤 Edit result:`);
      console.log(`   Success: ${result.success}`);
      if (result.output) {
        console.log(`   ${result.output}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } else if (!result.success) {
      console.log(`❌ Edit failed: ${result.error || "Unknown error"}`);
    } else {
      console.log(`✅ File edited successfully`);
    }

    this.memory.addResult(formatToolResult(result), step);
  }

  /**
   * Detect if agent is stuck in repeated failures
   */
  private detectRepeatedFailure(action: AgentAction): boolean {
    const key = JSON.stringify(action);
    const count = this.failureHistory.get(key) || 0;
    this.failureHistory.set(key, count + 1);

    // If same action attempted MAX_REPEATED_ATTEMPTS times, consider it stuck
    return count >= MAX_REPEATED_ATTEMPTS - 1;
  }
}
