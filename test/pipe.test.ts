import { exec } from "child_process";
import { expect } from "chai";
import { describe, it } from "mocha";

describe("Test loz pipe mode", function () {
  it("should count the number of files", function (done) {
    exec(
      'ls | node  ./bin "count the number of files"',
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
      'echo "hello, world!" | node ./bin "convert the input to uppercase"',
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
      'echo "helo, world!" | node ./bin "list any spelling errors"',
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
