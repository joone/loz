import * as fs from "fs";
import * as path from "path";

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

  loadConfig(configPath: string) {
    const configFilePath = path.join(configPath, "config.json");
    if (!fs.existsSync(configFilePath)) return false;
    let rawData: any = fs.readFileSync(configFilePath);
    let config = JSON.parse(rawData);

    for (let item of config.items) {
      this.set(item.name, item.value);
    }
    return true;
  }
}
