import { Loz } from "../src/index";
import { expect } from "chai";
import "mocha";

describe("Loz.chekcEnv()", () => {
  it("should return true", () => {
    let loz = new Loz();

    const result = loz.checkEnv();
    expect(result).to.equal(true);
  });
});

describe("Loz.openaiChatCompletionCreate()", () => {
  it("should return true", async () => {
    let loz = new Loz("ollama");
    await loz.init();

    const completion = await loz.completeUserPrompt("1+1");
    expect(completion.content).to.equal("2");
  });
});
