/**
 * Defines the structured JSON protocol for LLM-agent communication
 * All LLM responses must conform to one of these action types
 */

export type AgentAction = RunCommandAction | EditFileAction | DoneAction;

export interface RunCommandAction {
  action: "run";
  cmd: string;
  reasoning?: string;
}

export interface EditFileAction {
  action: "edit";
  file: string;
  patch: string;
  reasoning?: string;
}

export interface DoneAction {
  action: "done";
  summary: string;
}

/**
 * Result of executing a tool action
 */
export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

/**
 * Parse and validate LLM response JSON
 * @param response Raw LLM response text
 * @returns Parsed and validated AgentAction
 * @throws Error if response is invalid JSON or doesn't match protocol
 */
export function parseAgentAction(response: string): AgentAction {
  // Strip markdown code blocks if present
  let content = response.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
  }

  // Parse JSON
  let json: any;
  try {
    json = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON response from LLM: ${content.substring(0, 100)}`);
  }

  // Validate action type
  if (!json.action || typeof json.action !== "string") {
    throw new Error("Missing or invalid 'action' field in LLM response");
  }

  const action = json.action.toLowerCase();

  // Validate specific action types
  if (action === "run") {
    if (!json.cmd || typeof json.cmd !== "string") {
      throw new Error("'run' action requires 'cmd' field with string value");
    }
    return {
      action: "run",
      cmd: json.cmd,
      reasoning: json.reasoning,
    };
  } else if (action === "edit") {
    if (!json.file || typeof json.file !== "string") {
      throw new Error("'edit' action requires 'file' field with string value");
    }
    if (!json.patch || typeof json.patch !== "string") {
      throw new Error("'edit' action requires 'patch' field with string value");
    }
    return {
      action: "edit",
      file: json.file,
      patch: json.patch,
      reasoning: json.reasoning,
    };
  } else if (action === "done") {
    if (!json.summary || typeof json.summary !== "string") {
      throw new Error("'done' action requires 'summary' field with string value");
    }
    return {
      action: "done",
      summary: json.summary,
    };
  } else {
    throw new Error(`Unknown action type: ${action}`);
  }
}

/**
 * Format tool result for inclusion in context
 */
export function formatToolResult(result: ToolResult): string {
  if (result.success) {
    return `Exit Code: ${result.exitCode || 0}\nOutput:\n${result.output}`;
  } else {
    return `Error: ${result.error || "Unknown error"}\nOutput:\n${result.output}`;
  }
}
