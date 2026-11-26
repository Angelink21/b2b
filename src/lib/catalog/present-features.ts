/**
 * Display-time series feature list helpers.
 * Does not mutate catalog JSON / series data.
 */

const NBSP = "\u00a0";
const UNIT_RE =
  /(\d+(?:[.,]\d+)?)\s+(кг|кВт|мм|см|м|л|об\/хв|м\/хв|м³\/год|м3\/год|дБ|kg|kW|mm|cm|m|L|l|rpm|mpm|m³\/h|m3\/h|dB|V|Hz)(?=$|[\s.,;:!?)])/giu;

/** Trim, collapse spaces, drop trailing ./; capitalize first letter; NBSP before units. */
export function presentFeatureItem(raw: string): string {
  let text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "";
  text = text.replace(/[.;]\s*$/u, "").trim();
  if (!text) return "";
  text = text.replace(UNIT_RE, (_m, num: string, unit: string) => `${num}${NBSP}${unit}`);
  const first = text.charAt(0);
  if (first && first !== first.toUpperCase()) {
    text = first.toLocaleUpperCase("uk") + text.slice(1);
  }
  return text;
}

export function presentFeatureItems(items: readonly string[]): string[] {
  return items.map(presentFeatureItem).filter((t) => t.length > 0);
}

export type FeatureQualityIssue = {
  seriesId: string;
  seriesLabel: string;
  itemIndex: number;
  itemText: string;
  problems: string[];
};

const ABBREV_RE = /^[A-ZА-ЯІЇЄҐ]{2,6}$/u;
const LATIN = /[A-Za-z]/u;
const CYRILLIC = /[\u0400-\u04FF]/u;

function looksLikeProperName(word: string): boolean {
  // Brand / model tokens: mixed case Latin, or ALL CAPS short, or contains digits
  if (/\d/.test(word)) return true;
  if (ABBREV_RE.test(word.replace(/[^\p{L}]/gu, ""))) return true;
  if (/^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/.test(word)) return true; // CamelCase brands
  if (/^(TP2|USB|AISI|ONNERA|Fagor|Haier|Nomex|Ethernet)$/i.test(word)) {
    return true;
  }
  return false;
}

function hasMixedScriptWord(text: string): string | null {
  for (const word of text.split(/\s+/u)) {
    const letters = word.replace(/[^\p{L}]/gu, "");
    if (!letters) continue;
    if (LATIN.test(letters) && CYRILLIC.test(letters)) {
      return word;
    }
  }
  return null;
}

function midSentenceCapitals(text: string): string[] {
  const words = text.split(/\s+/u);
  const hits: string[] = [];
  for (let i = 1; i < words.length; i += 1) {
    const w = words[i]!;
    const letter = w.match(/\p{L}/u)?.[0];
    if (!letter) continue;
    if (letter !== letter.toLocaleUpperCase("uk")) continue;
    const clean = w.replace(/^[«"(„]+|[»")…,.!:;]+$/gu, "");
    if (!clean) continue;
    if (looksLikeProperName(clean)) continue;
    // Ukrainian/English sentence start after colon already handled as i>0
    if (ABBREV_RE.test(clean.replace(/[^\p{L}]/gu, ""))) continue;
    hits.push(w);
  }
  return hits;
}

/** Scan raw (stored) feature lines for owner-facing quality issues. */
export function collectFeatureQualityIssues(
  series: ReadonlyArray<{
    id: string;
    label: string;
    items: readonly string[];
  }>,
): FeatureQualityIssue[] {
  const out: FeatureQualityIssue[] = [];
  for (const s of series) {
    s.items.forEach((raw, index) => {
      const problems: string[] = [];
      if (/\s{2,}/u.test(raw)) {
        problems.push("double spaces");
      }
      if (/[.;]\s*$/u.test(raw.trim())) {
        problems.push("trailing period or semicolon");
      }
      const mixed = hasMixedScriptWord(raw);
      if (mixed) {
        problems.push(`mixed Latin/Cyrillic in word «${mixed}»`);
      }
      const caps = midSentenceCapitals(raw.trim().replace(/[.;]\s*$/u, ""));
      if (caps.length > 0) {
        problems.push(
          `unexpected mid-phrase capital: ${caps.slice(0, 3).join(", ")}`,
        );
      }
      if (problems.length > 0) {
        out.push({
          seriesId: s.id,
          seriesLabel: s.label,
          itemIndex: index + 1,
          itemText: raw.replace(/\s+/g, " ").trim().slice(0, 120),
          problems,
        });
      }
    });
  }
  return out;
}

export function formatContentQualityReport(
  issues: readonly FeatureQualityIssue[],
  generatedAt: string,
): string {
  const lines: string[] = [
    "# Content quality (series feature bullets)",
    "",
    `Generated: ${generatedAt}`,
    "",
    "Display-time polish (capitalize, trim, drop trailing `.`/`;`, NBSP before units) does **not** change stored CSV/JSON. Fix the sheet when listed below.",
    "",
    `Issues: **${issues.length}**`,
    "",
  ];
  if (issues.length === 0) {
    lines.push("_None._", "");
    return `${lines.join("\n")}\n`;
  }
  lines.push("| Series | Item | Text | Fix |");
  lines.push("|---|---|---|---|");
  for (const issue of issues) {
    const label = issue.seriesLabel.replace(/\|/g, "\\|").slice(0, 48);
    const text = issue.itemText.replace(/\|/g, "\\|");
    const fix = issue.problems.join("; ").replace(/\|/g, "\\|");
    lines.push(
      `| ${label} (\`${issue.seriesId}\`) | #${issue.itemIndex} | ${text} | ${fix} |`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
