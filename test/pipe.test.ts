import { exec } from "child_process";
import { expect } from "chai";
import { describe, it } from "mocha";

const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true" ? true : false;
import { fileURLToPath } from "url";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOZ_BIN = path.join(__dirname, "..", "dist");

describe("Test loz pipe mode", function () {
  // ls | loz "count the number of files
  it("should count the number of files", function (done) {
    exec(
      `ls | node  ${LOZ_BIN} "count the number of files"`,
      (error, stdout, stderr) => {
        if (error) {
          done(error);
        } else {
          expect(stdout).to.include("files");
          done();
        }
      },
    );
  });

  // echo "hello, world!" | loz "convert the input to uppercase"
  it("should convert the input to uppercase", function (done) {
    this.timeout(3000);
    exec(
      `echo "hello, world!" | node ${LOZ_BIN} "convert the input to uppercase"`,
      (error, stdout, stderr) => {
        if (error) {
          done(error);
        } else {
          expect(stdout.trim()).to.equal("HELLO, WORLD!");
          done();
        }
      },
    );
  });

  // echo "helo, world!" | loz "list any spelling errors"
  it("should list any spelling errors", function (done) {
    this.timeout(3000);
    exec(
      `echo "helo, world!" | node ${LOZ_BIN} "Find any spelling errors"`,
      (error, stdout, stderr) => {
        if (error) {
          done(error);
        } else {
          expect(stdout.trim()).to.include("helo");
          done();
        }
      },
    );
  });
});
