import { Loz } from "../src/index";
import { expect } from "chai";
import "mocha";
import * as mockStdin from "mock-stdin";

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

  it("should return true", async () => {
    process.nextTick(() => {
      stdin.send("openai\n");
      stdin.end();
    });

    let loz = new Loz();
    const res = await loz.init();

    expect(res).to.equal(true);
    expect(loz.checkAPI()).to.equal("openai");

    const completion = await loz.completeUserPrompt("1+1=");
    expect(completion.content).to.equal("2");
  });
});

describe("Test Loz class", () => {
  //  npm test --  --grep=Loz.checkEnv
  describe("loz.checkEnv", () => {
    it("should return true", () => {
      let loz = new Loz();

      const result = loz.checkEnv();
      expect(result).to.equal(true);
    });
  });
});

if (process.env.LOZ_LOCAL_TEST === "true") {
  describe("Loz.ollama", () => {
    it("should return true", async () => {
      let loz = new Loz("ollama");
      await loz.init();

      const completion = await loz.completeUserPrompt("1+1=");
      expect(completion.content).to.equal("2");
    });
  });
}

describe("git", () => {
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

  it("should return true", async () => {
    process.nextTick(() => {
      stdin.send("openai\n");
      stdin.end();
    });

    let loz = new Loz();
    const res = await loz.init();

    expect(res).to.equal(true);
    expect(loz.checkAPI()).to.equal("openai");

    const completion = await loz.completeUserPrompt("1+1=");
    expect(completion.content).to.equal("2");
  });
});
