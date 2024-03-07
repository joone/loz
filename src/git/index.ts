import { exec } from "child_process";

export class Git {
  public getDiffFromStaged(): Promise<string> {
    // Run a Git diff --staged command
    return new Promise((resolve, reject) => {
      exec(
        "git diff --staged",
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error(`Error: ${error.message}`);
            reject(error.message);
            return;
          }
          if (stderr) {
            console.error(`Stderr: ${stderr}`);
            reject(stderr);
            return;
          }
          resolve(stdout);
        }
      );
    });
  }

  public commit(message: string): Promise<string> {
    // Add a backslash before each backtick
    message = message.replace(/`/g, "\\`");
    message = message.replace(/"/g, "");
    return new Promise((resolve, reject) => {
      exec(
        `git commit -m "${message}"`,
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error(`Error: ${error.message}`);
            reject(error.message);
            return;
          }
          if (stderr) {
            console.error(`Stderr: ${stderr}`);
            reject(stderr);
            return;
          }
          resolve(stdout);
        }
      );
    });
  }

  public commitAmend(): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(
        "git commit --amend",
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error(`Error: ${error.message}`);
            reject(error.message);
            return;
          }
          if (stderr) {
            console.error(`Stderr: ${stderr}`);
            reject(stderr);
            return;
          }
          resolve(stdout);
        }
      );
    });
  }

  public showHEAD(): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(
        "git show HEAD",
        (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error(`Error: ${error.message}`);
            reject(error.message);
            return;
          }
          if (stderr) {
            console.error(`Stderr: ${stderr}`);
            reject(stderr);
            return;
          }
          resolve(stdout);
        }
      );
    });
  }
}
