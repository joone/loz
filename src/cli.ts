#!/usr/bin/env node
import * as yargs from "yargs";

// import Loz
import { Loz } from "./index";

const args = yargs
  .wrap(null)
  .command("$0 [prompt]", "Luv: a simple ChatGTP CLI tool", (yargs) => {
    yargs.positional("prompt", {
      description: "Prompt to start the conversation",
      type: "string",
    });
  })
  .options({
    interactive: {
      alias: "i",
      describe: "interactive mode",
    },
    git: {
      alias: "g",
      describe: "Rephrase a sentence as a git commit message",
    },
  })
  .help()
  .parseSync();

(async () => {
  let loz = new Loz();
  if (args.prompt !== undefined) {
    loz.answerAnyQuestion(args.prompt as string);
  } else if (args.git !== undefined) {
    loz.writeGitCommitMessage();
  } else {
    loz.handlePrompt();
  }
})();
