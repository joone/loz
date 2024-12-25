// npx ts-node ollama_code_git.ts

import { Ollama } from "ollama-node";

const gitDiff = `diff --git a/src/cli.ts b/src/cli.ts
index 55e4d8d..f5af383 100644
--- a/src/cli.ts
+++ b/src/cli.ts
@@ -44,6 +44,11 @@ const args = yargs
   } else if (args.git !== undefined) {
     await loz.writeGitCommitMessage();
   } else {
+    // Handle the pipe input
+    if (!process.stdin.isTTY) {
+      console.log("Input your prompt:");
+      process.exit(0);
+    }
     console.log("Loz: a simple ChatGTP CLI tool");
     await loz.runPromptIntractiveMode();
     console.log("Good bye!");`;

(async () => {
  const ollama = new Ollama();
  await ollama.setModel("codellama");
  await ollama.addParameter("temperature", 0.1);
  //await ollama.addParameter("max_tokens", 100);
  //await ollama.addParameter("top_p", 1);
  //await ollama.addParameter("frequency_penalty", 0);
  //await ollama.addParameter("presence_penalty", 0);

  // callback to print each word
  const print = (word: string) => {
    process.stdout.write(word);
  };
  await ollama.streamingGenerate(
    "Write a GIT commit message by the following rules as JSON \n \
     Rules: \n\
     1. Separate Subject from Body with a Blank Line\n\
     2. Limit the Subject Line to 50 Characters\n\
     3. Capitalize the Subject Line\n\
     4. Generate only comitting message, not the commit itself\n\
     5. Use the Imperative Mood in the Subject Line\n\
     6. Wrap the Body at 72 Characters\n\
     7. Use the Body to Explain the What and Why, Not the How\n\
     8. Do not include the issue number\n\
     9. Do not include coede diff in the body\n\
     10. Only include subjet and body in the message\n\
     \n\
     Code Diff:\n" + gitDiff,
    print,
  );
})();
