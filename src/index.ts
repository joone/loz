import * as yargs from "yargs";
import * as fs from "fs";
import * as path from "path";
import { ChatHistory, PromptAndAnswer } from "./history";

const readline = require("readline");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const DEBUG = process.env.DEBUG === "true" ? true : false;
// Get the path to the home directory
const HOME_PATH = process.env.HOME || "";
const LOG_DEV_PATH = "logs";

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
  chatHistory: ChatHistory = { date: "", dialogue: [] };
  curPromptAndAnswer: PromptAndAnswer = { prompt: "", answer: "" };
  configfPath: string;
  curCompleteText: string = "";

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

    // Create a config for the application
    this.configfPath = path.join(HOME_PATH, ".loz");
    if (!fs.existsSync(this.configfPath)) {
      fs.mkdirSync(this.configfPath);
    }

    if (this.checkGitRepo() === true) {
      if (!fs.existsSync(LOG_DEV_PATH)) {
        fs.mkdirSync(LOG_DEV_PATH);
      }
    }
  }

  checkEnv() {
    if (process.env.OPENAI_API_KEY === undefined) {
      console.error("Please set OPENAI_API_KEY in your environment variables");
      // system end
      process.exit(1);
    }
  }

  // Save chat history (JSON) to file.
  async saveChatHistory() {
    const date = new Date();

    const fileName =
      date.getFullYear() +
      "-" +
      (date.getMonth() + 1) +
      "-" +
      date.getDate() +
      "-" +
      date.getHours() +
      "-" +
      date.getMinutes() +
      "-" +
      date.getSeconds() +
      ".json";
    const filePath = this.checkGitRepo()
      ? path.join(LOG_DEV_PATH, fileName)
      : path.join(this.configfPath, fileName);
    this.chatHistory.date = date.toString();
    if (DEBUG) console.log(this.chatHistory);
    const json = JSON.stringify(this.chatHistory, null, 2);

    fs.writeFileSync(filePath, json);
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
      process.stdout.write("\n");
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
              this.curPromptAndAnswer.answer = this.curCompleteText;
              this.chatHistory.dialogue.push(this.curPromptAndAnswer);
              this.curCompleteText = "";

              rl.prompt();
            }
            return; // Stream finished
          }
          try {
            // Handle the stream message (partial completion).
            const parsed = JSON.parse(message);
            // check if the prompt only has white space.
            if (parsed.choices[0].text.trim() === "") {
              // if so, don't add it to the prompt.
              return;
            }
            process.stdout.write(parsed.choices[0].text);
            this.curCompleteText += parsed.choices[0].text;
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

  runPromptIntractive() {
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
        console.log("Good bye!");
        this.saveChatHistory();
        process.exit(0);
      }

      if (input.length !== 0) {
        this.defaultSettings.prompt += input;
        this.defaultSettings.max_tokens = 4000;
        this.runCompletion(this.defaultSettings, rl);
        this.curPromptAndAnswer = new PromptAndAnswer(input, "");
      }
    });

    // Handle CTRL+C to exit the program
    rl.on("SIGINT", () => {
      rl.close();
      console.log("Good bye!");
      this.saveChatHistory();
      process.exit(0);
    });
  }

  // check if the program is running in it's git repository.
  checkGitRepo() {
    const gitRepoPath = path.join(__dirname, "../.git");
    if (fs.existsSync(gitRepoPath)) {
      return true;
    }
    return false;
  }
}
