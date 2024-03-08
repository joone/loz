import { exec, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

export const DEBUG = process.env.LOZ_DEBUG === "true" ? true : false;

// check if the program is running in it's git repository.
export function checkGitRepo() {
  const gitRepoPath = path.join(process.cwd(), ".git");
  if (DEBUG) console.log(gitRepoPath);
  if (fs.existsSync(gitRepoPath)) {
    return true;
  }
  return false;
}

export function runShellCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`stderr: ${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
}

// Function to run a command and stream its stdout directly to the terminal
export function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    //const [cmd, ...args] = command.split(/\s+/); // Split the command and its arguments
    const child = spawn("bash", ["-c", command]);
    let stdoutData = "";
    let stderrData = "";

    child.stdout.on("data", (data: any) => {
      stdoutData += data; // Accumulate stdout data
      process.stdout.write(data); // Write stdout data to the terminal
    });

    child.stderr.on("data", (data: any) => {
      stderrData += data; // Accumulate stderr data
      process.stderr.write(data); // Write stderr data to the terminal
    });

    child.on("error", (error: any) => {
      console.error(`Execution Error: ${error.message}`);
      reject(error); // Reject the promise on spawn error
    });

    child.on("close", (code: any) => {
      if (code === 2) {
        reject("No output: " + code);
      } else if (code !== 0) {
        console.log(`Process exited with code: ${code}`);
        // Check if both stdout and stderr are empty
        if (!stdoutData && !stderrData) {
          reject("No output: " + code);
        } else {
          reject(new Error(`Process exited with code: ${code}`));
        }
      } else {
        resolve(); // Resolve the promise when the process closes successfully
      }
    });
  });
}
