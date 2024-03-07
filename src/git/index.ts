import { exec } from "child_process";

// Define a class for the git commands
// Path: src/git/index.ts
// generated by copilot
export class Git {
  // Define a method to get the diff
  // Path: src/git/index.ts
  // generated by copilot
  public getDiffFromStaged(): Promise<string> {
    // Run a Git diff --staged command
    return new Promise((resolve, reject) => {
      exec("git diff --staged", (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          reject(error.message);
          return;
        }

        resolve(stdout);
      });
    });
  }

  public commit(message: string): Promise<string> {
    // Add a backslash before each backtick
    message = message.replace(/`/g, "\\`");
    message = message.replace(/"/g, "");
    return new Promise((resolve, reject) => {
      exec(
        `git commit -m "${message}"`,
        (error: any, stdout: any, stderr: any) => {
          if (error) {
            console.error(`Error: ${error.message}`);
            reject(error.message);
            return;
          }
          resolve(stdout);
        }
      );
    });
  }

  public commitAmend(): Promise<string> {
    return new Promise((resolve, reject) => {
      exec("git commit --amend", (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          reject(error.message);
          return;
        }

        resolve(stdout);
      });
    });
  }

  public showHEAD(): Promise<string> {
    return new Promise((resolve, reject) => {
      exec("git show HEAD", (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          reject(error.message);
          return;
        }
        if (stderr) {
          reject(`Error: ${stderr}`);
          return;
        }
        resolve(stdout);
      });
    });
  }
}
