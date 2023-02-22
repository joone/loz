const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config()

// get runtime parameters
const runtimeArgs = process.argv.slice(2);

// print the runtime parameters
console.log('Runtime parameters:', runtimeArgs);


const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function runCompletion (prompt : string) {
  if (prompt === undefined)
    return;

  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    temperature: 0,
    max_tokens: 60,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0
  });
  console.log(completion.data.choices[0].text);
}

(async () => {
  let prompt = runtimeArgs[0];
  if (prompt !== undefined) {
    prompt = "Could you please rephrase the following sentence to make it sound more natural?: " + prompt;
    await runCompletion(prompt);
  } else
    console.info("Please input your prompt");
})();
