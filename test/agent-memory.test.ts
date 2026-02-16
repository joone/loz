import { describe, it } from "mocha";
import { expect } from "chai";
import { AgentMemory } from "../src/agent/memory";

describe("Agent Memory", () => {
  describe("AgentMemory", () => {
    it("should add and retrieve user goal", () => {
      const memory = new AgentMemory();
      memory.addUserGoal("Fix failing tests");
      const context = memory.buildContext();
      expect(context).to.contain("Fix failing tests");
      expect(context).to.contain("# Task");
    });

    it("should add actions with step numbers", () => {
      const memory = new AgentMemory();
      memory.addUserGoal("Test goal");
      memory.addAction('{"action": "run", "cmd": "ls"}', 1);
      memory.addResult("Exit Code: 0\nOutput: file1.txt", 1);
      
      const context = memory.buildContext();
      expect(context).to.contain("Step 1");
      expect(context).to.contain('{"action": "run", "cmd": "ls"}');
      expect(context).to.contain("Exit Code: 0");
    });

    it("should group actions and results by step", () => {
      const memory = new AgentMemory();
      memory.addUserGoal("Test goal");
      memory.addAction("action1", 1);
      memory.addResult("result1", 1);
      memory.addAction("action2", 2);
      memory.addResult("result2", 2);
      
      const context = memory.buildContext();
      expect(context).to.contain("Step 1");
      expect(context).to.contain("Step 2");
      expect(context).to.contain("action1");
      expect(context).to.contain("result1");
      expect(context).to.contain("action2");
      expect(context).to.contain("result2");
    });

    it("should truncate long outputs", () => {
      const memory = new AgentMemory();
      memory.addUserGoal("Test goal");
      memory.addAction("action", 1);
      const longOutput = "x".repeat(2000);
      memory.addResult(longOutput, 1);
      
      const context = memory.buildContext();
      expect(context.length).to.be.lessThan(longOutput.length + 500);
      expect(context).to.contain("truncated");
    });

    it("should handle many steps by showing first and last", () => {
      const memory = new AgentMemory();
      memory.addUserGoal("Test goal");
      
      // Add 15 steps
      for (let i = 1; i <= 15; i++) {
        memory.addAction(`action${i}`, i);
        memory.addResult(`result${i}`, i);
      }
      
      const context = memory.buildContext();
      expect(context).to.contain("Step 1");
      expect(context).to.contain("Step 2");
      // Should skip middle steps
      expect(context).to.contain("Step 10"); // or later steps
      expect(context).to.contain("Showing first");
    });

    it("should track memory size", () => {
      const memory = new AgentMemory();
      expect(memory.getSize()).to.equal(0);
      
      memory.addUserGoal("Test");
      expect(memory.getSize()).to.equal(1);
      
      memory.addAction("action", 1);
      expect(memory.getSize()).to.equal(2);
      
      memory.addResult("result", 1);
      expect(memory.getSize()).to.equal(3);
    });

    it("should clear memory", () => {
      const memory = new AgentMemory();
      memory.addUserGoal("Test");
      memory.addAction("action", 1);
      expect(memory.getSize()).to.be.greaterThan(0);
      
      memory.clear();
      expect(memory.getSize()).to.equal(0);
    });
  });
});
