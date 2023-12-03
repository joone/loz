import { Loz } from "../src/index";
import { expect } from "chai";
import "mocha";

describe("Loz.chekcEnv()", () => {
  it("should return true", () => {
    let loz = new Loz();

    const result = loz.checkEnv()
    expect(result).to.equal(true);
  });
});
