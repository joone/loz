import * as yargs from "yargs";
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function runCompletion(prompt: string) {
  if (prompt === undefined) return;

  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    temperature: 0,
    max_tokens: 60,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  });
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
    headless: {
      type: "boolean",
      alias: "h",
      describe: "run your program",
      default: true,
    },
  })
  .help()
  .parseSync();

(async () => {
  switch (args.service) {
    case "natural": {
      const prompt =
        "Could you please rephrase the following sentence to make it sound more natural?: " +
        args.sentence;
      await runCompletion(prompt);
      break;
    }
    case "git": {
      const prompt =
        "Please rephrase the following sentence to make it sound more like a git commit title?: " +
        args.sentence;
      await runCompletion(prompt);
      break;
    }
    default: {
      if (args.sentence === undefined && args.service !== undefined) {
        const prompt = "" + args.service;
        await runCompletion(prompt);
      } else {
        console.info("Please input your prompt");
      }
    }
  }
})();
