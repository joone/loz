import { expect } from "chai";
import "mocha";
import { enforceGuardrails } from "../src/guardrails";

describe("Guardrails Test", () => {
  describe("enforceGuardrails", () => {
    it("should throw error when shell is disabled", () => {
      expect(() => enforceGuardrails("ls -la", false)).to.throw(
        "Shell commands are disabled by configuration.",
      );
    });

    it("should allow safe commands", () => {
      expect(() => enforceGuardrails("ls -la", true)).to.not.throw();
      expect(() => enforceGuardrails("cd /tmp", true)).to.not.throw();
      expect(() => enforceGuardrails("echo hello", true)).to.not.throw();
      expect(() => enforceGuardrails("cat file.txt", true)).to.not.throw();
    });

    it("should block rm -rf /", () => {
      expect(() => enforceGuardrails("rm -rf /", true)).to.throw(
        "Command blocked by guardrails: rm -rf /",
      );
      expect(() => enforceGuardrails("RM -RF /", true)).to.throw(
        "Command blocked by guardrails: rm -rf /",
      );
    });

    it("should block rm -rf / bypass attempts", () => {
      expect(() => enforceGuardrails("rm -rf/*", true)).to.throw(
        "Command blocked by guardrails",
      );
      expect(() => enforceGuardrails("rm -rf /.", true)).to.throw(
        "Command blocked by guardrails",
      );
    });

    it("should block shutdown", () => {
      expect(() => enforceGuardrails("shutdown now", true)).to.throw(
        "Command blocked by guardrails: shutdown",
      );
      expect(() => enforceGuardrails("SHUTDOWN", true)).to.throw(
        "Command blocked by guardrails: shutdown",
      );
    });

    it("should block reboot", () => {
      expect(() => enforceGuardrails("reboot", true)).to.throw(
        "Command blocked by guardrails: reboot",
      );
      expect(() => enforceGuardrails("sudo reboot", true)).to.throw(
        "Command blocked by guardrails: reboot",
      );
    });

    it("should block fork bomb", () => {
      expect(() => enforceGuardrails(":(){ :|:& };:", true)).to.throw(
        "Command blocked by guardrails: :(){ :|:& };:",
      );
    });

    it("should block mkfs", () => {
      expect(() => enforceGuardrails("mkfs /dev/sda", true)).to.throw(
        "Command blocked by guardrails: mkfs",
      );
      expect(() => enforceGuardrails("mkfs.ext4 /dev/sda1", true)).to.throw(
        "Command blocked by guardrails: mkfs",
      );
    });

    it("should block dd if=", () => {
      expect(() =>
        enforceGuardrails("dd if=/dev/zero of=/dev/sda", true),
      ).to.throw("Command blocked by guardrails: dd if=");
    });

    it("should allow commands with similar but safe patterns", () => {
      // These should be allowed as they don't match the blocked patterns
      expect(() => enforceGuardrails("rm file.txt", true)).to.not.throw();
      expect(() => enforceGuardrails("rm -r /tmp/test", true)).to.not.throw();
      expect(() => enforceGuardrails("dd status=progress", true)).to.not.throw();
    });
  });
});
