import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

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

  constructor() {
    this.items = [];
    this.set("mode", "default");
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
    const configFilePath = path.join(configPath, "config.json");
    if (!fs.existsSync(configFilePath)) {
      const name = await question(
        "Which LLM servide do you want to use? (ollama, openai) "
      );

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

      fs.writeFileSync(configFilePath, this.toString());

      return false;
    }
    let rawData: any = fs.readFileSync(configFilePath);
    let config = JSON.parse(rawData);

    for (let item of config.items) {
      this.set(item.name, item.value);
    }
    rl.close();
    return true;
  }
}
