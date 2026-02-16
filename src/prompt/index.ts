import * as readline from "readline";

interface PromptInterface {
  start(): Promise<void>;
  exit(): void;
}
export class CommandLinePrompt implements PromptInterface {
  private rl: readline.Interface;
  private callback: (input: string) => Promise<void>;

  constructor(callback: (input: string) => Promise<void>) {
    // ...
    this.callback = callback;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  public prompt(): void {
    this.rl.prompt();
  }

  public async start(blinking?: boolean): Promise<void> {
    // Set the prompt to display before each input
    this.rl.setPrompt("> ");

    // Show the cursor and prompt the user for input
    this.rl.prompt();

    // Listen for user input
    this.rl.on("line", async (input) => {
      await this.callback(input);
    });

    // Handle CTRL+C to exit the program
    this.rl.on("SIGINT", () => {
      this.rl.close();
    });
  }

  public exit(): void {
    this.rl.close();
  }
}
