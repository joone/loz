// node -r ts-node/register examples/ollama.ts

import { Ollama } from "ollama-node";

(async () => {
  const ollama = new Ollama();
  await ollama.setModel("gpt-oss:20b");

  // callback to print each word
  const print = (word: string) => {
    process.stdout.write(word);
  };
  await ollama.streamingGenerate("why is the sky blue", print);
})();
