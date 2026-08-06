export const COPILOT_HISTORY_KEY = "praxis-copilot-history";

export function canSendCopilotQuestion(question: string, sending: boolean): boolean {
  return !sending && question.trim().length >= 2;
}
