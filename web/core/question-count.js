export const QUESTION_COUNTS = [6, 12, 20];
export const DEFAULT_QUESTIONS = 12;
export const MAX_QUESTIONS = 20;
export function questionTarget(value = DEFAULT_QUESTIONS) {
  if (!QUESTION_COUNTS.includes(value)) throw new RangeError('Elige 6, 12 o 20 preguntas.');
  return value;
}
export function outputBudget(value) { const count = questionTarget(value); return count <= 6 ? 4096 : count <= 12 ? 6144 : 8192; }
