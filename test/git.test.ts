import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { expect } from "chai";
import { describe, before, after, it } from "mocha";

describe("Test git operations", function () {
  let repoPath: string;

  before(function () {
    // Create a new directory for the Git repo
    repoPath = path.join(__dirname, "test_repo");
    fs.mkdirSync(repoPath);
    process.chdir(repoPath);

    // Initialize a new Git repo
    execSync("git init");
  });

  after(function () {
    // Clean up: remove the Git repo directory after the test
    process.chdir(__dirname);
    fs.rmdirSync(repoPath, { recursive: true });
  });

  it("should commit a change", function () {
    // Create a new file
    fs.writeFileSync(
      "hello.c",
      '\n \
    int main() { \n\
        printf("Hello, World!"); \n \
        return 0; \n \
    }\n'
    );

    // Stage the new file
    execSync("git add hello.c");

    // Commit the change
    execSync("node ../../bin commit");

    // Verify the commit
    const log = execSync("git log --oneline").toString();
    expect(log).to.include("hello.c");
  });
});
