import * as yargs from "yargs";
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function runCompletion(settings: any) {
  const completion = await openai.createCompletion(settings);
  console.log(completion.data);
  console.log(completion.data.choices[0].text);
}

const args = yargs
  .wrap(null)
  .command("$0 [service] [sentence]", "Specify a ChatGPT service", (yargs) => {
    yargs.positional("service", {
      description: "ChatGPT service",
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
  })
  .help()
  .parseSync();

  interface GPTSettings {
    model: string,
    prompt: string,
    temperature: number,
    max_tokens: number,
    top_p: number,
    stream: boolean,
    frequency_penalty: number,
    presence_penalty: number,
    stop?: string[],
  };

let defaultSettings: GPTSettings = {
  model: "text-davinci-003",
  prompt: '',
  temperature: 0,
  max_tokens: 60,
  top_p: 1.0,
  stream: false,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
};

(async () => {
  switch (args.service) {
    case "natural": {
      const prompt =
        "Could you please rephrase the following sentence to make it sound more natural?: " +
        args.sentence;
        defaultSettings.prompt = prompt
      await runCompletion(defaultSettings);
      break;
    }
    case "git": {
      const prompt =
        "Please rephrase the following sentence to make it sound more like a git commit title?: " +
        args.sentence;
        defaultSettings.prompt = prompt
      await runCompletion(defaultSettings);
      break;
    }
    default: {
      // Interactive mode
      if (args.sentence === undefined && args.service == undefined) {
        console.log("Please input your prompt:");
        const  waitingSymbol = '> ';

        while(true) {
          // wait for user input and run completion
          const prompt : any = await new Promise((resolve) => {
            const readline = require("readline").createInterface({
              input: process.stdin,
              output: process.stdout,
            });
            readline.question(waitingSymbol, (text: string) => {
              readline.close();
              resolve(text);
            });
          });
          if (prompt === 'exit' || prompt === 'quit') {
            console.log("Goodbye!");
            break;
          }
          defaultSettings.prompt = prompt
          defaultSettings.max_tokens = 4000;
          //defaultSettings.stream = true;
         
          await runCompletion(defaultSettings);

        }
      } else {
        console.info("Please input your prompt");
      }
    }
  }
})();
