import { Loz } from "../src/loz";
import { expect } from "chai";
import "mocha";
import * as mockStdin from "mock-stdin";

const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true" ? true : false;

describe("Test OpenAI API", () => {
  let stdin: mockStdin.MockSTDIN;

  before(() => {
    stdin = mockStdin.stdin();
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }
  });

  after(() => {
    stdin.restore();
  });

  it("should return true", async function () {
    this.timeout(5000);

    process.nextTick(() => {
      stdin.send("openai\n");
    });

    // Simulate a short delay before sending the next input
    setTimeout(() => {
      // Second input, simulate another Enter or actual input
      stdin.send("y\n");
      stdin.end(); // Now end the stdin after all inputs have been sent
    }, 1000);

    let loz = new Loz();
    await loz.init();

    expect((loz as any).checkAPI()).to.equal("openai");

    const completion = await loz.completeUserPrompt("1+1=");
    expect(completion.content).to.equal("2");
  });
});

if (GITHUB_ACTIONS === false) {
  describe("Loz.ollama", () => {
    it("should return true", async () => {
      let loz = new Loz();
      await loz.init();
      await loz.setAPI("ollama", "gpt-oss:20b");

      expect((loz as any).checkAPI()).to.equal("ollama");
      const completion = await loz.completeUserPrompt("1+1=");
      expect(completion.content).contains("2");

      await loz.setAPI("openai");
    });
  });
}
