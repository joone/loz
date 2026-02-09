import { exec, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { DEBUG } from "../constant";

// check if the program is running in it's git repository.
export function checkGitRepo(): boolean {
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
    let child;
    const isWindows = process.platform === "win32";
    // Try to detect PowerShell vs cmd
    let shellType = "bash";
    if (isWindows) {
      const comspec = (process.env.ComSpec || "").toLowerCase();
      const shellEnv = (process.env.SHELL || "").toLowerCase();
      if (comspec.includes("powershell") || shellEnv.includes("powershell") || shellEnv.includes("pwsh")) {
        shellType = "powershell";
      } else {
        shellType = "cmd";
      }
    }

    if (isWindows && shellType === "cmd") {
      child = spawn("cmd.exe", ["/c", command], { shell: false });
    } else if (isWindows && shellType === "powershell") {
      child = spawn("powershell.exe", ["-Command", command], { shell: false });
    } else {
      child = spawn("bash", ["-c", command]);
    }

    let stdoutData = "";
    let stderrData = "";

    child.stdout.on("data", (data: any) => {
      stdoutData += data;
      process.stdout.write(data);
    });

    child.stderr.on("data", (data: any) => {
      stderrData += data;
      process.stderr.write(data);
    });

    child.on("error", (error: any) => {
      console.error(`Execution Error: ${error.message}`);
      reject(error);
    });

    child.on("close", (code: any) => {
      if (code === 2) {
        reject("No output: " + code);
      } else if (code !== 0) {
        console.log(`Process exited with code: ${code}`);
        if (!stdoutData && !stderrData) {
          reject("No output: " + code);
        } else {
          reject(new Error(`Process exited with code: ${code}`));
        }
      } else {
        resolve();
      }
    });
  });
}
