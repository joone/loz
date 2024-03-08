import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { expect } from "chai";
import { describe, before, after, it } from "mocha";
import * as mockStdin from "mock-stdin";

const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true" ? true : false;
const LOZ_BIN = "../../dist";

describe("Test git operations", function () {
  let repoPath: string;
  let stdin: mockStdin.MockSTDIN;

  before(function () {
    stdin = mockStdin.stdin();
    // scripts/prepare-commit-msg needs loz to be installed globally
    if (GITHUB_ACTIONS === true) execSync("npm install -g");
    // Create a new directory for the Git repo
    repoPath = path.join(__dirname, "test_repo");
    if (fs.existsSync(repoPath)) execSync("rm -rf " + repoPath);
    fs.mkdirSync(repoPath);
    process.chdir(repoPath);

    // Set the default branch to main
    if (GITHUB_ACTIONS === true)
      execSync("git config --global init.defaultBranch main");

    // Initialize a new Git repo
    execSync("git init");
    execSync("git config user.email foo.bar@mail.com");
    execSync("git config user.name Foo Bar");
    execSync("cp ../../scripts/prepare-commit-msg .git/hooks");
  });

  after(function () {
    // Clean up: remove the Git repo directory after the test
    process.chdir(__dirname);
    fs.rmSync(repoPath, { recursive: true });
    stdin.restore();
  });

  // loz commit
  it("should commit a change", function () {
    this.timeout(5000);
    // Create a new file
    fs.writeFileSync(
      "hello.c",
      '\n \
    int main() { \n\
        printf("Hell, World!");\n \
        return 0; \n \
    }\n'
    );

    // Stage the new file
    execSync("git add hello.c");

    // Commit the change
    execSync(`MOCHA_ENV=test node ${LOZ_BIN} commit`);

    // Verify the commit
    const log = execSync("git log --oneline").toString();
    expect(log).to.include("hello.c");
  });

  // git diff | loz -g
  it("should generate a commit message", function () {
    this.timeout(5000);
    execSync("sed -i 's/Hell/Hello/g' hello.c");
    const log = execSync(`git diff | node ${LOZ_BIN} -g`).toString();
    expect(log).to.include("typo");
  });

  // LOZ=true git commit
  it(" LOZ=true git commit", function () {
    this.timeout(5000);
    process.nextTick(() => {
      stdin.send(":wq\n");
      stdin.end();
    });
    execSync("git add --update");
    execSync("git commit --allow-empty-message -m ''", {
      env: { ...process.env, LOZ: "true" },
    });

    const log = execSync(`git show HEAD`).toString();
    expect(log).to.include("typo");
  });
});
