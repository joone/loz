import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

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

export class Config implements ConfigInterface {
  items: ConfigItemInterface[];
  configFilePath: string;

  constructor() {
    this.items = [];
    this.set("mode", "default");
    this.configFilePath = "";
  }

  add(item: ConfigItemInterface) {
    this.items.push(item);
  }

  get(name: string) {
    return this.items.find((item) => item.name === name);
  }

  set(name: string, value: string) {
    const item = this.get(name);
    if (item) {
      item.value = value;
    } else {
      this.add({ name, value });
    }
  }

  remove(name: string) {
    const item = this.get(name);
    if (item) {
      this.items = this.items.filter((item) => item.name !== name);
    }
  }

  print() {
    this.items.forEach((item) => {
      console.log(`  ${item.name}: ${item.value}`);
    });
  }

  async loadConfig(configPath: string) {
    this.configFilePath = path.join(configPath, "config.json");
    if (!fs.existsSync(this.configFilePath)) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const question = (query: string): Promise<string> => {
        return new Promise((resolve) => {
          rl.question(query, (answer) => {
            resolve(answer);
          });
        });
      };
      const name = await question("Choose your LLM service: (ollama, openai) ");

      if (name === "ollama") {
        console.log(
          `\nYou should install ${name} with llama2 and codellama models: see https://ollama.ai/download \n`
        );
      } else if (name === "openai") {
        console.log("set OPENAI_API_KEY in your environment variables");
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

  save() {
    const json = JSON.stringify(this, null, 2);
    fs.writeFileSync(this.configFilePath, json);
  }
}
