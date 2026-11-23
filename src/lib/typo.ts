/**
 * Glue short Ukrainian function words (1–2 letters) to the following word
 * with a non-breaking space. At most one glue in a row so chains of three
 * or more words stay breakable (e.g. «в комерційних і промислових»).
 * Applied to both uk and en copy; matched as whole tokens.
 */
const SHORT_WORD =
  /(?<=^|[^\p{L}\p{N}])(від|та|до|на|по|за|у|в|з|і|й|а)[ \t]+(?=\p{L})/giu;

export function typo(text: string): string {
  const re = new RegExp(SHORT_WORD.source, "giu");
  let result = "";
  let lastIndex = 0;
  let prevWasGlue = false;
  let match = re.exec(text);
  while (match) {
    const between = text.slice(lastIndex, match.index);
    result += between;
    if (/\p{L}/u.test(between)) {
      prevWasGlue = false;
    }
    if (prevWasGlue) {
      result += match[0];
      prevWasGlue = false;
    } else {
      result += `${match[1]}\u00A0`;
      prevWasGlue = true;
    }
    lastIndex = match.index + match[0].length;
    match = re.exec(text);
  }
  result += text.slice(lastIndex);
  return result;
}
