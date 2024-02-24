#!/usr/bin/env node
import * as yargs from "yargs";
import { Loz } from "./index";
import { exec } from "child_process";
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

async function handlePromptInput(prompt: any) {
  if (!process.stdin.isTTY && isRunningInMocha === false) {
    await loz.handlePipeInput(prompt);
  } else {
    await loz.handlePrompt(prompt);
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
