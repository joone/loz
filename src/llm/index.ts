import OpenAI from "openai";
import { Ollama } from "ollama-node";
import { DEBUG } from "../constant";

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
  abstract completion(params: LLMSettings): any;
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
    
    try {
      await this.api.setModel(params.model);
    } catch (error: any) {
      if (error.message && error.message.includes("not found")) {
        console.error(`\nError: Model '${params.model}' not found.\n`);
        
        try {
          const { models } = await this.api.listModels();
          if (models && models.length > 0) {
            console.log("Available models:");
            models.forEach((model: string) => console.log(`  - ${model}`));
            console.log(
              `\nTo install '${params.model}', run: ollama run ${params.model}`,
            );
          } else {
            console.log("No models are currently installed.");
            console.log(
              `\nTo install '${params.model}', run: ollama run ${params.model}`,
            );
          }
        } catch (listError) {
          console.log(
            `\nTo install '${params.model}', run: ollama run ${params.model}`,
          );
        }
        
        console.log(
          "\nFor more information, see https://ollama.ai/download\n",
        );
        process.exit(1);
      }
      throw error;
    }

    const result = await this.api.generate(params.prompt);

    return { content: result.output, model: params.model };
  }

  public async completionStream(params: LLMSettings): Promise<any> {
    return {};
  }
}

export class CopilotAPI extends LLMService {
  constructor(apiKey: string, baseURL: string) {
    super();
    this.api = new OpenAI({
      apiKey,
      baseURL,
      defaultQuery: { "api-version": "2024-02-15-preview" },
      defaultHeaders: { "api-key": apiKey },
    });
  }

  public async completion(
    params: LLMSettings,
  ): Promise<{ content: string; model: string }> {
    if (DEBUG) {
      console.log("Copilot (Azure OpenAI) completion");
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
      console.log("Copilot (Azure OpenAI) stream completion");
      console.log("Model: " + params.model);
    }
    const stream = await this.api.chat.completions.create(streaming_params);
    return stream;
  }
}
