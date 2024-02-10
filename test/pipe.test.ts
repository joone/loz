import { exec } from "child_process";
import { expect } from "chai";
import { describe, it } from "mocha";

const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true" ? true : false;
const LOZ_BIN = GITHUB_ACTIONS === true ? "../bin" : "./bin";

describe("Test loz pipe mode", function () {
  it("should count the number of files", function (done) {
    exec(
      `ls | node  ${LOZ_BIN} "count the number of files"`,
      (error, stdout, stderr) => {
        if (error) {
          done(error);
        } else {
          expect(stdout).to.include("15 files");
          done();
        }
      }
    );
  });

  it("should convert the input to uppercase", function (done) {
    exec(
      `echo "hello, world!" | node ${LOZ_BIN} "convert the input to uppercase"`,
      (error, stdout, stderr) => {
        if (error) {
          done(error);
        } else {
          expect(stdout.trim()).to.equal("HELLO, WORLD!");
          done();
        }
      }
    );
  });

  it("should list any spelling errors", function (done) {
    exec(
      `echo "helo, world!" | node ${LOZ_BIN} "list any spelling errors"`,
      (error, stdout, stderr) => {
        if (error) {
          done(error);
        } else {
          expect(stdout.trim()).to.include("helo");
          done();
        }
      }
    );
  });
});
