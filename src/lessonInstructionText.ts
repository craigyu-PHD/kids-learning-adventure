const alphabetWords = new Map([
  ['a-apple', 'apple'],
  ['b-ball', 'ball'],
  ['c-cat', 'cat'],
  ['d-dog', 'dog'],
]);

/** Format teaching copy and speech; keep vocabulary and event identifiers unchanged. */
export function lessonInstructionText(text: string): string {
  return text
    .replace(/\bAdventure\s*\d+\s*:\s*/gi, '')
    .replace(/\bwhat-is-it\b/gi, 'What is it?')
    .replace(/\bwhere-is-it\b/gi, 'Where is it?')
    .replace(/\b(?:a-apple|b-ball|c-cat|d-dog)\b/gi, token =>
      `${token[0].toUpperCase()} for ${alphabetWords.get(token.toLowerCase())}`);
}

/** Letter cards accept the named word for the existing younger-learner oral task. */
export function lessonSpeakingTarget(target: string): string {
  return alphabetWords.get(target.toLowerCase()) ?? target;
}
