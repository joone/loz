import * as yargs from "yargs";
const readline = require("readline");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const DEBUG = process.env.DEBUG === "true" ? true : false;

if (process.env.OPENAI_API_KEY === undefined) {
  console.error("Please set OPENAI_API_KEY in your environment variables");
  // system end
  process.exit(1);
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function runCompletion(settings: any, rl: any) {
  const res = await openai.createCompletion(settings, {
    responseType: "stream",
  });
  if (DEBUG === true) console.log(res.data);

  try {
    res.data.on("data", (data: any) => {
      const lines = data
        .toString()
        .split("\n")
        .filter((line: any) => line.trim() !== "");
      for (const line of lines) {
        const message = line.replace(/^data: /, "");
        if (message === "[DONE]") {
          process.stdout.write("\n");
          process.stdout.write("\n");
          if (rl !== undefined) {
            rl.prompt();
          }
          return; // Stream finished
        }
        try {
          const parsed = JSON.parse(message);
          process.stdout.write(parsed.choices[0].text);
        } catch (error) {
          console.error("Could not JSON parse stream message", message, error);
        }
      }
    });
  } catch (error) {
    console.error("An error occurred during OpenAI request: ", error);
  }
}

function handlePrompt(settings: any) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Set the prompt to display before each input
  rl.setPrompt("> ");

  // Show the cursor and prompt the user for input
  rl.prompt();

  // Set the terminal to raw mode to allow for cursor manipulation
  process.stdin.setRawMode(true);

  // Display a blinking cursor
  setInterval(() => {
    process.stdout.write("\x1B[?25h");
    setTimeout(() => {
      process.stdout.write("\x1B[?25l");
    }, 500);
  }, 1000);

  // Listen for user input
  rl.on("line", (input: String) => {
    if (input === "exit" || input === "quit") {
      console.log("Goodbye!");
      process.exit(0);
    }

    if (input.length !== 0) {
      settings.prompt = input;
      settings.max_tokens = 4000;
      runCompletion(settings, rl);
    }
  });

  // Handle CTRL+C to exit the program
  rl.on("SIGINT", () => {
    rl.close();
    console.log("Goodbye!");
    process.exit(0);
  });
}

const args = yargs
  .wrap(null)
  .command("$0 [service] [sentence]", "Specify a ChatGPT service", (yargs) => {
    yargs.positional("service", {
      description: "rephrase or git",
      type: "string",
    });
    yargs.positional("sentence", {
      description: "Sentence to be rephrased",
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

interface GPTSettings {
  model: string;
  prompt: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  stream: boolean;
  frequency_penalty: number;
  presence_penalty: number;
  stop?: string[];
}

let defaultSettings: GPTSettings = {
  model: "text-davinci-003",
  prompt: "",
  temperature: 0,
  max_tokens: 60,
  top_p: 1.0,
  stream: true,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
};

(async () => {
  if (args.git !== undefined) {
    const prompt =
      "Please write full GIT commit messages with the following changes: ";
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", async (data: String) => {
      defaultSettings.prompt = prompt + data;
      defaultSettings.stream = false;
      defaultSettings.max_tokens = 500;
      const res = await openai.createCompletion(defaultSettings);
      process.stdout.write(res.data.choices[0].text);
    });

    process.stdin.on("end", () => {
      //process.exit();
    });
    return;
  }

  switch (args.service) {
    case "rephrase": {
      const prompt =
        "Please rephrase the following sentence to make it sound more natural: " +
        args.sentence;
      defaultSettings.prompt = prompt;
      await runCompletion(defaultSettings, undefined);
      break;
    }
    case "git": {
      const prompt =
        "Please rephrase a sentence as a git commit message: " + args.sentence;
      defaultSettings.prompt = prompt;
      await runCompletion(defaultSettings, undefined);
      process.stdin.setEncoding("utf8");

      process.stdin.on("data", (data: String) => {
        process.stdout.write(data.toUpperCase());
      });

      process.stdin.on("end", () => {
        process.exit();
      });
      break;
    }
    default: {
      // Interactive mode
      if (args.sentence === undefined && args.service == undefined) {
        handlePrompt(defaultSettings);
      }
    }
  }
})();
