import OpenAI from "openai";
import { Ollama } from "ollama-node";
import { DEBUG } from "../constant";
import { GitHubCopilotAuth } from "./github-copilot-auth";

export interface LLMSettings {
  model: string;
  prompt: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  stream: boolean;
  frequency_penalty: number;
  presence_penalty: number;
  stop?: string[];
}
abstract class LLMService {
  api: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  abstract completion(params: LLMSettings): any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  abstract completionStream(params: LLMSettings): any;
}

export class OpenAiAPI extends LLMService {
  constructor(apiKey: string) {
    super();
    this.api = new OpenAI({ apiKey });
  }

  public async completion(
    params: LLMSettings,
  ): Promise<{ content: string; model: string }> {
    if (DEBUG) {
      console.log("OpenAI completion");
      console.log("Model: " + params.model);
    }
    const gptParams: OpenAI.Chat.ChatCompletionCreateParams = {
      model: params.model,
      messages: [{ role: "user", content: params.prompt }],
      stream: false,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
    };

    let completion: any;

    try {
      completion = await this.api.chat.completions.create(gptParams);
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 401) {
          console.log("Invalid API key");
        } else if (error.response.status === 429) {
          console.log("API request limit reached");
        } else {
          console.log(error.response.status);
          console.log(error.response.data);
        }
      } else {
        console.log(error.message);
      }
      return { content: "", model: "" };
    }

    return {
      content: completion.choices[0]?.message?.content,
      model: gptParams.model,
    };
  }

  public async completionStream(params: LLMSettings): Promise<any> {
    const streaming_params: OpenAI.Chat.ChatCompletionCreateParams = {
      model: params.model,
      messages: [{ role: "user", content: params.prompt }],
      stream: true,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      top_p: params.top_p,
      frequency_penalty: params.frequency_penalty,
      presence_penalty: params.presence_penalty,
    };
    if (DEBUG) {
      console.log("OpenAI stream completion");
      console.log("Model: " + params.model);
    }
    const stream = await this.api.chat.completions.create(streaming_params);
    return stream;
  }
}

export class OllamaAPI extends LLMService {
  constructor() {
    super();
    this.api = new Ollama();
  }

  public async completion(
    params: LLMSettings,
  ): Promise<{ content: string; model: string }> {
    if (DEBUG) {
      console.log("Ollama completion");
      console.log("Prompt: " + params.prompt);
      console.log("Model: " + params.model);
    }
    await this.api.setModel(params.model);

    const result = await this.api.generate(params.prompt);

    return { content: result.output, model: params.model };
  }

  public async completionStream(params: LLMSettings): Promise<any> {
    if (DEBUG) {
      console.log("Ollama stream completion");
      console.log("Model: " + params.model);
    }
    await this.api.setModel(params.model);
    
    // Return a promise that resolves with a stream-like object
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      
      this.api.streamingGenerate(
        params.prompt,
        // responseOutput callback - called for each chunk
        (chunk: string) => {
          chunks.push(chunk);
        },
        // contextOutput callback
        null,
        // fullResponseOutput callback
        null,
        // statsOutput callback
        null
      ).then(() => {
        // When streaming is complete, resolve with an async iterator
        resolve({
          [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) {
              yield { response: chunk };
            }
          }
        });
      }).catch((error: any) => {
        reject(error);
      });
    });
  }
}

export class GitHubCopilotAPI extends LLMService {
  private auth: GitHubCopilotAuth;

  constructor(githubToken: string) {
    super();
    this.auth = new GitHubCopilotAuth();
    this.auth.setGitHubToken(githubToken);
  }

  public async completion(
    params: LLMSettings,
  ): Promise<{ content: string; model: string }> {
    if (DEBUG) {
      console.log("GitHub Copilot completion");
      console.log("Model: " + params.model);
    }

    const copilotToken = await this.auth.getCopilotToken();

    const requestBody: any = {
      model: params.model,
      messages: [{ role: "user", content: params.prompt }],
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      top_p: params.top_p,
      frequency_penalty: params.frequency_penalty,
      presence_penalty: params.presence_penalty,
      stream: false,
    };

    if (params.stop) {
      requestBody.stop = params.stop;
    }

    try {
      const response = await fetch(
        "https://api.githubcopilot.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${copilotToken}`,
            "Editor-Version": "Neovim/0.6.1",
            "Editor-Plugin-Version": "copilot.vim/1.16.0",
            "User-Agent": "GithubCopilot/1.155.0",
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `GitHub Copilot API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data: any = await response.json();
      return {
        content: data.choices[0]?.message?.content || "",
        model: params.model,
      };
    } catch (error: any) {
      console.error("GitHub Copilot completion error:", error.message);
      return { content: "", model: "" };
    }
  }

  public async completionStream(params: LLMSettings): Promise<any> {
    if (DEBUG) {
      console.log("GitHub Copilot stream completion");
      console.log("Model: " + params.model);
    }

    const copilotToken = await this.auth.getCopilotToken();

    const requestBody: any = {
      model: params.model,
      messages: [{ role: "user", content: params.prompt }],
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      top_p: params.top_p,
      frequency_penalty: params.frequency_penalty,
      presence_penalty: params.presence_penalty,
      stream: true,
    };

    if (params.stop) {
      requestBody.stop = params.stop;
    }

    const response = await fetch(
      "https://api.githubcopilot.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${copilotToken}`,
          "Editor-Version": "Neovim/0.6.1",
          "Editor-Plugin-Version": "copilot.vim/1.16.0",
          "User-Agent": "GithubCopilot/1.155.0",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub Copilot API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.body;
  }

  public getAuth(): GitHubCopilotAuth {
    return this.auth;
  }
}
