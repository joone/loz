#!/usr/bin/env node
import * as yargs from "yargs";
import { Loz } from "./index";

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
  if (args.prompt !== undefined) {
    if (args.prompt === "commit") {
      await loz.runGitCommit();
      loz.saveChatHistory();
    } else await loz.handlePipeInput(args.prompt as string);
  } else if (args.git !== undefined) {
    await loz.writeGitCommitMessage();
  } else {
    console.log("Loz: a simple ChatGTP CLI tool");
    await loz.runPromptIntractiveMode();
    console.log("Good bye!");
    loz.saveChatHistory();
    loz.saveConfig();
  }
})();
