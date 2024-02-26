import { LLMSettings } from "../loz";
import OpenAI from "openai";
import { Ollama } from "ollama-node";

const DEBUG = process.env.LOZ_DEBUG === "true" ? true : false;
abstract class LLMService {
  api: any;
  async completion(params: LLMSettings) {
    return { content: "", model: "" };
  }

  async completionStream(params: LLMSettings) {
    return null;
  }
}

export class OpenAiAPI extends LLMService {
  constructor(apiKey: string) {
    super();
    this.api = new OpenAI({ apiKey });
  }
  async completion(params: LLMSettings) {
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

  async completionStream(params: LLMSettings) {
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
    let stream = await this.api.chat.completions.create(streaming_params);
    return stream;
  }
}

export class OllamaAPI extends LLMService {
  constructor() {
    super();
    this.api = new Ollama();
  }

  async completion(params: LLMSettings) {
    if (DEBUG) {
      console.log("Ollama completion");
      console.log("Prompt: " + params.prompt);
      console.log("Model: " + params.model);
    }
    await this.api.setModel(params.model);

    const result = await this.api.generate(params.prompt);

    return { content: result.output, model: params.model };
  }
}
