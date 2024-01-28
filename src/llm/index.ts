import { LLMSettings } from "../";
import OpenAI from "openai";
import { Ollama } from "ollama-node";

abstract class LLMService {
  api: any;
  async completion(params: LLMSettings) {
    return "";
  }
}

export class OpenAiAPI extends LLMService {
  constructor() {
    super();
    this.api = new OpenAI();
  }
  async completion(params: LLMSettings) {
    const gptParams: OpenAI.Chat.ChatCompletionCreateParams = {
      model: "gpt-3.5-turbo",
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
      return "";
    }

    return completion.choices[0]?.message?.content;
  }
}

export class OllamaAPI extends LLMService {
  constructor() {
    super();
    this.api = new Ollama();
  }

  async completion(params: LLMSettings) {
    console.log("Ollama completion");
    console.log("Prompt: " + params.prompt);
    console.log("Model: " + params.model);
    await this.api.setModel(params.model);

    const result = await this.api.generate(params.prompt);

    return result.output;
  }
}
