/**
 * Glue short Ukrainian function words to the following word
 * so headings and paragraphs do not break after у / в / з / до / на / і / й / та / що.
 * Applied to both uk and en copy; the words are matched as whole tokens.
 */
const SHORT_WORD = /(?<=^|[^\p{L}\p{N}])(що|до|на|та|у|в|з|і|й)[ \t]+(?=\p{L})/giu;

export function typo(text: string): string {
  return text.replace(SHORT_WORD, (match) => {
    const word = match.replace(/[ \t]+$/u, "");
    return `${word}\u00A0`;
  });
}
