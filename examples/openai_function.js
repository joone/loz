import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "My API Key", // defaults to process.env["OPENAI_API_KEY"]
});

async function main() {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: "Get the current date and time on this system" }],
    model: "gpt-3.5-turbo",
    functions:
  });
}

main();
