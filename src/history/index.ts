// npx mocha -r ts-node/register src/history/test.ts
import * as fs from "fs";
import * as path from "path";

import { DEBUG } from "../constant";

interface PromptAndAnswerInterface {
  mode: string;
  model: string;
  prompt: string;
  answer: string;
}

export interface ChatHistory {
  date: string;
  dialogue: PromptAndAnswer[];
}

export class PromptAndAnswer implements PromptAndAnswerInterface {
  mode: string;
  model: string;
  prompt: string;
  answer: string;

  constructor(mode: string, model: string, prompt: string, answer: string) {
    this.mode = mode;
    this.model = model;
    this.prompt = prompt;
    this.answer = answer;
  }
}

export class ChatHistoryManager {
  private chatHistory: ChatHistory;
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.chatHistory = {
      date: "",
      dialogue: [],
    };
  }

  public addChat(chat: PromptAndAnswer): void {
    this.chatHistory.dialogue.push(chat);
  }

  // Save chat history (JSON) to file.
  public async saveChatHistory(): Promise<void> {
    const date = new Date();

    const fileName =
      date.getFullYear() +
      "-" +
      (date.getMonth() + 1) +
      "-" +
      date.getDate() +
      "-" +
      date.getHours() +
      "-" +
      date.getMinutes() +
      "-" +
      date.getSeconds() +
      ".json";
    const filePath = path.join(this.configPath, fileName);
    this.chatHistory.date = date.toString();
    const json = JSON.stringify(this.chatHistory, null, 2);
    if (DEBUG) console.log("Saving chat history to " + filePath);
    fs.writeFileSync(filePath, json);
  }
}
