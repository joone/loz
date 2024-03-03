import e = require("express");
import { resolve } from "path";
import * as readline from "readline";

interface PromptInterface {
  start(): Promise<void>;
  exit(): void;
}
export class CommandLinePrompt implements PromptInterface {
  private rl: readline.Interface;
  private callback: (input: string) => Promise<void>;

  prompt() {
    this.rl.prompt();
  }

  constructor(callback: (input: string) => Promise<void>) {
    // ...
    this.callback = callback;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async start(blinking?: boolean) {
    // Set the prompt to display before each input
    this.rl.setPrompt("> ");

    // Show the cursor and prompt the user for input
    this.rl.prompt();

    // Set the terminal to raw mode to allow for cursor manipulation
    process.stdin.setRawMode(true);

    // Display a blinking cursor
    if (blinking) {
      setInterval(() => {
        process.stdout.write("\x1B[?25h");
        setTimeout(() => {
          process.stdout.write("\x1B[?25l");
        }, 500);
      }, 1000);
    }

    // Listen for user input
    this.rl.on("line", async (input) => {
      await this.callback(input);
      this.rl.prompt();
    });

    // Handle CTRL+C to exit the program
    this.rl.on("SIGINT", () => {
      this.rl.close();
    });
  }

  exit(): void {
    this.rl.close();
    //  resolve();
  }
}
