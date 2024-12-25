import { Ollama } from "ollama-node";

(async () => {
  const ollama = new Ollama();
  await ollama.setModel("codellama");

  // callback to print each word
  const print = (word: string) => {
    process.stdout.write(word);
  };
  await ollama.streamingGenerate("Write a buuble sort code using C++", print);
})();
