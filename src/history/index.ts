import * as fs from "fs";
import * as path from "path";

import { DEBUG, checkGitRepo } from "../utils";

const LOG_DEV_PATH = ".loz_logs";
interface PromptAndAnswerInterface {
  mode: string;
  prompt: string;
  answer: string;
}

export interface ChatHistory {
  date: string;
  dialogue: PromptAndAnswer[];
}

export class PromptAndAnswer implements PromptAndAnswerInterface {
  mode: string;
  prompt: string;
  answer: string;

  constructor(mode: string, prompt: string, answer: string) {
    this.mode = mode;
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

  addChat(chat: PromptAndAnswer) {
    this.chatHistory.dialogue.push(chat);
  }

  // Save chat history (JSON) to file.
  async saveChatHistory() {
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
    const filePath = checkGitRepo()
      ? path.join(LOG_DEV_PATH, fileName)
      : path.join(this.configPath, fileName);
    this.chatHistory.date = date.toString();
    if (DEBUG) console.log(this.chatHistory);
    const json = JSON.stringify(this.chatHistory, null, 2);

    fs.writeFileSync(filePath, json);
  }
}
