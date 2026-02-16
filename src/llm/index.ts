import OpenAI from "openai";
import { Ollama } from "ollama-node";
import { DEBUG } from "../constant";
import { GitHubCopilotAuth } from "./github-copilot-auth";

// GitHub Copilot API headers
const COPILOT_EDITOR_VERSION = "vscode/1.85.0";
const COPILOT_PLUGIN_VERSION = "copilot/1.155.0";
const COPILOT_USER_AGENT = "GithubCopilot/1.155.0";

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
    
    // Create a queue to handle chunks as they arrive
    const chunks: string[] = [];
    let pendingResolve: ((value: IteratorResult<{ response: string }>) => void) | null = null;
    let isComplete = false;
    let error: any = null;
    
    // Start streaming immediately
    this.api.streamingGenerate(
      params.prompt,
      // responseOutput callback - called for each chunk as it arrives
      (chunk: string) => {
        // Queue the chunk first, then resolve if someone is waiting
        chunks.push(chunk);
        if (pendingResolve) {
          // Someone is waiting - give them the chunk immediately
          const nextChunk = chunks.shift()!;
          pendingResolve({ value: { response: nextChunk }, done: false });
          pendingResolve = null;
        }
      },
      // contextOutput callback
      null,
      // fullResponseOutput callback
      null,
      // statsOutput callback
      null
    ).then(() => {
      isComplete = true;
      // If someone is waiting, notify them we're done
      if (pendingResolve) {
        pendingResolve({ value: undefined, done: true });
        pendingResolve = null;
      }
    }).catch((err: any) => {
      error = err;
      isComplete = true;
      // Clear the queue on error to avoid returning stale chunks
      chunks.splice(0);
      if (pendingResolve) {
        pendingResolve({ value: undefined, done: true });
        pendingResolve = null;
      }
    });
    
    // Return an async iterator that yields chunks as they arrive
    return {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<{ response: string }>> => {
          // If there's an error, throw it immediately (no chunks should be returned after error)
          if (error) {
            throw error;
          }
          
          // If we have queued chunks, return one immediately
          if (chunks.length > 0) {
            const chunk = chunks.shift()!;
            return Promise.resolve({ value: { response: chunk }, done: false });
          }
          
          // If streaming is complete, we're done
          if (isComplete) {
            return Promise.resolve({ value: undefined, done: true });
          }
          
          // Otherwise, wait for the next chunk
          return new Promise((resolve) => {
            pendingResolve = resolve;
          });
        }
      })
    };
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
            "Editor-Version": COPILOT_EDITOR_VERSION,
            "Editor-Plugin-Version": COPILOT_PLUGIN_VERSION,
            "User-Agent": COPILOT_USER_AGENT,
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
          "Editor-Version": COPILOT_EDITOR_VERSION,
          "Editor-Plugin-Version": COPILOT_PLUGIN_VERSION,
          "User-Agent": COPILOT_USER_AGENT,
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

export class MockLLMAPI extends LLMService {
  constructor() {
    super();
    this.api = null;
  }

  // Map of test prompts to expected commands
  private getCommandForPrompt(prompt: string): string {
    // Extract the actual user prompt from the system prompt
    const userPromptMatch = prompt.match(/Input:\s*(.+?)(?:\nResponse:|$)/);
    const userPrompt = userPromptMatch ? userPromptMatch[1].trim() : prompt;

    if (userPrompt.includes("Detect GPUs")) {
      return '{ "commands": ["lspci | grep -i vga"] }';
    } else if (userPrompt.includes("current date and time")) {
      return '{ "commands": ["date"] }';
    } else if (userPrompt.includes("available memory")) {
      return '{ "commands": ["free -h"] }';
    } else if (userPrompt.includes("largest file")) {
      return '{ "commands": ["find . -type f -exec ls -l {} + | sort -k 5 -nr | head -n 1"] }';
    } else if (userPrompt.includes("apache2")) {
      return '{ "commands": ["systemctl status apache2"] }';
    } else if (userPrompt.includes("Find sfsdfef")) {
      return '{ "commands": ["grep \'__LOZ_TEST_NO_OUTPUT_9f8b7c__\' README.md"] }';
    } else {
      // Default: return a safe echo command without user input
      return '{ "commands": ["echo Mock LLM - command not recognized"] }';
    }
  }

  public async completion(
    params: LLMSettings,
  ): Promise<{ content: string; model: string }> {
    if (DEBUG) {
      console.log("Mock LLM completion");
      console.log("Model: " + params.model);
    }

    const content = this.getCommandForPrompt(params.prompt);

    return {
      content,
      model: params.model,
    };
  }

  public async completionStream(params: LLMSettings): Promise<any> {
    // For mock, we don't really stream, just return the completion
    const completion = await this.completion(params);
    // Return an async iterator that yields the content
    return (async function* () {
      yield { choices: [{ delta: { content: completion.content } }] };
    })();
  }
}
