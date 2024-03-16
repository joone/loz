import * as fs from "fs";
import * as path from "path";
import * as readlinePromises from "readline/promises";

export const DEFAULT_OLLAMA_MODEL = "llama2";
export const DEFAULT_OPENAI_MODEL = "gpt-3.5-turbo";

interface ConfigInterface {
  items: ConfigItemInterface[];
}

interface ConfigItemInterface {
  name: string;
  value: string;
}

export class ConfigItem implements ConfigItemInterface {
  name: string;
  value: string;

  constructor(name: string, value: string) {
    this.name = name;
    this.value = value;
  }
}

export const requestApiKey = async (
  rl: readlinePromises.Interface
): Promise<string> => {
  for (const key of ["LOZ_OPENAI_API_KEY", "OPENAI_API_KEY"]) {
    const value = process.env[key];
    if (value) {
      const useApiKeyFromEnv = await rl.question(
        `\n${key} found in environment variables. Do you want to use it? (y/n) `
      );
      if (useApiKeyFromEnv.toLowerCase() === "y") {
        return value;
      }
      if (useApiKeyFromEnv.toLowerCase() !== "n") {
        console.log("Received the wrong answer. Please try again.");
        return await requestApiKey(rl);
      }
    }
  }

  const apiKey = await rl.question("Enter your OpenAI API key:\n> ");
  if (!apiKey) {
    console.log("Received the wrong answer. Please try again.");
    return await requestApiKey(rl);
  }
  return apiKey;
};

const requestApiName = async (
  rl: readlinePromises.Interface
): Promise<string> => {
  const res = await rl.question("Choose your LLM service: (ollama, openai) ");
  if (!["ollama", "openai"].includes(res)) {
    console.log("Received the wrong answer. Please try again.");
    return await requestApiName(rl);
  }
  return res;
};

export class Config implements ConfigInterface {
  items: ConfigItemInterface[];
  configFilePath: string;

  constructor() {
    this.items = [];
    this.set("mode", "default");
    this.configFilePath = "";
  }

  public add(item: ConfigItemInterface): void {
    this.items.push(item);
  }

  public get(name: string): ConfigItemInterface | undefined {
    return this.items.find((item) => item.name === name);
  }

  public set(name: string, value: string): boolean {
    // Update the model if the API is changed
    if (name === "api") {
      this.setInternal("api", value);
      if (value === "openai")
        this.setInternal(
          "model",
          this.get("openai.model")?.value || DEFAULT_OPENAI_MODEL
        );
      else if (value === "ollama")
        this.setInternal(
          "model",
          this.get("ollama.model")?.value || DEFAULT_OLLAMA_MODEL
        );
      else {
        console.log("Invalid API");
        return false;
      }
    } else if (name === "model") {
      if (value === "gpt-3.5-turbo") {
        this.setInternal("api", "openai");
      } else {
        this.setInternal("ollama.model", value);
        this.setInternal("api", "ollama");
      }
    }

    const item = this.get(name);
    if (item) {
      item.value = value;
    } else {
      this.add({ name, value });
    }
    return true;
  }

  private setInternal(name: string, value: string): void {
    const item = this.get(name);
    if (item) {
      item.value = value;
    } else {
      this.add({ name, value });
    }
  }

  public remove(name: string): void {
    const item = this.get(name);
    if (item) {
      this.items = this.items.filter((item) => item.name !== name);
    }
  }

  public printAll(): void {
    this.items.forEach((item) => {
      console.log(`  ${item.name}: ${item.value}`);
    });
  }

  public print(): void {
    console.log(`  api: ${this.get("api")?.value}`);
    console.log(`  model: ${this.get("model")?.value}`);
  }

  public async loadConfig(configPath: string): Promise<boolean> {
    this.configFilePath = path.join(configPath, "config.json");
    if (!fs.existsSync(this.configFilePath)) {
      const rl = readlinePromises.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const name = await requestApiName(rl);

      this.set("openai.model", DEFAULT_OPENAI_MODEL);
      this.set("ollama.model", DEFAULT_OLLAMA_MODEL);
      if (name === "ollama") {
        this.set("model", DEFAULT_OLLAMA_MODEL);
        console.log(
          `\nYou should install ${name} with llama2 and codellama models: see https://ollama.ai/download \n`
        );
      } else if (name === "openai") {
        this.set("model", DEFAULT_OPENAI_MODEL);
        const newApiKey = await requestApiKey(rl);
        this.set("openai.apikey", newApiKey);
      }
      this.set("mode", "default");
      this.set("api", name);
      rl.close();

      this.save();

      return false;
    }
    let rawData: any = fs.readFileSync(this.configFilePath);
    let config = JSON.parse(rawData);

    for (let item of config.items) {
      this.set(item.name, item.value);
    }
    return true;
  }

  public save(): void {
    const json = JSON.stringify(this, null, 2);
    fs.writeFileSync(this.configFilePath, json);
  }
}
