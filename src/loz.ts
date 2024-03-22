import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as readlinePromises from "readline/promises";
import { OpenAiAPI, OllamaAPI, LLMSettings } from "./llm";
import { CommandLinePrompt } from "./prompt";
import { ChatHistoryManager, PromptAndAnswer } from "./history";
import { runCommand, runShellCommand, checkGitRepo } from "./utils";
import { DEBUG, LOG_DEV_PATH } from "./constant";
import {
  Config,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OPENAI_MODEL,
  requestApiKey,
} from "./config";
import { Git } from "./git";

// Get the path to the home directory
const HOME_PATH = os.homedir() || "";

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
  chatHistoryManager: ChatHistoryManager;
  configPath: string;
  config: Config = new Config();
  git: Git = new Git();
  attribution: boolean = false;
  safeMode: boolean = false;

  constructor() {
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

    const dirPath = checkGitRepo() ? LOG_DEV_PATH : this.configPath;
    this.chatHistoryManager = new ChatHistoryManager(dirPath);
  }

  public async init(): Promise<void> {
    if (checkGitRepo() === true) {
      if (!fs.existsSync(LOG_DEV_PATH)) {
        fs.mkdirSync(LOG_DEV_PATH);
      }
    }

    await this.initLLMfromConfig();
  }

  public enableSafe(): void {
    this.safeMode = true;
  }

  // load config from JSON file
  private async initLLMfromConfig(): Promise<void> {
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(this.configPath);
    }

    await this.config.loadConfig(this.configPath);

    const api = this.checkAPI() || "openai";

    if (api === "ollama") {
      const result = await runShellCommand("ollama --version");
      if (DEBUG) console.log(result);
      if (result.indexOf("ollama") === -1) {
        console.log(
          "Please install ollama with llama2 and codellama first: see https://ollama.ai/download \n",
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

    // Check if the attribution is enabled
    const attributionValue = this.config.get("attribution")?.value;
    if (attributionValue === "false") {
      this.config.set("attribution", "false");
      this.attribution = false;
    } else {
      if (attributionValue === "true") {
        this.attribution = true;
      } else {
        this.attribution = false;
      }
    }
  }

  private checkAPI(): string | undefined {
    //console.log("API: " + this.config.get("api")?.value);
    return this.config.get("api")?.value;
  }

  public async completeUserPrompt(prompt: string): Promise<any> {
    const params = this.defaultSettings;
    params.max_tokens = 500;
    params.prompt = prompt;
    const completion = await this.llmAPI.completion(params);

    const promptAndCompleteText: PromptAndAnswer = {
      mode: "",
      model: completion.model,
      prompt: prompt,
      answer: completion.content,
    };
    this.chatHistoryManager.addChat(promptAndCompleteText);

    return completion;
  }

  // loz commit
  public async runGitCommit(context?: string): Promise<string | undefined> {
    let diff = await this.git.getDiffFromStaged();

    // Remove the first line of the diff
    diff = diff.replace(/.*\n/, "");

    let prompt: string;
    if (context) {
      prompt = promptForGIT.replace("code changes", "context and code changes");
      prompt =
        prompt.replace(
          "Code Changes:",
          "Context:\n" + context + "\n\nCode Changes:",
        ) +
        diff +
        "\n" +
        "Commit Message: ";
    } else {
      prompt = promptForGIT + diff + "\n" + "Commit Message: ";
    }

    const params = this.defaultSettings;
    params.max_tokens = 500;
    params.prompt = prompt;

    const complete = await this.llmAPI.completion(params);
    if (complete.content === "") {
      console.log("Failed to generate a commit message");
      return undefined;
    }

    try {
      if (this.attribution) {
        await this.git.commit(
          complete.content + "\n\nGenerated by " + complete.model,
        );
      } else {
        await this.git.commit(complete.content);
      }

      const commitHEAD = await this.git.showHEAD();
      console.log("\n# Generated commit message: \n");
      console.log(commitHEAD);
    } catch (error: any) {
      console.log(error);
      return undefined;
    }

    const promptAndCompleteText: PromptAndAnswer = {
      mode: "loz commit mode",
      model: complete.model,
      prompt: prompt,
      answer: complete.content,
    };
    this.chatHistoryManager.addChat(promptAndCompleteText);

    return complete.content;
  }

  // git diff | loz --git
  public async generateGitCommitMessage(diff: string): Promise<any> {
    if (DEBUG) console.log("writeGitCommitMessage");
    const params = this.defaultSettings;
    params.max_tokens = 500;
    params.prompt = promptForGIT + diff + "\n" + "Commit Message: ";

    const completion = await this.llmAPI.completion(params);

    const promptAndCompleteText: PromptAndAnswer = {
      mode: "loz --git",
      model: completion.model,
      prompt: params.prompt,
      answer: completion.content,
    };
    this.chatHistoryManager.addChat(promptAndCompleteText);

    return completion;
  }

  // Interactive mode
  private async runCompletion(params: LLMSettings): Promise<void> {
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

    const promptAndCompleteText: PromptAndAnswer = {
      mode: "interactive",
      model: params.model,
      prompt: params.prompt,
      answer: curCompleteText,
    };
    this.chatHistoryManager.addChat(promptAndCompleteText);
  }

  public runPromptInteractiveMode(): Promise<any> {
    return new Promise((resolve, reject) => {
      const cli = new CommandLinePrompt(async (input: string) => {
        const tokens = input.split(" ");
        if (input === "exit" || input === "quit") {
          cli.exit();
          resolve("Done");
          return;
        } else if (input.indexOf("config") === 0 && tokens.length <= 3) {
          await this.handleConfigCommand(tokens);
        } else if (input.length !== 0) {
          const params = this.defaultSettings;
          params.prompt = input;
          params.max_tokens = 4000;
          await this.runCompletion(params);
        }
        cli.prompt();
      });
      cli.start(true);
    });
  }

  private async handleConfigCommand(tokens: string[]): Promise<void> {
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

  public async setAPI(api: string, model?: string): Promise<void> {
    if (api === "ollama" || api === "openai") {
      this.config.set("api", api);
    }

    if (model) {
      this.config.set("model", model);
    }

    this.config.save();
    await this.initLLMfromConfig();
  }

  public async handlePrompt(prompt: string): Promise<void> {
    const systemPrompt =
      "Decide if the following prompt can be translated into Linux commands. " +
      "If yes, generate only the corresponding Linux commands in JSON format, assuming the current directory is '.'. " +
      "If no, provide an explanation in plain text.\n\n" +
      "Input: " +
      prompt +
      "\nResponse: ";

    const completion = await this.completeUserPrompt(systemPrompt + prompt);

    // If the completion is not a JSON object, but a plain text.
    if (!completion.content.startsWith("{")) {
      console.log(completion.content);
      const promptAndCompleteText = {
        mode: "regular mode",
        model: completion.model,
        prompt: systemPrompt,
        answer: completion.content,
      };
      this.chatHistoryManager.addChat(promptAndCompleteText);
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

    // Add the command to the chat history
    const promptAndCompleteText = {
      mode: "command generation mode",
      model: completion.model,
      prompt: systemPrompt,
      answer: completion,
    };
    this.chatHistoryManager.addChat(promptAndCompleteText);

    if (this.safeMode === false) {
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
        `Do you want to run this command?: ${linuxCommand} (y/n) `,
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

  public close(): void {
    this.chatHistoryManager.saveChatHistory();
  }
}
