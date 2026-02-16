import OpenAI from "openai";
import { Ollama } from "ollama-node";
import { Readable } from "stream";
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

    // Create a readable stream that will emit chunks from Ollama
    // Using push mode (empty read()) since chunks are pushed from callbacks
    const stream = new Readable({
      read() {
        // Push mode: chunks are pushed from streamingGenerate callbacks
      },
    });

    // Use streamingGenerate to get streaming output
    this.api
      .streamingGenerate(
        params.prompt,
        (chunk: any) => {
          // responseOutput callback - emit each chunk
          if (chunk && chunk.response) {
            stream.push(JSON.stringify({ content: chunk.response }));
          }
        },
        null, // contextOutput
        null, // fullResponseOutput
        (stats: any) => {
          // statsOutput callback - end the stream when done
          if (stats && stats.done) {
            stream.push(null); // Signal end of stream
          }
        },
      )
      .catch((error: any) => {
        stream.destroy(error);
      });

    return stream;
  }
}
