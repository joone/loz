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
