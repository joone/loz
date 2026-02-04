// npx mocha -r ts-node/register src/llm/test.ts
import { expect } from "chai";
import { OllamaAPI, OpenAiAPI, CopilotAPI, LLMSettings } from ".";
import "mocha";

const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true" ? true : false;

function callback(input: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(input);
    resolve();
  });
}

describe("Test LLM API", () => {
  before(() => {});

  after(() => {});

  it("OpenAI API should generate '2'", async function () {
    if (process.env.OPENAI_API_KEY === undefined)
      throw new Error("API_KEY environment variable is not set.");

    const openai = new OpenAiAPI(process.env.OPENAI_API_KEY);
    const settings: LLMSettings = {
      model: "gpt-3.5-turbo",
      prompt: "1+1=",
      temperature: 0,
      max_tokens: 60,
      top_p: 1.0,
      stream: true,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    };

    const complete = await openai.completion(settings);
    expect(complete.content).to.equal("2");
  });

  if (GITHUB_ACTIONS === false) {
    it("Copilot API should generate '2'", async function () {
      if (
        process.env.COPILOT_API_KEY === undefined ||
        process.env.COPILOT_ENDPOINT === undefined
      ) {
        this.skip();
        return;
      }

      const copilot = new CopilotAPI(
        process.env.COPILOT_API_KEY,
        process.env.COPILOT_ENDPOINT,
      );
      const settings: LLMSettings = {
        model: "gpt-4",
        prompt: "1+1=",
        temperature: 0,
        max_tokens: 60,
        top_p: 1.0,
        stream: true,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      };

      const complete = await copilot.completion(settings);
      expect(complete.content).to.contain("2");
    });
  }

  if (GITHUB_ACTIONS === false) {
    it("Llama2 should generate '2'", async function () {
      const ollama = new OllamaAPI();
      const settings: LLMSettings = {
        model: "llama2",
        prompt: "1+1=",
        temperature: 0,
        max_tokens: 60,
        top_p: 1.0,
        stream: true,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      };

      const complete = await ollama.completion(settings);
      console.log(complete.content);
      expect(complete.content.indexOf("2")).to.not.equal(-1);
    });
  }

  if (GITHUB_ACTIONS === false) {
    it("codellama should generate '2'", async function () {
      const ollama = new OllamaAPI();
      const settings: LLMSettings = {
        model: "codellama",
        prompt: "1+1=",
        temperature: 0,
        max_tokens: 60,
        top_p: 1.0,
        stream: true,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      };

      const complete = await ollama.completion(settings);
      console.log(complete.content);
      expect(complete.content.indexOf("2")).to.not.equal(-1);
    });
  }
});
