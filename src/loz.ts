import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as readlinePromises from "readline/promises";
import { OpenAiAPI, OllamaAPI, CopilotAPI, LLMSettings } from "./llm";
import { CommandLinePrompt } from "./prompt";
import { ChatHistoryManager, PromptAndAnswer } from "./history";
import { runCommand, runShellCommand, checkGitRepo } from "./utils";
import { DEBUG, LOG_DEV_PATH } from "./constant";
import {
  Config,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_COPILOT_MODEL,
  requestApiKey,
  requestCopilotApiKey,
  requestCopilotEndpoint,
} from "./config";
import { Git } from "./git";

// Get the path to the home directory
const HOME_PATH = os.homedir() || "";

const promptForGIT =
  "Generate a Git commit message based on the following code changes.\n" +
  "Ensure the message adheres to the following guidelines:\n\n" +
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
          "Please install ollama first: see https://ollama.ai/download \n",
        );
        process.exit(1);
      }
      this.llmAPI = new OllamaAPI();
      this.defaultSettings.model =
        this.config.get("model")?.value || DEFAULT_OLLAMA_MODEL;
      return;
    }

    if (api === "copilot") {
      // For Copilot (Azure OpenAI) API
      let apiKey = this.config.get("copilot.apikey")?.value;
      let endpoint = this.config.get("copilot.endpoint")?.value;

      const rl = readlinePromises.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      if (!apiKey) {
        apiKey = await requestCopilotApiKey(rl);
        this.config.set("copilot.apikey", apiKey);
        this.config.save();
      }

      if (!endpoint) {
        endpoint = await requestCopilotEndpoint(rl);
        this.config.set("copilot.endpoint", endpoint);
        this.config.save();
      }

      rl.close();

      this.llmAPI = new CopilotAPI(apiKey, endpoint);
      this.defaultSettings.model =
        this.config.get("model")?.value || DEFAULT_COPILOT_MODEL;

      this.initAttribution();
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

    this.initAttribution();
  }

  private checkAPI(): string | undefined {
    //console.log("API: " + this.config.get("api")?.value);
    return this.config.get("api")?.value;
  }

  private initAttribution(): void {
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
      prompt =
        promptForGIT.replace(
          "code changes.",
          "context and code changes:\n" + "Context: " + context + ".\n",
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
    } catch (error: any) {
      console.error("Error running git commit:", error);
      return undefined;
    }
    const commitHEAD = await this.git.showHEAD();
    console.log("\n# Generated commit message: \n");
    console.log(commitHEAD);

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
    if (this.checkAPI() === "openai" || this.checkAPI() === "copilot") {
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
    if (api === "ollama" || api === "openai" || api === "copilot") {
      this.config.set("api", api);
    }

    if (model) {
      this.config.set("model", model);
    }

    this.config.save();
    await this.initLLMfromConfig();
  }

  public async handlePrompt(prompt: string): Promise<void> {

    // Improved OS and shell detection for VS Code/Windows
    const isWindows = process.platform === "win32";
    let shellType = "bash";
    if (isWindows) {
      const comspec = (process.env.ComSpec || "").toLowerCase();
      const shellEnv = (process.env.SHELL || "").toLowerCase();
      const termProgram = (process.env.TERM_PROGRAM || "").toLowerCase();
      if (comspec.includes("powershell") || shellEnv.includes("powershell") || shellEnv.includes("pwsh")) {
        shellType = "powershell";
      } else if (comspec.includes("cmd")) {
        shellType = "cmd";
      } else if (termProgram.includes("vscode")) {
        // VS Code default shell on Windows is often PowerShell
        shellType = "powershell";
      } else {
        shellType = "powershell"; // Default to PowerShell on Windows
      }
    }

    let systemPrompt = "";
    if (isWindows) {
      systemPrompt =
        `IMPORTANT: You are running on Windows using ${shellType}. ` +
        `Decide if the following prompt can be translated into Windows ${shellType} commands ONLY. ` +
        `If yes, generate ONLY the corresponding Windows ${shellType} commands in the following strict JSON format: { "commands": ["command1", "command2", ...] } (use Windows path syntax, e.g., C:\\Users). ` +
        `For example: { "commands": ["dir", "cd C:\\Users"] } ` +
        `DO NOT return Linux or bash commands. ` +
        `If no, provide an explanation in plain text.\n\n` +
        `Input: ` +
        prompt +
        `\nResponse: `;
    } else {
      systemPrompt =
        "Decide if the following prompt can be translated into Linux commands. " +
        "If yes, generate only the corresponding Linux commands in the following strict JSON format: { \"commands\": [\"command1\", \"command2\", ...] }, assuming the current directory is '.'. " +
        "For example: { \"commands\": [\"ls\", \"cd /tmp\"] } " +
        "If no, provide an explanation in plain text.\n\n" +
        "Input: " +
        prompt +
        "\nResponse: ";
    }
  
    const completion = await this.completeUserPrompt(systemPrompt + prompt);

    // Strip Markdown code block markers from LLM response before JSON parsing

    let content = completion.content.trim();
    // Debug: print the content after stripping code block markers
    if (DEBUG) {
      console.log("[DEBUG] LLM response content before JSON.parse:", content);
    }
    // Robustly strip Markdown code block markers (e.g., ```json ... ```)
    if (content.startsWith('```')) {
      // Remove the first line (``` or ```json) and the last line (```)
      content = content.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();
    }

    // Enforce strict JSON format: { "commands": [ ... ] }
    let json;
    try {
      json = JSON.parse(content);
    } catch (error) {
      console.error("Error parsing JSON. Expected format: { \"commands\": [ ... ] }\nGot:\n" + content);
      return;
    }

    let commands = [];
    // Handle strict format: { "commands": [ ... ] }
    if (json && Array.isArray(json.commands)) {
      commands = json.commands;
    // Handle legacy format: { "command": "..." }
    } else if (json && typeof json.command === "string") {
      commands = [json.command];
    // Handle array format: [ "...", ... ]
    } else if (Array.isArray(json) && json.every(cmd => typeof cmd === "string")) {
      commands = json;
    } else {
      console.error("Invalid response format. Expected: { \"commands\": [ ... ] }, { \"command\": \"...\" }, or [\"...\"]\nGot:\n" + content);
      return;
    }

    // Add the command to the chat history
    const promptAndCompleteText = {
      mode: "command generation mode",
      model: completion.model,
      prompt: systemPrompt,
      answer: completion,
    };
    this.chatHistoryManager.addChat(promptAndCompleteText);

    // Always prompt for Y/N before running any command(s)
    let answer = "y";
    if (this.safeMode) {
      try {
        const rl = readlinePromises.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        answer = await rl.question(
          `Do you want to run this command?:\n${commands.join("\n")}\n(y/n) `,
        );
        rl.close();
      } catch (error) {
        console.error("Error during user interaction:", error);
      }
    }

    // Warn if the command is not compatible with the user's shell
    if (isWindows && commands.some((cmd: string) => /ls |grep |find \\./i.test(cmd))) {
      console.warn("Warning: The generated command appears to be for Linux/bash and may not work in your Windows shell. Please rephrase your prompt or specify 'for PowerShell' or 'for cmd'.");
    }

    if (answer.toLowerCase() === "y") {
      for (const cmd of commands) {
        try {
          await runCommand(cmd);
        } catch (error: any) {
          if (typeof error === "string" && error.indexOf("No output") === 0) console.log(error);
          else console.error("Error running command:", error);
        }
      }
    }
  }

  public saveHistory(): void {
    this.chatHistoryManager.saveChatHistory();
  }
}
