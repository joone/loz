import { describe, it } from "mocha";
import { expect } from "chai";
import { validateCommand, validateFilePath, truncateOutput, DEFAULT_SAFETY_CONFIG } from "../src/agent/safety";
import * as path from "path";

describe("Agent Safety", () => {
  const workingDir = "/home/user/project";

  describe("validateCommand", () => {
    it("should allow safe commands", () => {
      expect(() => validateCommand("ls -la", DEFAULT_SAFETY_CONFIG, workingDir)).to.not.throw();
      expect(() => validateCommand("pwd", DEFAULT_SAFETY_CONFIG, workingDir)).to.not.throw();
      expect(() => validateCommand("cat file.txt", DEFAULT_SAFETY_CONFIG, workingDir)).to.not.throw();
    });

    it("should block dangerous commands from basic guardrails", () => {
      expect(() => validateCommand("rm -rf /", DEFAULT_SAFETY_CONFIG, workingDir)).to.throw("blocked by guardrails");
      expect(() => validateCommand("shutdown now", DEFAULT_SAFETY_CONFIG, workingDir)).to.throw("blocked by guardrails");
      expect(() => validateCommand("reboot", DEFAULT_SAFETY_CONFIG, workingDir)).to.throw("blocked by guardrails");
    });

    it("should block network commands when network disabled", () => {
      expect(() => validateCommand("curl http://example.com", DEFAULT_SAFETY_CONFIG, workingDir)).to.throw("Network command");
      expect(() => validateCommand("wget file.zip", DEFAULT_SAFETY_CONFIG, workingDir)).to.throw("Network command");
    });

    it("should allow network commands when network enabled", () => {
      const config = { ...DEFAULT_SAFETY_CONFIG, enableNetwork: true };
      expect(() => validateCommand("curl http://example.com", config, workingDir)).to.not.throw();
    });

    it("should block path traversal in sandbox mode", () => {
      expect(() => validateCommand("cat ../../etc/passwd", DEFAULT_SAFETY_CONFIG, workingDir)).to.throw("Path traversal");
    });

    it("should allow relative paths within working directory", () => {
      expect(() => validateCommand("cat ./src/index.ts", DEFAULT_SAFETY_CONFIG, workingDir)).to.not.throw();
    });

    it("should block dangerous patterns", () => {
      expect(() => validateCommand("chmod 777 /", DEFAULT_SAFETY_CONFIG, workingDir)).to.throw("blocked by safety policy");
      expect(() => validateCommand("chown root file", DEFAULT_SAFETY_CONFIG, workingDir)).to.throw("blocked by safety policy");
    });
  });

  describe("validateFilePath", () => {
    it("should allow files within working directory", () => {
      expect(() => validateFilePath("src/index.ts", workingDir)).to.not.throw();
      expect(() => validateFilePath("./test/file.ts", workingDir)).to.not.throw();
    });

    it("should block path traversal outside working directory", () => {
      expect(() => validateFilePath("../../etc/passwd", workingDir)).to.throw("outside working directory");
    });

    it("should block sensitive file patterns", () => {
      expect(() => validateFilePath(".ssh/id_rsa", workingDir)).to.throw("sensitive file");
      expect(() => validateFilePath(".env", workingDir)).to.throw("sensitive file");
      expect(() => validateFilePath("secret.key", workingDir)).to.throw("sensitive file");
      expect(() => validateFilePath("password.txt", workingDir)).to.throw("sensitive file");
    });

    it("should allow normal configuration files", () => {
      expect(() => validateFilePath("package.json", workingDir)).to.not.throw();
      expect(() => validateFilePath("tsconfig.json", workingDir)).to.not.throw();
    });
  });

  describe("truncateOutput", () => {
    it("should not truncate output below max", () => {
      const output = "short output";
      const result = truncateOutput(output, 1000);
      expect(result).to.equal(output);
    });

    it("should truncate output exceeding max", () => {
      const output = "a".repeat(2000);
      const result = truncateOutput(output, 1000);
      expect(result.length).to.be.lessThan(output.length);
      expect(result).to.contain("truncated");
    });

    it("should include truncation message", () => {
      const output = "x".repeat(5000);
      const result = truncateOutput(output, 1000);
      expect(result).to.match(/\[output truncated, \d+ bytes hidden\]/);
    });
  });
});
