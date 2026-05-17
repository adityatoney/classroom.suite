import JSZip from "jszip";

/**
 * Extract plain text from a .docx file in the browser.
 *
 * A .docx is a zip containing `word/document.xml`. We unzip, then run regex
 * extraction directly on the XML — sidestepping DOM/namespace quirks of
 * `DOMParser` for XML+namespaces (which silently produced empty results
 * in practice on some browsers).
 *
 * Strategy:
 *   1. Read `word/document.xml`.
 *   2. Split on `</w:p>` so each chunk is one paragraph's raw XML.
 *   3. Within each chunk, find every `<w:t ...>...</w:t>` text run and
 *      concatenate. Treat `<w:tab/>` as a tab and `<w:br/>` as a paragraph
 *      break. Decode XML entities.
 *   4. Trim and collapse consecutive blank lines.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".docx")) {
    throw new Error("File must be a .docx (Microsoft Word) file.");
  }
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const docXml = zip.file("word/document.xml");
  if (!docXml) {
    throw new Error("Couldn't find word/document.xml inside the .docx. Is the file corrupted?");
  }
  const xml = await docXml.async("string");
  if (!xml || xml.length < 50) {
    throw new Error(`word/document.xml is suspiciously small (${xml.length} bytes).`);
  }

  // Split on paragraph close tags. Each chunk is one paragraph's content.
  // Also treat <w:br/> as a paragraph break so single-paragraph blocks with
  // soft line breaks still split correctly.
  const T_OPEN = /<w:t(?:\s[^>]*)?>/gi;
  const T_CLOSE = /<\/w:t>/gi;
  const lines: string[] = [];

  // First, normalize <w:br/> → </w:p>-like break by inserting a sentinel.
  const normalized = xml
    .replace(/<w:br\s*\/>/gi, "</w:p>")
    .replace(/<w:tab\s*\/>/gi, "\t");

  const paragraphs = normalized.split(/<\/w:p>/i);
  for (const p of paragraphs) {
    const texts: string[] = [];
    // Match <w:t ...> ... </w:t> spans.
    const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(p)) !== null) {
      texts.push(decodeXmlEntities(m[1]));
    }
    const joined = texts.join("").replace(/\s+/g, " ").trim();
    lines.push(joined);
  }

  // Collapse consecutive blanks into a single blank line; trim leading/
  // trailing blanks.
  const collapsed: string[] = [];
  let prevBlank = true;
  for (const line of lines) {
    if (line === "") {
      if (!prevBlank) collapsed.push("");
      prevBlank = true;
    } else {
      collapsed.push(line);
      prevBlank = false;
    }
  }
  while (collapsed.length && collapsed[collapsed.length - 1] === "") collapsed.pop();
  // Silence unused warnings on T_OPEN/T_CLOSE — kept for grep-ability.
  void T_OPEN;
  void T_CLOSE;
  return collapsed.join("\n");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export interface MappedAnswer {
  questionId: string;
  value: string;
}

interface MappableQuestion {
  id: string;
  label: string;
}

/**
 * Question labels in the docx don't match `OBSERVATION_QUESTIONS.label`
 * verbatim — Word adds parenthetical hints, slight rephrasings, etc. To
 * find each question's position in the doc, we extract a "signature": the
 * meaningful keyword stem of the label, lowercased, punctuation-stripped.
 */
function signatureFor(label: string): string {
  return label
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[?!.,:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60); // first 60 chars of the question's words
}

function normalize(line: string): string {
  return line
    .toLowerCase()
    .replace(/[?!.,:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PLACEHOLDER_RE = /^click here to enter text\.?$/i;

/**
 * Map a docx's extracted text to ObservationQuestion answers. Walks each
 * question's signature through the text, captures whatever lines fall
 * between its label and the next-question label as the answer. Returns
 * one entry per question for which a non-placeholder answer was found.
 */
export function mapDocxTextToAnswers(
  text: string,
  questions: ReadonlyArray<MappableQuestion>
): MappedAnswer[] {
  const lines = text.split("\n");
  const normalizedLines = lines.map(normalize);

  // Find the first line whose normalized form contains the question's signature.
  const positions: Array<{ qid: string; lineIdx: number }> = [];
  for (const q of questions) {
    const sig = signatureFor(q.label);
    if (sig.length < 8) continue; // signature too short to match reliably
    for (let i = 0; i < normalizedLines.length; i++) {
      if (normalizedLines[i].includes(sig)) {
        positions.push({ qid: q.id, lineIdx: i });
        break;
      }
    }
  }
  positions.sort((a, b) => a.lineIdx - b.lineIdx);

  const answers: MappedAnswer[] = [];
  for (let i = 0; i < positions.length; i++) {
    const { qid, lineIdx } = positions[i];
    const endIdx = i + 1 < positions.length ? positions[i + 1].lineIdx : lines.length;
    const body = lines
      .slice(lineIdx + 1, endIdx)
      .filter((l) => l.trim() !== "")
      .filter((l) => !PLACEHOLDER_RE.test(l.trim()))
      .join("\n")
      .trim();
    if (body.length > 0) {
      answers.push({ questionId: qid, value: body });
    }
  }
  return answers;
}
