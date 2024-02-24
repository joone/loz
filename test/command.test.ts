import { exec, execSync } from "child_process";
import { expect } from "chai";
import "mocha";

const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true" ? true : false;
const LOZ_BIN = "bin";

describe("Linux Command Test", () => {
  /*  let originalWrite : any;
  let outputData: string;

  before(() => {
    originalWrite = process.stdout.write; // Backup the original stdout.write
    outputData = ''; // Reset output data
    process.stdout.write = (data) => { outputData += data; return true; }; // Intercept stdout.write
  });

  after(() => {
    process.stdout.write = originalWrite; // Restore original stdout.write
  });*/

  /*it("Detect GPUs on this system", function (done) {
    this.timeout(3000);
    exec(
      `node ${LOZ_BIN} "Detect GPUs on this system"`,
      (error, stdout, stderr) => {
        if (error) {
          done(error);
        } else {
          console.log(stdout);
          expect(stdout).to.include("VGA compatible controller");
          done();
        }
      }
    );
  });*/

  // lspci | grep -i vga
  it("Detect GPUs on this system", function () {
    let stdout = execSync(
      `MOCHA_ENV=test node ${LOZ_BIN} "Detect GPUs on this system"`
    ).toString();
    expect(stdout).to.include("VGA compatible controller");
  });

  it("Run find . -type f -exec ls -l {} + | sort -k 5 -nr | head -n 1", function () {
    let stdout = execSync(
      `MOCHA_ENV=test node ${LOZ_BIN} "find the largest file in the current directory"`
    ).toString();
    expect(stdout).to.include("typescript.js");
  });

  if (GITHUB_ACTIONS === false) {
    it("Run  systemctl status apache2", function () {
      let stdout = execSync(
        `MOCHA_ENV=test node ${LOZ_BIN} "check if apache2 is runnig on this system"`
      ).toString();
      expect(stdout).to.include("The Apache HTTP Server");
    });
  }

  // Get the system's current date and time
  it("Get the system's current date and time", function () {
    let stdout = execSync(
      `MOCHA_ENV=test node ${LOZ_BIN} "Get the current date and time on this system"`
    ).toString();
    if (GITHUB_ACTIONS === false) {
      // Fri Feb 23 10:57:41 PM PST 2024
      expect(stdout).to.match(
        /\w{3} \w{3} \d{2} \d{2}:\d{2}:\d{2} (AM|PM) \w{3} \d{4}/
      );
    } else {
      // Sat Feb 24 06:49:11 UTC 2024
      expect(stdout).to.match(/\w{3} \w{3} \d{2} \d{2}:\d{2}:\d{2} UTC \d{4}/);
    }
  });

  // Check available memory
  it("Check available memory on this system", function () {
    let stdout = execSync(
      `MOCHA_ENV=test node ${LOZ_BIN} "Check available memory on this Linux"`
    ).toString();
    expect(stdout).to.match(/Mem:/);
  });
});
