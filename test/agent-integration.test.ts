import { describe, it } from "mocha";
import { expect } from "chai";
import { AgentLoop, DEFAULT_AGENT_CONFIG } from "../src/agent/loop";
import { Loz } from "../src/loz";

describe("Agent Integration", () => {
  describe("AgentLoop", () => {
    it("should initialize with default config", () => {
      const loz = new Loz();
      const agent = new AgentLoop(loz);
      expect(agent).to.not.be.undefined;
    });

    it("should initialize with custom config", () => {
      const loz = new Loz();
      const customConfig = {
        maxSteps: 10,
        verbose: true,
        safetyConfig: DEFAULT_AGENT_CONFIG.safetyConfig,
        temperature: 0,
      };
      const agent = new AgentLoop(loz, customConfig);
      expect(agent).to.not.be.undefined;
    });

    it("should accept partial config and merge with defaults", () => {
      const loz = new Loz();
      const partialConfig = {
        maxSteps: 15,
        verbose: true,
      };
      const agent = new AgentLoop(loz, partialConfig);
      expect(agent).to.not.be.undefined;
    });
  });
});
