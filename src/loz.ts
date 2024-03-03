import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import * as readlinePromises from "readline/promises";
import { exec, spawn } from "child_process";
import { OpenAiAPI, OllamaAPI, LLMSettings } from "./llm";
import { CommandLinePrompt } from "./prompt";

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
const LOZ_SAFE = process.env.LOZ_SAFE === "true" ? true : false;
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

// Function to run a command and stream its stdout directly to the terminal
function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    //const [cmd, ...args] = command.split(/\s+/); // Split the command and its arguments
    const child = spawn("bash", ["-c", command]);
    let stdoutData = "";
    let stderrData = "";

    child.stdout.on("data", (data: any) => {
      stdoutData += data; // Accumulate stdout data
      process.stdout.write(data); // Write stdout data to the terminal
    });

    child.stderr.on("data", (data: any) => {
      stderrData += data; // Accumulate stderr data
      process.stderr.write(data); // Write stderr data to the terminal
    });

    child.on("error", (error: any) => {
      console.error(`Execution Error: ${error.message}`);
      reject(error); // Reject the promise on spawn error
    });

    child.on("close", (code: any) => {
      if (code === 2) {
        reject("No output: " + code);
      } else if (code !== 0) {
        console.log(`Process exited with code: ${code}`);
        // Check if both stdout and stderr are empty
        if (!stdoutData && !stderrData) {
          reject("No output: " + code);
        } else {
          reject(new Error(`Process exited with code: ${code}`));
        }
      } else {
        resolve(); // Resolve the promise when the process closes successfully
      }
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
    this.configPath = path.join(HOME_PATH, ".loz");
  }

  async init() {
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
      const commitHEAD = await this.git.showHEAD();
      console.log("\n# Generated commit message: \n");
      console.log(commitHEAD);
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
  async generateGitCommitMessage(diff: string) {
    if (DEBUG) console.log("writeGitCommitMessage");
    let params: LLMSettings;
    params = this.defaultSettings;
    params.max_tokens = 500;
    params.prompt = promptForGIT + diff + "\n" + "Commit Message: ";

    return await this.llmAPI.completion(params);
  }

  // Interactive mode
  async runCompletion(params: LLMSettings) {
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
  }

  runPromptInteractiveMode() {
    return new Promise((resolve, reject) => {
      let cli = new CommandLinePrompt(async (input: string) => {
        const tokens = input.split(" ");
        if (input === "exit" || input === "quit") {
          cli.exit();
          resolve("Done");
          return;
        } else if (input.indexOf("config") === 0 && tokens.length <= 3) {
          await this.handleConfigCommand(tokens);
        } else if (input.length !== 0) {
          let params: LLMSettings;
          params = this.defaultSettings;
          params.prompt = input;
          params.max_tokens = 4000;
          await this.runCompletion(params);
        }
        cli.prompt();
      });
      cli.start(true);
    });
  }

  async handleConfigCommand(tokens: string[]) {
    if (tokens.length === 3) {
      if (this.config.set(tokens[1], tokens[2]) === false) {
        return;
      }

      if (this.config.get(tokens[1]) !== undefined) {
        console.log(`The ${tokens[1]} has been updated to '${tokens[2]}'`);
      }
      this.config.save();
      // Restart the interactive mode.
      await this.initLLMfromConfig();
    } else if (tokens.length === 2) {
      console.log(this.config.get(tokens[1]));
    } else if (tokens.length === 1) {
      this.config.print();
    } else {
      console.log("Invalid command");
    }
  }

  async handlePrompt(prompt: string) {
    const internPrompt =
      "Decide if the following prompt can be translated into Linux commands. " +
      "If yes, generate only the corresponding Linux commands in JSON format, assuming the current directory is '.'. " +
      "If no, provide an explanation in plain text.\n\n" +
      "Input: " +
      prompt +
      "\nResponse: ";

    const completion = await this.completeUserPrompt(internPrompt + prompt);

    if (!completion.content.startsWith("{")) {
      console.log(completion.content);
      return;
    }

    if (DEBUG) console.log(completion.content);

    let json;
    try {
      json = JSON.parse(completion.content);
      if (DEBUG) console.log(JSON.stringify(json, null, 2));
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return;
    }

    let linuxCommand = json.commands ? json.commands : json.command;
    if (json.arguments && json.arguments.length > 0) {
      linuxCommand += " " + json.arguments.join(" ");
    }

    if (!LOZ_SAFE) {
      try {
        await runCommand(linuxCommand);
      } catch (error: any) {
        if (error.indexOf("No output") === 0) console.log(error);
        else console.error("Error running command:", error);
      }
      return;
    }

    let answer = "n";
    try {
      const rl = readlinePromises.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      answer = await rl.question(
        `Do you want to run this command?: ${linuxCommand} (y/n) `
      );
      rl.close();
    } catch (error) {
      console.error("Error during user interaction:", error);
    }

    if (answer.toLowerCase() === "y") {
      try {
        await runCommand(linuxCommand);
      } catch (error: any) {
        if (error.indexOf("No output") === 0) console.log(error);
        else console.error("Error running command:", error);
      }
    }
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
