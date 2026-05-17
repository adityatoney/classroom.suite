const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-5.4";
const MAX_TOKENS = 8192;

export interface Screenshot {
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  dataBase64: string;
}

export interface Question {
  id: string;
  section: string;
  phase: "pre" | "post";
  label: string;
  hint?: string;
}

export interface ExtractResult {
  answers: Record<string, string>;
}

export function getConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY env var is not set. Start the sidecar with it exported.");
  }
  const baseUrl = (process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  return { apiKey, baseUrl, model };
}

function renderQs(qs: Question[]): string {
  return qs
    .map((q) => `- ${q.id} (${q.section}): ${q.label}${q.hint ? ` (${q.hint})` : ""}`)
    .join("\n");
}

function buildExtractionPrompt(
  questions: Question[],
  lessonPlanText: string | undefined
): string {
  const planSection = lessonPlanText && lessonPlanText.trim() !== ""
    ? `\n\nADDITIONAL CONTEXT — typed lesson plan text the teacher provided:\n"""\n${lessonPlanText.trim()}\n"""\n`
    : "";
  const keysList = questions.map((q) => `"${q.id}"`).join(", ");

  return `You are a teaching coach helping a teacher prepare the PRE-OBSERVATION
section of their lesson observation form. The attached screenshots are from
the teacher's lesson plan, schedule, and supporting materials.${planSection}

Answer EVERY question below in 2–4 grounded sentences. Never return an empty
string — always produce a usable draft the teacher can edit. Two tiers of
grounding:

1. DIRECT — when the screenshots or lesson plan text clearly show the answer
   (e.g. learning target, lesson activities, agenda steps, materials), use
   what's visible and be specific.

2. INFERRED — when the inputs don't directly answer the question (common for
   procedural items like "transitions", "behavior expectations",
   "non-instructional duties", "distribution of materials", "WA State
   Standards"), make a thoughtful inference grounded in the lesson plan's
   subject / grade and standard early-elementary classroom practice. Open
   inferred answers with a tell so the teacher can spot them, e.g. "Based on
   the lesson plan, I'd expect…" / "Standard practice for this grade level
   is…" / "Although the lesson plan doesn't specify, a reasonable approach
   would be…". Do not invent specifics like exact rule wording or posted
   standards numbers unless they're visible.

Voice: first person, present tense throughout. No markdown / bullets /
headers inside answers — plain sentences only.

QUESTIONS:
${renderQs(questions)}

OUTPUT FORMAT — CRITICAL: Reply with EXACTLY ONE JSON object and NOTHING
ELSE. No preamble, no commentary, no markdown code fences. The JSON must
have one top-level key \`answers\` whose value is an object with these
question id keys: ${keysList}. Every key must be present and the value
must be a non-empty string.`;
}

function buildPostObsPrompt(
  preAnswers: Record<string, string>,
  postQuestions: Question[],
  lessonPlanText: string | undefined,
  existingPostObs: Record<string, string> | undefined
): string {
  const preBlock = Object.entries(preAnswers)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  const planSection = lessonPlanText && lessonPlanText.trim() !== ""
    ? `\n\nLESSON PLAN TEXT (typed by the teacher):\n"""\n${lessonPlanText.trim()}\n"""\n`
    : "";
  const keysList = postQuestions.map((q) => `"${q.id}"`).join(", ");

  // Partition: which post-obs cells have rough teacher content to polish vs.
  // which are empty and need a fresh predictive draft.
  const hasExisting = existingPostObs
    ? postQuestions.filter((q) => (existingPostObs[q.id] ?? "").trim() !== "")
    : [];
  const needsDraft = existingPostObs
    ? postQuestions.filter((q) => (existingPostObs[q.id] ?? "").trim() === "")
    : postQuestions;

  const polishBlock = hasExisting.length === 0
    ? ""
    : `\n=== POLISH MODE — refine the existing answers in place ===
The teacher wrote rough notes in the cells below. For each, KEEP the facts,
events, names, and intent intact. Rewrite into a 3–5 sentence
Danielson-style reflection in plain sentences (no markdown, no bullets).
Improve voice, flow, and grammar; expand thin reasoning. DO NOT invent
events the teacher didn't mention.

${hasExisting
        .map((q) => `--- ${q.id} (${q.section}) ---
Question: ${q.label}${q.hint ? ` (${q.hint})` : ""}
Teacher's current draft:
"""
${existingPostObs![q.id].trim()}
"""`)
        .join("\n\n")}\n`;

  const draftBlock = needsDraft.length === 0
    ? ""
    : `\n=== DRAFT MODE — write a fresh predictive draft for these ===
These cells are empty. Write a forward-looking PREDICTIVE draft grounded
entirely in the pre-observation answers. Lead with phrasing like
"Based on the lesson plan, I anticipate…" / "I expect…" / "I am
planning for…" so the teacher knows these are pre-teaching drafts.
3–5 sentences each, plain sentences, no markdown.

${needsDraft
        .map((q) => `- ${q.id} (${q.section}): ${q.label}${q.hint ? ` (${q.hint})` : ""}`)
        .join("\n")}\n`;

  return `You are working on the POST-OBSERVATION REFLECTION section of a CHA
Faculty Observation Form for a teacher.

You have the teacher's pre-observation answers (Domain 1, 2, 3) as the
authoritative description of the lesson plan. Some post-obs cells already
have rough teacher drafts to polish; cells without a draft need a fresh
predictive draft.

Each final answer MUST be lesson-specific — mention the actual rotation
names, materials, strategies, activities that appear in the pre-obs. No
markdown / bullets / headers inside answers — plain sentences only.

=== TEACHER'S PRE-OBSERVATION ANSWERS (lesson design reference) ===
${preBlock}${planSection}
${polishBlock}${draftBlock}
OUTPUT FORMAT — CRITICAL: Reply with EXACTLY ONE JSON object and NOTHING
ELSE. No preamble, no commentary, no markdown code fences. The JSON must
have one top-level key \`answers\` whose value is an object with these
question id keys: ${keysList}. Every key must be present and the value
must be a non-empty string.`;
}

function stripCodeFences(s: string): string {
  let out = s.trim();
  // ```json\n...\n```  or  ```\n...\n```
  out = out.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return out.trim();
}

async function callGateway(
  prompt: string,
  imageBlocks: Array<{ type: "image_url"; image_url: { url: string; detail: "high" } }>
): Promise<Record<string, string>> {
  const { apiKey, baseUrl, model } = getConfig();
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" } }
  > = [{ type: "text", text: prompt }, ...imageBlocks];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "user-agent": "classroom.suite/0.1.0",
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: MAX_TOKENS,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      throw new Error(
        `Gateway rate limit${retryAfter ? ` — retry after ${retryAfter}s` : ""}. Detail: ${detail.slice(0, 400)}`
      );
    }
    if (res.status === 401) {
      throw new Error(
        `Gateway 401 (auth). If your key is from a non-OpenAI gateway, set OPENAI_BASE_URL. Detail: ${detail.slice(0, 400)}`
      );
    }
    throw new Error(`Gateway ${res.status}: ${detail.slice(0, 600)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    error?: { message?: string };
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error(
      `Gateway returned no content. finish_reason=${data.choices?.[0]?.finish_reason ?? "?"} error=${data.error?.message ?? "none"}`
    );
  }
  const stripped = stripCodeFences(raw);
  let parsed: { answers?: Record<string, string> };
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    throw new Error(
      `Couldn't JSON-parse the model output. Raw (first 400 chars): ${stripped.slice(0, 400)}; error: ${e instanceof Error ? e.message : e}`
    );
  }
  if (!parsed.answers || typeof parsed.answers !== "object") {
    throw new Error("Model output missing top-level `answers` object.");
  }
  return parsed.answers;
}

export async function extractAnswers(
  screenshots: Screenshot[],
  questions: Question[],
  lessonPlanText?: string
): Promise<ExtractResult> {
  if (screenshots.length === 0 && (!lessonPlanText || lessonPlanText.trim() === "")) {
    throw new Error("Provide at least one screenshot or lesson plan text.");
  }
  const imageBlocks = screenshots.map((s) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:${s.mediaType};base64,${s.dataBase64}`,
      detail: "high" as const,
    },
  }));
  const prompt = buildExtractionPrompt(questions, lessonPlanText);
  const answers = await callGateway(prompt, imageBlocks);
  return { answers };
}

/**
 * Generate post-observation answers. Two modes (per-cell):
 *  - `existingPostObs` absent or all cells empty → DRAFT: fresh predictive
 *    drafts from pre-obs.
 *  - `existingPostObs` has non-empty values → POLISH those cells in place,
 *    DRAFT the empty ones. One API call returns all 9 answers.
 */
export async function generatePostObs(input: {
  preAnswers: Record<string, string>;
  postQuestions: Question[];
  lessonPlanText?: string;
  existingPostObs?: Record<string, string>;
}): Promise<ExtractResult> {
  if (!input.preAnswers || Object.keys(input.preAnswers).length === 0) {
    throw new Error(
      "preAnswers is empty — fill in Domain 1/2/3 answers before generating post-observation."
    );
  }
  const prompt = buildPostObsPrompt(
    input.preAnswers,
    input.postQuestions,
    input.lessonPlanText,
    input.existingPostObs
  );
  const answers = await callGateway(prompt, []);
  return { answers };
}
