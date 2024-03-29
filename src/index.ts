#!/usr/bin/env node
import * as yargs from "yargs";
import { Loz } from "./loz";
import { DEBUG } from "./constant";
const LOZ_SAFE = process.env.LOZ_SAFE === "true" ? true : false;

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
    attribution: {
      alias: "a",
      describe: "Append the model name at the end of the Git commit message.",
    },
    safe: {
      alias: "s",
      describe:
        "Safe mode requires user confirmation before executing any Linux command.",
    },
  })
  .help()
  .parseSync();

if (LOZ_SAFE) args.safe = true;

const loz = new Loz();

async function handleLozCommand(): Promise<boolean> {
  if (args.attribution) loz.attribution = true;

  // If the stdin is a TTY
  // when runnig unit tests for running Linux commands, stdin is not a TTY
  // so we need isRunningInMocha to check if we are running unit tests.
  if (process.stdin.isTTY || isRunningInMocha === true) {
    if (args.prompt !== undefined) {
      return await handlePrompt(args.prompt, args._[0]?.toString());
    } else {
      await handleInteractiveMode();
    }
  } else {
    // Input from a pipe
    if (args.git) {
      await handleCodeDiffFromPipe();
    } else {
      //console.log("Run loz like this: git diff | loz --git");
      if (args.prompt !== undefined) {
        await handleInputFromPipe(args.prompt);
      } else {
        console.log("Input your prompt:");
      }
    }
  }
  return true;
}

async function handlePrompt(prompt: any, context?: string): Promise<boolean> {
  if (prompt === "commit") {
    if ((await loz.runGitCommit(context)) === undefined) return false;
  } else {
    await loz.handlePrompt(prompt);
  }

  return true;
}

async function handleInteractiveMode(): Promise<void> {
  console.log("Loz: a simple CLI for LLM");
  try {
    await loz.runPromptInteractiveMode();
  } catch (error) {
    console.log(error);
  }
  console.log("Good bye!");
}

async function handleCodeDiffFromPipe(): Promise<void> {
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
    const completion = await loz.generateGitCommitMessage(diff);
    if (completion.content === "") {
      console.log("Failed to generate a commit message");
      return;
    }

    if (loz.attribution) {
      process.stdout.write(
        completion.content + "\n\nGenerated by " + completion.model + "\n",
      );
    } else {
      process.stdout.write(completion.content + "\n");
    }
  });
}

async function handleInputFromPipe(prompt: any): Promise<void> {
  // Handle the input from the pipe
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", async (data: String) => {
    const promptUpdated =
      "Based on the data provided below, " + prompt + ":\n" + data;
    const completion = await loz.completeUserPrompt(promptUpdated);
    process.stdout.write(completion.content);
    process.stdout.write("\n");
  });
}

(async () => {
  await loz.init();
  if (args.safe) loz.enableSafe();
  if ((await handleLozCommand()) === true) loz.saveHistory();
})();
