import { describe, it } from "mocha";
import { expect } from "chai";
import { parseAgentAction, formatToolResult } from "../src/agent/protocol";
import type { ToolResult } from "../src/agent/protocol";

describe("Agent Protocol", () => {
  describe("parseAgentAction", () => {
    it("should parse run command action", () => {
      const json = '{"action": "run", "cmd": "ls -la"}';
      const action = parseAgentAction(json);
      expect(action.action).to.equal("run");
      expect((action as any).cmd).to.equal("ls -la");
    });

    it("should parse run command action with reasoning", () => {
      const json = '{"action": "run", "cmd": "npm test", "reasoning": "Check if tests pass"}';
      const action = parseAgentAction(json);
      expect(action.action).to.equal("run");
      expect((action as any).cmd).to.equal("npm test");
      expect((action as any).reasoning).to.equal("Check if tests pass");
    });

    it("should parse edit file action", () => {
      const json = '{"action": "edit", "file": "src/index.ts", "patch": "--- a/src/index.ts\\n+++ b/src/index.ts"}';
      const action = parseAgentAction(json);
      expect(action.action).to.equal("edit");
      expect((action as any).file).to.equal("src/index.ts");
      expect((action as any).patch).to.contain("--- a/src/index.ts");
    });

    it("should parse done action", () => {
      const json = '{"action": "done", "summary": "Task completed successfully"}';
      const action = parseAgentAction(json);
      expect(action.action).to.equal("done");
      expect((action as any).summary).to.equal("Task completed successfully");
    });

    it("should handle case-insensitive action types", () => {
      const json = '{"action": "RUN", "cmd": "pwd"}';
      const action = parseAgentAction(json);
      expect(action.action).to.equal("run");
    });

    it("should strip markdown code blocks", () => {
      const json = '```json\n{"action": "run", "cmd": "echo test"}\n```';
      const action = parseAgentAction(json);
      expect(action.action).to.equal("run");
      expect((action as any).cmd).to.equal("echo test");
    });

    it("should throw error for invalid JSON", () => {
      const invalid = "not json";
      expect(() => parseAgentAction(invalid)).to.throw("Invalid JSON");
    });

    it("should throw error for missing action field", () => {
      const json = '{"cmd": "ls"}';
      expect(() => parseAgentAction(json)).to.throw("Missing or invalid 'action' field");
    });

    it("should throw error for run action without cmd", () => {
      const json = '{"action": "run"}';
      expect(() => parseAgentAction(json)).to.throw("'run' action requires 'cmd' field");
    });

    it("should throw error for edit action without file", () => {
      const json = '{"action": "edit", "patch": "some patch"}';
      expect(() => parseAgentAction(json)).to.throw("'edit' action requires 'file' field");
    });

    it("should throw error for edit action without patch", () => {
      const json = '{"action": "edit", "file": "test.ts"}';
      expect(() => parseAgentAction(json)).to.throw("'edit' action requires 'patch' field");
    });

    it("should throw error for done action without summary", () => {
      const json = '{"action": "done"}';
      expect(() => parseAgentAction(json)).to.throw("'done' action requires 'summary' field");
    });

    it("should throw error for unknown action type", () => {
      const json = '{"action": "unknown", "data": "test"}';
      expect(() => parseAgentAction(json)).to.throw("Unknown action type: unknown");
    });
  });

  describe("formatToolResult", () => {
    it("should format successful result", () => {
      const result: ToolResult = {
        success: true,
        output: "test output",
        exitCode: 0,
      };
      const formatted = formatToolResult(result);
      expect(formatted).to.contain("Exit Code: 0");
      expect(formatted).to.contain("Output:");
      expect(formatted).to.contain("test output");
    });

    it("should format error result", () => {
      const result: ToolResult = {
        success: false,
        output: "stderr output",
        error: "Command failed",
      };
      const formatted = formatToolResult(result);
      expect(formatted).to.contain("Error: Command failed");
      expect(formatted).to.contain("stderr output");
    });
  });
});
