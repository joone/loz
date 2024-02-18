#!/usr/bin/env node
import * as yargs from "yargs";
import { Loz } from "./index";
import { exec } from "child_process";
import * as readlinePromises from "readline/promises";

const DEBUG = process.env.LOZ_DEBUG === "true" ? true : false;

const args = yargs
  .wrap(null)
  .command("$0 [prompt]", "Loz: a simple CLI for LLM", (yargs) => {
    yargs.positional("prompt", {
      description: "Prompt to answer",
      type: "string",
    });
  })
  .options({
    git: {
      alias: "g",
      describe:
        "Generate a Git commit message that summarizes the changes made in the diff",
    },
  })
  .help()
  .parseSync();

const loz = new Loz();

async function handleLozCommand() {
  if (args.prompt) {
    await handlePrompt(args.prompt);
  } else if (args.git) {
    await handleGitCommand();
  } else {
    await handleDefaultCase();
  }
}

async function handlePrompt(prompt: any) {
  if (prompt === "commit") {
    await loz.runGitCommit();
    loz.saveChatHistory();
  } else {
    await handlePromptInput(prompt);
  }
}

async function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Execution Error: ${error.message}`);
        reject(new Error(`Error: ${error.message}, Stderr: ${stderr}`));
        return;
      }

      if (stderr) {
        console.warn(`Stderr: ${stderr}`);
      }

      resolve(stdout);
    });
  });
}

async function handlePromptInput(prompt: any) {
  if (!process.stdin.isTTY) {
    await loz.handlePipeInput(prompt);
  } else {
    const internPrompt =
      "Does it need to run a Linux command? " +
      "If so, only generate the Linux commands as JSON. The current directory is . :\n";
    const completion = await loz.completeUserPrompt(internPrompt + prompt);
    // check if completion is json as string
    if (completion.content.startsWith("{")) {
      try {
        const json = JSON.parse(completion.content);
        // wait for user input and run the command
        const rl = readlinePromises.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        let linuxCommand = json.command;
        if (json.arguments.length > 0) {
          linuxCommand += " " + json.arguments.join(" ");
        }

        const answer = await rl.question(
          `Do you want to run this command?: ${linuxCommand} (y/n) `
        );
        if (answer.toLowerCase() === "y") {
          const result = await runCommand(linuxCommand);
          console.log(result);
        }
        rl.close();
        if (DEBUG) console.log(JSON.stringify(json, null, 2));
        return;
      } catch (error: any) {
        console.log(error);
      }
    } else {
      console.log(completion.content);
    }
  }
}

async function handleGitCommand() {
  if (!process.stdin.isTTY) {
    await loz.generateGitCommitMessage();
  } else {
    console.log("Run loz like this: git diff | loz --git");
  }
}

async function handleDefaultCase() {
  if (!process.stdin.isTTY) {
    console.log("Input your prompt:");
    process.exit(0);
  }
  console.log("Loz: a simple CLI for LLM");
  try {
    while (true) {
      const res = await loz.runPromptInteractiveMode();
      if (res === "Done") break;
    }
  } catch (error) {
    console.log(error);
  }
  console.log("Good bye!");
  loz.saveChatHistory();
  process.exit(0);
}

(async () => {
  await loz.init();
  await handleLozCommand();
})();
