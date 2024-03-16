import * as readline from "readline";

interface PromptInterface {
  start(): Promise<void>;
  exit(): void;
}
export class CommandLinePrompt implements PromptInterface {
  private rl: readline.Interface;
  private callback: (input: string) => Promise<void>;
  private timer: any;

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

    // Set the terminal to raw mode to allow for cursor manipulation
    process.stdin.setRawMode(true);

    // Display a blinking cursor
    if (blinking) {
      this.timer = setInterval(() => {
        process.stdout.write("\x1B[?25h");
        setTimeout(() => {
          process.stdout.write("\x1B[?25l");
        }, 500);
      }, 1000);
    }

    // Listen for user input
    this.rl.on("line", async (input) => {
      this.rl.prompt();
      await this.callback(input);
    });

    // Handle CTRL+C to exit the program
    this.rl.on("SIGINT", () => {
      clearInterval(this.timer);
      this.rl.close();
    });
  }

  public exit(): void {
    clearInterval(this.timer);
    // Show the cursor
    process.stdout.write("\x1B[?25h");
    // Try to enable cursor blinking
    process.stdout.write("\x1B[?12h");
    // Reset the terminal to the normal mode
    process.stdin.setRawMode(false);
    this.rl.close();
  }
}
