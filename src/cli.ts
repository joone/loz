#!/usr/bin/env node
import * as yargs from "yargs";
import { Loz } from "./index";
import { exec } from "child_process";
const { spawn } = require("child_process");
import * as readlinePromises from "readline/promises";

const DEBUG = process.env.LOZ_DEBUG === "true" ? true : false;
const isRunningInMocha = process.env.MOCHA_ENV === "test";

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

// Function to run a command and stream its stdout directly to the terminal
async function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    //const [cmd, ...args] = command.split(/\s+/); // Split the command and its arguments
    const child = spawn("bash", ["-c", command]);

    child.stdout.on("data", (data: any) => {
      process.stdout.write(data); // Directly write stdout data to the terminal
    });

    child.stderr.on("data", (data: any) => {
      process.stderr.write(data); // Directly write stderr data to the terminal
    });

    child.on("error", (error: any) => {
      console.error(`Execution Error: ${error.message}`);
      reject(error); // Reject the promise on spawn error
    });

    child.on("close", (code: any) => {
      if (code !== 0) {
        console.error(`Process exited with code: ${code}`);
        reject(new Error(`Process exited with code: ${code}`));
        return;
      }

      resolve(); // Resolve the promise when the process closes successfully
    });
  });
}

async function handlePromptInput(prompt: any) {
  if (!process.stdin.isTTY && isRunningInMocha === false) {
    await loz.handlePipeInput(prompt);
  } else {
    const internPrompt =
      "Decide if the following prompt can be translated into Linux commands. " +
      "If yes, generate only the corresponding Linux commands in JSON format, assuming the current directory is '.'. " +
      "If no, provide an explanation in plain text.\n\n" +
      "Input: " +
      prompt +
      "\n" +
      "Response: ";

    const completion = await loz.completeUserPrompt(internPrompt + prompt);
    // check if completion is json as string
    if (completion.content.startsWith("{")) {
      try {
        if (DEBUG) console.log(completion.content);
        const json = JSON.parse(completion.content);
        // wait for user input and run the command
        const rl = readlinePromises.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        if (json.command === undefined) {
          // Run the prompt again as a normal prompt
          const completion = await loz.completeUserPrompt(prompt);
          console.log(completion.content);
          rl.close();
          return;
        }

        let linuxCommand = json.command;

        if (json.arguments && json.arguments.length > 0) {
          linuxCommand += " " + json.arguments.join(" ");
        }

        if (DEBUG) {
          const answer = await rl.question(
            `Do you want to run this command?: ${linuxCommand} (y/n) `
          );
          if (answer.toLowerCase() === "y") {
            await runCommand(linuxCommand);
          }
        } else {
          await runCommand(linuxCommand);
        }
        rl.close();
        if (DEBUG) console.log(JSON.stringify(json, null, 2));
        return;
      } catch (error: any) {
        console.log(error);
      }
    } else {
      // Run the prompt again as a normal prompt
      const completion = await loz.completeUserPrompt(prompt);
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
