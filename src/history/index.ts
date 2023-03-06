interface PromptAndAnswerInterface {
  prompt: string;
  answer: string;
}

export interface ChatHistory {
  date: string;
  dialogue: PromptAndAnswer[];
}

export class PromptAndAnswer implements PromptAndAnswerInterface {
  prompt: string;
  answer: string;

  constructor(prompt: string, answer: string) {
    this.prompt = prompt;
    this.answer = answer;
  }
}
