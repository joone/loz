import { Loz } from "../src/index";
import OpenAI from "openai";
import { expect } from "chai";
import "mocha";

describe("Loz.chekcEnv()", () => {
  it("should return true", () => {
    let loz = new Loz();

    const result = loz.checkEnv()
    expect(result).to.equal(true);
  });

});


describe("Loz.openaiChatCompletionCreate()", () => {
  it("should return true", async () => {
    let loz = new Loz();

    const params: OpenAI.Chat.ChatCompletionCreateParams = {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "1+1=?" }],
      max_tokens: 50,
      temperature: 0,
    };

    const completion = await loz.openaiChatCompletionCreate(params);
    expect(completion.choices[0]?.message?.content).to.equal('1+1=2');
  });

});