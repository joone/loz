import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import * as readlinePromises from "readline/promises";
import { exec } from "child_process";
import { OpenAiAPI, OllamaAPI } from "./llm";

import { ChatHistory } from "./history";
import {
  Config,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OPENAI_MODEL,
  requestApiKey,
} from "./config";
import { Git } from "./git";

require("dotenv").config();

const DEBUG = process.env.LOZ_DEBUG === "true" ? true : false;
// Get the path to the home directory
const HOME_PATH = os.homedir() || "";
const LOG_DEV_PATH = "logs";

function runShellCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`stderr: ${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
}

const promptForGIT =
  "Generate a Git commit message based on the following code changes. Ensure the message adheres to the following guidelines:\n\n" +
  "1. Separate the subject from the body with a blank line.\n" +
  "2. Limit the subject line to 50 characters and capitalize it.\n" +
  "3. Use the imperative mood in the subject line.\n" +
  "4. The message should only include the subject and body, focusing on committing message, not the actual commit command.\n" +
  "5. Wrap the body at 72 characters.\n" +
  "6. Use the body to explain the 'what' and 'why', not the 'how'.\n" +
  "7. Do not include the issue number or code diff in the body.\n\n" +
  "Code Changes:\n";

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

export class Loz {
  llmAPI: any;
  defaultSettings: LLMSettings;
  chatHistory: ChatHistory = { date: "", dialogue: [] };
  configPath: string;
  config: Config = new Config();
  git: Git = new Git();

  constructor(llmAPI?: string) {
    this.defaultSettings = {
      model: DEFAULT_OPENAI_MODEL,
      prompt: "",
      temperature: 0,
      max_tokens: 60,
      top_p: 1.0,
      stream: true,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    };
    this.configPath = "";
  }

  async init() {
    // Create a config for the application
    this.configPath = path.join(HOME_PATH, ".loz");
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(this.configPath);
    }

    if (this.checkGitRepo() === true) {
      if (!fs.existsSync(LOG_DEV_PATH)) {
        fs.mkdirSync(LOG_DEV_PATH);
      }
    }

    await this.initLLMfromConfig();
  }

  // load config from JSON file
  async initLLMfromConfig() {
    await this.config.loadConfig(this.configPath);

    const api = this.checkAPI() || "openai";

    if (api === "ollama") {
      const result = await runShellCommand("ollama --version");
      if (DEBUG) console.log(result);
      if (result.indexOf("ollama") === -1) {
        console.log(
          "Please install ollama with llama2 and codellama first: see https://ollama.ai/download \n"
        );
        process.exit(1);
      }
      this.llmAPI = new OllamaAPI();
      this.defaultSettings.model =
        this.config.get("model")?.value || DEFAULT_OLLAMA_MODEL;
      return;
    }

    // For OpenAI API
    let apiKey = this.config.get("openai.apikey")?.value;
    if (!apiKey) {
      const rl = readlinePromises.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      apiKey = await requestApiKey(rl);
      this.config.set("openai.apikey", apiKey);
      this.config.save();
      rl.close();
    }
    this.llmAPI = new OpenAiAPI(apiKey);

    this.defaultSettings.model =
      this.config.get("model")?.value || DEFAULT_OPENAI_MODEL;
  }

  checkAPI() {
    //console.log("API: " + this.config.get("api")?.value);
    return this.config.get("api")?.value;
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
      : path.join(this.configPath, fileName);
    this.chatHistory.date = date.toString();
    if (DEBUG) console.log(this.chatHistory);
    const json = JSON.stringify(this.chatHistory, null, 2);

    fs.writeFileSync(filePath, json);
  }

  // Handle the input from the pipe
  async handlePipeInput(prompt: string) {
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", async (data: String) => {
      let params: LLMSettings;
      params = this.defaultSettings;
      params.max_tokens = 500;
      params.prompt =
        "Based on the data provided below, " + prompt + ":\n" + data;

      const completion = await this.llmAPI.completion(params);
      process.stdout.write(completion.content);
      process.stdout.write("\n");
    });
  }

  async completeUserPrompt(prompt: string) {
    let params: LLMSettings;
    params = this.defaultSettings;
    params.max_tokens = 500;
    params.prompt = prompt;
    return await this.llmAPI.completion(params);
  }

  async runGitCommit() {
    let diff = await this.git.getDiffFromStaged();

    // Remove the first line of the diff
    diff = diff.replace(/.*\n/, "");

    const prompt = promptForGIT + diff + "\n" + "Commit Message: ";

    let params: LLMSettings;
    params = this.defaultSettings;
    params.max_tokens = 500;
    params.prompt = prompt;

    const complete = await this.llmAPI.completion(params);
    if (complete.content === "") {
      console.log("Failed to generate a commit message");
      return;
    }

    try {
      await this.git.commit(
        complete.content + "\n\nGenerated by " + complete.model
      );
      const res = await this.git.showHEAD();
      console.log("Generated commit message:");
      console.log(res);
    } catch (error: any) {
      console.log(error);
      return;
    }

    const promptAndCompleteText = {
      mode: "loz commit mode",
      prompt: prompt,
      answer: complete.content,
    };
    this.chatHistory.dialogue.push(promptAndCompleteText);

    return complete.content;
  }

  // git diff | loz --git
  async generateGitCommitMessage() {
    if (DEBUG) console.log("writeGitCommitMessage");

    process.stdin.setEncoding("utf8");

    process.stdin.on("data", async (data: String) => {
      // Remove the first line from data
      // because it is not needed for GPT-3.
      data = data.replace(/.*\n/, "");
      // Remove Author and Date from commit message
      // because it is not needed for GPT-3.
      const diff = data
        .toString()
        .replace(/Author: .*\n/, "")
        .replace(/Date: .*\n/, "");

      let params: LLMSettings;
      params = this.defaultSettings;
      params.max_tokens = 500;
      params.prompt = promptForGIT + diff + "\n" + "Commit Message: ";

      const complete = await this.llmAPI.completion(params);
      if (complete.content === "") {
        console.log("Failed to generate a commit message");
        return;
      }

      process.stdout.write(
        complete.content + "\n\nGenerated by " + complete.model + "\n"
      );
    });

    process.stdin.on("end", () => {
      //process.exit();
    });
  }

  // Interactive mode
  async runCompletion(params: LLMSettings, rl: any) {
    let curCompleteText = "";
    if (this.checkAPI() === "openai") {
      let stream: any;
      try {
        stream = await this.llmAPI.completionStream(params);
      } catch (error: any) {
        console.log(error.message + ":");
        if (error.response) {
          // console.log(error.response.data);
          if (error.response.status === 401) {
            console.log("Invalid API key");
          } else if (error.response.status === 429) {
            console.log("API request limit reached");
          }
        }
        process.exit();
      }

      try {
        for await (const data of stream) {
          if (data === null) return;
          const streamData = data.choices[0]?.delta?.content || "";
          curCompleteText += streamData;
          process.stdout.write(streamData);
        }
        process.stdout.write("\n");
      } catch (error) {
        console.error("An error occurred during OpenAI request: ", error);
      }
    } else {
      const complete = await this.llmAPI.completion(params);
      curCompleteText = complete.content;
      process.stdout.write(curCompleteText);
      process.stdout.write("\n");
    }

    const promptAndCompleteText = {
      mode: "interactive",
      prompt: params.prompt,
      answer: curCompleteText,
    };
    this.chatHistory.dialogue.push(promptAndCompleteText);

    rl.prompt();
  }

  async runPromptInteractiveMode() {
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Output the current mode.
      this.config.print();

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
      rl.on("line", async (input: string) => {
        // Tokenize the input with space as the delimiter
        const tokens = input.split(" ");
        if (input === "exit" || input === "quit") {
          resolve("Done");
        } else if (input.indexOf("config") === 0 && tokens.length <= 3) {
          if (tokens.length === 3) {
            if (this.config.set(tokens[1], tokens[2]) === false) {
              rl.prompt();
              return;
            }

            if (this.config.get(tokens[1]) !== undefined) {
              console.log(
                `The ${tokens[1]} has been updated to '${tokens[2]}'`
              );
            }
            this.config.save();
            rl.close();
            // Restart the interactive mode.
            await this.initLLMfromConfig();
            resolve("Run");
          } else if (tokens.length === 2) {
            console.log(this.config.get(tokens[1]));
          } else if (tokens.length === 1) {
            this.config.print();
          } else {
            console.log("Invalid command");
          }
          rl.prompt();
        } else if (input.length !== 0) {
          let mode = this.config.get("mode")?.value;
          // ESL: English as a Second Language
          if (this.config.get("mode")?.value === "esl") {
            this.defaultSettings.prompt =
              "Rephrase the following question to make it sound more natural and asnwer the question: \n";
          } else if (this.config.get("mode")?.value === "proofread") {
            this.defaultSettings.prompt =
              "Can you proofread the following setnence? Show me the difference between the given sentence and your correction.\n";
          }

          let params: LLMSettings;
          params = this.defaultSettings;
          params.prompt = input;
          params.max_tokens = 4000;
          this.runCompletion(params, rl);
        }
      });

      // Handle CTRL+C to exit the program
      rl.on("SIGINT", () => {
        rl.close();
        resolve("Done");
      });
    });
  }

  // check if the program is running in it's git repository.
  checkGitRepo() {
    const gitRepoPath = path.join(__dirname, "../.git");
    if (DEBUG) console.log(gitRepoPath);
    if (fs.existsSync(gitRepoPath)) {
      return true;
    }
    return false;
  }
}
