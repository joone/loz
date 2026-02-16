// npx mocha -r ts-node/register src/llm/test.ts
import { expect } from "chai";
import { OllamaAPI, OpenAiAPI, GitHubCopilotAPI, LLMSettings } from ".";
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
    it("Llama2 should generate '2'", async function () {
      const ollama = new OllamaAPI();
      const settings: LLMSettings = {
        model: "gpt-oss:20b",
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
    it("gpt-oss:20b should generate '2'", async function () {
      const ollama = new OllamaAPI();
      const settings: LLMSettings = {
        model: "gpt-oss:20b",
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

  it("GitHubCopilotAPI should be instantiable with a token", () => {
    const copilot = new GitHubCopilotAPI("test-token");
    expect(copilot).to.be.an.instanceof(GitHubCopilotAPI);
    expect(copilot.getAuth()).to.not.be.undefined;
  });

  it("GitHubCopilotAPI auth should manage tokens", () => {
    const copilot = new GitHubCopilotAPI("initial-token");
    const auth = copilot.getAuth();
    
    expect(auth.getGitHubToken()).to.equal("initial-token");
    
    auth.setGitHubToken("new-token");
    expect(auth.getGitHubToken()).to.equal("new-token");
  });
});
