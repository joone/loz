#!/usr/bin/env node
import * as yargs from "yargs";
import { Loz } from "./index";

const LOZ_DEBUG = process.env.DEBUG === "true" ? true : false;

const args = yargs
  .wrap(null)
  .command("$0 [prompt]", "Loz: a simple ChatGTP CLI tool", (yargs) => {
    yargs.positional("prompt", {
      description: "Prompt to answer",
      type: "string",
    });
  })
  .options({
    interactive: {
      alias: "i",
      describe: "Interactive mode",
    },
    git: {
      alias: "g",
      describe:
        "Generate a Git commit message that summarizes the changes made in the diff",
    },
    commit: {
      alias: "c",
      describe: "Generate a Git commit message in the current git repository",
    },
    log: {
      alias: "l",
      describe:
        // generated by copilot
        "Log the conversation to a file. The file name is the current date and time",
    },
  })
  .help()
  .parseSync();

(async () => {
  let loz = new Loz();
  await loz.init();
  if (args.prompt !== undefined) {
    if (args.prompt === "commit") {
      await loz.runGitCommit();
      loz.saveChatHistory();
    } else {
      if (!process.stdin.isTTY) {
        // $ echo "prompt" | loz "convert the input to uppercase"
        await loz.handlePipeInput(args.prompt as string);
      } else {
        // $ loz "prompt"
        const completion = await loz.completeUserPrompt(args.prompt as string);
        console.log(completion.content);
      }
    }
  } else if (args.git !== undefined) {
    // git diff | loz --git
    if (!process.stdin.isTTY) {
      await loz.writeGitCommitMessage();
    } else {
      // we should run like this:
      console.log("Run loz like this: git diff | loz --git");
    }
  } else {
    // Hanlde the pipe input
    if (!process.stdin.isTTY) {
      console.log("Input your prompt:");
      process.exit(0);
    }
    console.log("Loz: a simple ChatGTP CLI tool");
    try {
      await loz.runPromptIntractiveMode();
    } catch (error) {
      console.log(error);
    }
    console.log("Good bye!");
    loz.saveChatHistory();
    loz.config.save();
    process.exit(0);
  }
})();
