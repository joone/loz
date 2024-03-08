// npx mocha -r ts-node/register src/history/test.ts
import { expect } from "chai";
import { ChatHistoryManager, PromptAndAnswer } from ".";
import * as fs from "fs";
import * as path from "path";

describe("ChatHistoryManager", () => {
  describe("addChat and saveChatHistory", () => {
    const testConfigPath = "testConfigPath";
    let chatHistoryManager: ChatHistoryManager;

    beforeEach(() => {
      // Setup a new ChatHistoryManager and create test directory before each test
      chatHistoryManager = new ChatHistoryManager(testConfigPath);
      if (!fs.existsSync(testConfigPath)) {
        fs.mkdirSync(testConfigPath);
      }
    });

    afterEach(() => {
      // Cleanup: remove the created test directory and its contents after each test
      if (fs.existsSync(testConfigPath)) {
        fs.readdirSync(testConfigPath).forEach((file) => {
          const curPath = path.join(testConfigPath, file);
          fs.unlinkSync(curPath);
        });
        fs.rmdirSync(testConfigPath);
      }
    });

    it("should add a chat and save the chat history", async () => {
      const chat = new PromptAndAnswer("mode1", "openai", "prompt1", "answer1");
      chatHistoryManager.addChat(chat);

      await chatHistoryManager.saveChatHistory();

      // Check if the file was created
      const files = fs.readdirSync(testConfigPath);
      expect(files.length).to.equal(1);

      // Read the file and check its content
      const savedData = JSON.parse(
        fs.readFileSync(path.join(testConfigPath, files[0]), "utf8")
      );
      expect(savedData.dialogue.length).to.equal(1);
      expect(savedData.dialogue[0]).to.deep.equal({
        mode: "mode1",
        model: "openai",
        prompt: "prompt1",
        answer: "answer1",
      });
    });
  });
});
