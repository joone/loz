import { hello } from "../src/hello-test";
import { expect } from "chai";
import "mocha";

describe("First test", () => {
  it("should return true", () => {
    const result = hello();
    expect(result).to.equal(true);
  });
});
