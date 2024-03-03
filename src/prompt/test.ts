import { expect } from "chai";
import { CommandLinePrompt } from ".";
import "mocha";
import * as mockStdin from "mock-stdin";

const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true" ? true : false;

function callback(input: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(input);
    resolve();
  });
}

describe("Test prompt", () => {
  let stdin: mockStdin.MockSTDIN;

  before(() => {
    stdin = mockStdin.stdin();
  });

  after(() => {
    stdin.restore();
  });

  it("callback should work", async function () {
    this.timeout(5000);

    process.nextTick(() => {
      stdin.send("loz\n");
    });

    let cli = new CommandLinePrompt(async (input: string) => {
      expect(input).to.equal("loz");
      return Promise.resolve();
    });
    await cli.start();
    cli.exit();
  });

  it("test should end without runnig cli.exit()", async function () {
    this.timeout(5000);

    process.nextTick(() => {
      stdin.send("exit\n");
    });

    let cli = new CommandLinePrompt(async (input: string) => {
      expect(input).to.equal("exit");
      return Promise.resolve();
    });
    await cli.start();
  });
});
