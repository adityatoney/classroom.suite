export type Pronoun = "he" | "she" | "they";

export interface CompileInput {
  studentName: string;
  pronoun: Pronoun;
  /** Ordered list of sentence templates from the comment bank. */
  selectedComments: string[];
  /** If non-empty (after trim), overrides the compiled output. */
  manualOverride?: string;
}

interface PronounMap {
  /** Capitalized subject form, e.g. "He" / "She" / "They". */
  cap: string;
  /** Lowercase subject form, e.g. "he" / "she" / "they". */
  low: string;
  /** Lowercase possessive form, e.g. "his" / "her" / "their". */
  poss: string;
}

const PRONOUN_MAP: Record<Pronoun, PronounMap> = {
  he: { cap: "He", low: "he", poss: "his" },
  she: { cap: "She", low: "she", poss: "her" },
  they: { cap: "They", low: "they", poss: "their" },
};

/** Sentence boundary: split AFTER ., !, or ? followed by whitespace. */
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/g;

function replaceWord(input: string, token: string, replacement: string): string {
  // Word-boundary global replace so NAMES, HERS, NAMED stay intact.
  const re = new RegExp(`\\b${token}\\b`, "g");
  return input.replace(re, replacement);
}

export function compileNarrative(input: CompileInput): string {
  if (input.manualOverride !== undefined && input.manualOverride.trim() !== "") {
    return input.manualOverride;
  }

  const p = PRONOUN_MAP[input.pronoun];

  const joined = input.selectedComments
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(" ");
  if (joined === "") return "";

  const sentences = joined.split(SENTENCE_BOUNDARY);

  const out = sentences.map((sentence, i) => {
    const isOdd = (i + 1) % 2 === 1;
    const nameReplacement = isOdd ? input.studentName : p.cap;

    let s = replaceWord(sentence, "NAME", nameReplacement);
    // Slash forms first (longer match → replace before bare tokens)
    s = replaceWord(s, "HE/SHE", p.low);
    s = replaceWord(s, "HIS/HER", p.poss);
    // Bare forms (the slash forms are gone by now)
    s = replaceWord(s, "HE", p.low);
    s = replaceWord(s, "SHE", p.low);
    s = replaceWord(s, "HIS", p.poss);
    s = replaceWord(s, "HER", p.poss);
    return s;
  });

  return out.join(" ");
}
