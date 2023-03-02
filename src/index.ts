import * as yargs from "yargs";
const readline = require("readline");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const DEBUG = process.env.DEBUG === "true" ? true : false;

interface GPTSettings {
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

export class Loz {
  defaultSettings: GPTSettings;
  openai: any;

  constructor() {
    this.checkEnv();
    this.defaultSettings = {
      model: "text-davinci-003",
      prompt: "",
      temperature: 0,
      max_tokens: 60,
      top_p: 1.0,
      stream: true,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    };
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  checkEnv() {
    if (process.env.OPENAI_API_KEY === undefined) {
      console.error("Please set OPENAI_API_KEY in your environment variables");
      // system end
      process.exit(1);
    }
  }

  answerAnyQuestion(prompt: string) {
    let promptUnpdated: string = prompt + ": ";
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", async (data: String) => {
      this.defaultSettings.prompt = promptUnpdated + data;
      this.defaultSettings.stream = false;
      this.defaultSettings.max_tokens = 500;
      const res = await this.openai.createCompletion(this.defaultSettings);
      process.stdout.write(res.data.choices[0].text);
    });
  }

  writeGitCommitMessage() {
    const prompt =
      "Please generate a Git commit message that summarizes the changes made in the diff: ";
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", async (data: String) => {
      this.defaultSettings.prompt = prompt + data;
      this.defaultSettings.stream = false;
      this.defaultSettings.max_tokens = 500;
      const res = await this.openai.createCompletion(this.defaultSettings);
      process.stdout.write(res.data.choices[0].text);
    });

    process.stdin.on("end", () => {
      //process.exit();
    });
  }

  async runCompletion(settings: any, rl: any) {
    const res = await this.openai.createCompletion(settings, {
      responseType: "stream",
    });
    if (DEBUG === true) console.log(res.data);

    try {
      res.data.on("data", (data: any) => {
        const lines = data
          .toString()
          .split("\n")
          .filter((line: any) => line.trim() !== "");
        for (const line of lines) {
          const message = line.replace(/^data: /, "");
          if (message === "[DONE]") {
            process.stdout.write("\n");
            process.stdout.write("\n");
            if (rl !== undefined) {
              rl.prompt();
            }
            return; // Stream finished
          }
          try {
            const parsed = JSON.parse(message);
            process.stdout.write(parsed.choices[0].text);
          } catch (error) {
            console.error(
              "Could not JSON parse stream message",
              message,
              error
            );
          }
        }
      });
    } catch (error) {
      console.error("An error occurred during OpenAI request: ", error);
    }
  }

  handlePrompt() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Set the prompt to display before each input
    rl.setPrompt("> ");

    // Show the cursor and prompt the user for input
    rl.prompt();

    // Set the terminal to raw mode to allow for cursor manipulation
    process.stdin.setRawMode(true);

    // Display a blinking cursor
    setInterval(() => {
      process.stdout.write("\x1B[?25h");
      setTimeout(() => {
        process.stdout.write("\x1B[?25l");
      }, 500);
    }, 1000);

    // Listen for user input
    rl.on("line", (input: string) => {
      if (input === "exit" || input === "quit") {
        console.log("Goodbye!");
        process.exit(0);
      }

      if (input.length !== 0) {
        this.defaultSettings.prompt = input;
        this.defaultSettings.max_tokens = 4000;
        this.runCompletion(this.defaultSettings, rl);
      }
    });

    // Handle CTRL+C to exit the program
    rl.on("SIGINT", () => {
      rl.close();
      console.log("Goodbye!");
      process.exit(0);
    });
  }
}
