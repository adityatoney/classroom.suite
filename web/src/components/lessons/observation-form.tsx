"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import {
  CheckCheck,
  Sparkles,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Wand2,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  OBSERVATION_QUESTIONS,
  type ObservationQuestion,
} from "../../../convex/observationQuestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CollapsibleCard } from "@/components/shared/collapsible-card";
import { ScreenshotStrip } from "./screenshot-strip";
import { ObservationEmailPanel } from "./observation-email-panel";
import { extractTextFromDocx, mapDocxTextToAnswers } from "@/lib/docx-text";

type Observation = Doc<"lessonObservations">;

const SAVE_DEBOUNCE = 800;

export function ObservationForm({ observation }: { observation: Observation }) {
  const updateMeta = useMutation(api.lessonObservations.updateMeta);
  const patchAnswer = useMutation(api.lessonObservations.patchAnswer);
  const runPreObsExtraction = useAction(api.lessonExtraction.runPreObsExtraction);
  const runDraftPostObs = useAction(api.lessonExtraction.draftPostObs);
  const runRefine = useAction(api.lessonExtraction.refinePostObservation);

  const [title, setTitle] = useState(observation.title);
  const [observationDate, setObservationDate] = useState(observation.observationDate);
  const [educatorName, setEducatorName] = useState(observation.educatorName ?? "");
  const [gradeLevel, setGradeLevel] = useState(observation.gradeLevel ?? "");
  const [subject, setSubject] = useState(observation.subject ?? "");
  const [observerNames, setObserverNames] = useState(observation.observerNames ?? "");
  const [observerEmail, setObserverEmail] = useState(observation.observerEmail ?? "");
  const [lessonPlanText, setLessonPlanText] = useState(observation.lessonPlanText ?? "");

  const [extracting, setExtracting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [refining, setRefining] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const busy = extracting || drafting || refining;

  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (metaTimer.current) clearTimeout(metaTimer.current);
    metaTimer.current = setTimeout(() => {
      updateMeta({
        observationId: observation._id,
        title,
        observationDate,
        educatorName: educatorName || undefined,
        gradeLevel: gradeLevel || undefined,
        subject: subject || undefined,
        observerNames: observerNames || undefined,
        observerEmail: observerEmail || undefined,
        lessonPlanText: lessonPlanText || undefined,
      })
        .then(() => setSavedAt(new Date().toLocaleTimeString()))
        .catch(() => {});
    }, SAVE_DEBOUNCE);
    return () => {
      if (metaTimer.current) clearTimeout(metaTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    observationDate,
    educatorName,
    gradeLevel,
    subject,
    observerNames,
    observerEmail,
    lessonPlanText,
  ]);

  const answersMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of observation.answers) m.set(a.questionId, a.value);
    return m;
  }, [observation.answers]);

  const sections = useMemo(() => {
    const order: string[] = [];
    const grouped = new Map<string, ObservationQuestion[]>();
    for (const q of OBSERVATION_QUESTIONS) {
      if (!grouped.has(q.section)) {
        grouped.set(q.section, []);
        order.push(q.section);
      }
      grouped.get(q.section)!.push(q);
    }
    return order.map((s) => ({ section: s, questions: grouped.get(s)! }));
  }, []);

  const onExtractPreObs = async () => {
    if (
      observation.sourceScreenshotStorageIds.length === 0 &&
      (!lessonPlanText || lessonPlanText.trim() === "")
    ) {
      toast.error("Add at least one screenshot or paste lesson plan text first.");
      return;
    }
    setExtracting(true);
    toast.message("Reading your lesson plan...");
    try {
      const result = await runPreObsExtraction({ observationId: observation._id });
      if (result.status === "ok") {
        toast.success(
          `Filled ${result.filledCount} Domain 1/2/3 answer${result.filledCount === 1 ? "" : "s"}. Manual edits preserved.`
        );
      } else {
        toast.error(result.errorMessage ?? "Pre-observation extraction failed.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pre-observation extraction failed.");
    } finally {
      setExtracting(false);
    }
  };

  const onDraftPostObs = async () => {
    setDrafting(true);
    toast.message("Drafting post-observation reflections from your pre-obs answers...");
    try {
      const result = await runDraftPostObs({ observationId: observation._id });
      if (result.status === "ok") {
        toast.success(
          `Drafted ${result.filledCount} post-observation answer${result.filledCount === 1 ? "" : "s"} as predictions.`
        );
      } else {
        toast.error(result.errorMessage ?? "Post-observation draft failed.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Post-observation draft failed.");
    } finally {
      setDrafting(false);
    }
  };

  const onRefine = async () => {
    if (
      !confirm(
        "Refining will REPLACE every post-observation cell: cells you've edited get polished into Danielson-style reflections; empty cells get a fresh predictive draft from your pre-obs answers. Continue?"
      )
    ) {
      return;
    }
    setRefining(true);
    toast.message("Polishing your post-observation reflections...");
    try {
      const result = await runRefine({ observationId: observation._id });
      if (result.status === "ok") {
        toast.success(
          `Refined ${result.filledCount} post-observation cell${result.filledCount === 1 ? "" : "s"}.`
        );
      } else {
        toast.error(result.errorMessage ?? "Refine failed.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refine failed.");
    } finally {
      setRefining(false);
    }
  };

  const markComplete = async () => {
    await updateMeta({ observationId: observation._id, status: "complete" });
    toast.success("Marked complete.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {savedAt ? <>Saved {savedAt}</> : <>Edits autosave</>}
          {observation.lastExtractedAt && (
            <>
              {" · extracted "}
              {formatDistanceToNow(new Date(observation.lastExtractedAt), { addSuffix: true })}
            </>
          )}
          {observation.lastRefinedAt && (
            <>
              {" · refined "}
              {formatDistanceToNow(new Date(observation.lastRefinedAt), { addSuffix: true })}
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onExtractPreObs} disabled={busy}>
            {extracting ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {extracting ? "Extracting..." : "1. Extract pre-observation"}
          </Button>
          <Button size="sm" variant="secondary" onClick={onDraftPostObs} disabled={busy}>
            {drafting ? <Loader2 className="animate-spin" /> : <Wand2 />}
            {drafting ? "Drafting..." : "2. Draft post-observation"}
          </Button>
          {observation.status !== "complete" && (
            <Button size="sm" variant="outline" onClick={markComplete} disabled={busy}>
              <CheckCheck />
              Mark complete
            </Button>
          )}
        </div>
      </div>

      {observation.lastExtractError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Last extraction failed</p>
            <p className="mt-0.5 text-xs text-destructive/80">{observation.lastExtractError}</p>
          </div>
        </div>
      )}

      <CollapsibleCard
        title="Lesson metadata"
        defaultOpen
        storageKey="cs.obs.meta.expanded"
        contentClassName="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Observation date">
          <Input
            type="date"
            value={observationDate}
            onChange={(e) => setObservationDate(e.target.value)}
          />
        </Field>
        <Field label="Educator name">
          <Input value={educatorName} onChange={(e) => setEducatorName(e.target.value)} />
        </Field>
        <Field label="Grade level">
          <Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} />
        </Field>
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Observer name(s)">
          <Input value={observerNames} onChange={(e) => setObserverNames(e.target.value)} />
        </Field>
      </CollapsibleCard>

      <CollapsibleCard
        title="Pre-filled CHA form"
        description="Already have a filled-in CHA Faculty Observation Form (.docx)? Upload it to instantly populate the Domain 1/2/3 answer cells below — no Claude call needed. Skips the post-observation reflections."
        defaultOpen={false}
        storageKey="cs.obs.docx.expanded"
        action={
          <DocxUploadButton
            observation={observation}
            patchAnswer={patchAnswer}
            disabled={busy}
          />
        }
      >
        <p className="text-xs text-muted-foreground">
          Click <strong>Upload pre-filled .docx</strong> above. The .docx is parsed client-side
          (no Claude call) and matched against the 14 pre-observation questions by label
          signature.
        </p>
      </CollapsibleCard>

      <CollapsibleCard
        title="Lesson screenshots"
        description="Upload as many lesson-plan images as you want — pacing guide, criteria, lesson script, handouts. Claude reads all of them when you click 1. Extract pre-observation."
        defaultOpen
        storageKey="cs.obs.screenshots.expanded"
      >
        <ScreenshotStrip observation={observation} />
      </CollapsibleCard>

      <CollapsibleCard
        title="Lesson plan text (optional)"
        description="Paste lesson plan text — agenda, rotation script, lesson objectives, etc. Sent to Claude alongside screenshots for stronger grounding when you click 1. Extract pre-observation."
        defaultOpen={false}
        storageKey="cs.obs.lessontext.expanded"
      >
        <Textarea
          value={lessonPlanText}
          onChange={(e) => setLessonPlanText(e.target.value)}
          placeholder="Paste typed lesson plan text..."
          className="min-h-32 font-mono text-xs"
        />
      </CollapsibleCard>

      {sections.map(({ section, questions }) => {
        const isPost = questions[0].phase === "post";
        const slug = section.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return (
          <CollapsibleCard
            key={section}
            title={section}
            badge={
              isPost ? (
                <Badge variant="outline">
                  {observation.lastRefinedAt ? "Refined" : "Draft — revise after teaching"}
                </Badge>
              ) : undefined
            }
            description={
              isPost ? (
                <>
                  Reflective questions. <strong>2. Draft post-observation</strong> writes
                  predictive starters from your pre-obs. After teaching, edit each cell with
                  what actually happened, then click <strong>3. Refine</strong> — your edits
                  get polished into Danielson-style reflections, and any cells you left empty
                  get a fresh predictive draft.
                </>
              ) : undefined
            }
            action={
              isPost ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRefine}
                  disabled={busy}
                  title="Polish edited cells in place; fill empty cells with a fresh predictive draft."
                >
                  {refining ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  {refining ? "Refining..." : "3. Refine"}
                </Button>
              ) : undefined
            }
            defaultOpen={!isPost}
            storageKey={`cs.obs.section.${slug}.expanded`}
            contentClassName="space-y-3"
          >
            {questions.map((q) => (
              <AnswerField
                key={q.id}
                question={q}
                observationId={observation._id}
                initialValue={answersMap.get(q.id) ?? ""}
                patchAnswer={patchAnswer}
              />
            ))}
          </CollapsibleCard>
        );
      })}

      <CollapsibleCard
        title="Email observation form"
        description="Send the completed form (with screenshots inline) to the observer over Resend."
        defaultOpen={false}
        storageKey="cs.obs.email.expanded"
        contentClassName="space-y-3"
      >
        <Field label="Observer email">
          <Input
            type="email"
            value={observerEmail}
            onChange={(e) => setObserverEmail(e.target.value)}
            placeholder="observer@example.com"
          />
        </Field>
        <ObservationEmailPanel observation={observation} observerEmail={observerEmail} />
      </CollapsibleCard>
    </div>
  );
}

function AnswerField({
  question,
  observationId,
  initialValue,
  patchAnswer,
}: {
  question: ObservationQuestion;
  observationId: Id<"lessonObservations">;
  initialValue: string;
  patchAnswer: ReturnType<typeof useMutation<typeof api.lessonObservations.patchAnswer>>;
}) {
  const [value, setValue] = useState(initialValue);
  const lastSeen = useRef(initialValue);

  useEffect(() => {
    if (initialValue !== lastSeen.current && lastSeen.current === value) {
      setValue(initialValue);
    }
    lastSeen.current = initialValue;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChange = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      patchAnswer({ observationId, questionId: question.id, value: next }).catch(() => {});
    }, SAVE_DEBOUNCE);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{question.label}</Label>
      {question.hint && (
        <p className="text-[11px] text-muted-foreground">{question.hint}</p>
      )}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-20"
        placeholder={
          question.phase === "post"
            ? "Claude will draft a prediction here; revise after teaching."
            : "Claude will fill from your screenshots, or type your own."
        }
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function DocxUploadButton({
  observation,
  patchAnswer,
  disabled,
}: {
  observation: Doc<"lessonObservations">;
  patchAnswer: ReturnType<typeof useMutation<typeof api.lessonObservations.patchAnswer>>;
  disabled: boolean;
}) {
  const [parsing, setParsing] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true);
    try {
      const text = await extractTextFromDocx(file);
      if (text.trim() === "") {
        toast.warning("Extracted file is empty — no text found.");
        return;
      }
      const mapped = mapDocxTextToAnswers(text, OBSERVATION_QUESTIONS);
      if (mapped.length === 0) {
        toast.error(
          "No matching question labels found. Is this a CHA Faculty Observation Form?"
        );
        return;
      }
      // Confirm: this overwrites any existing content in matched cells.
      const totalPre = OBSERVATION_QUESTIONS.filter((q) => q.phase === "pre").length;
      if (
        !confirm(
          `Found ${mapped.length} of ${totalPre} pre-observation answers in ${file.name}. Apply? Existing content in those cells will be replaced. (Post-observation cells are untouched.)`
        )
      ) {
        return;
      }
      // Patch each answer; patchAnswer upserts so empty existing cells fill,
      // populated cells get replaced.
      for (const a of mapped) {
        await patchAnswer({
          observationId: observation._id,
          questionId: a.questionId,
          value: a.value,
        });
      }
      toast.success(
        `Filled ${mapped.length} pre-observation cell${mapped.length === 1 ? "" : "s"} from ${file.name}.`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse .docx");
    } finally {
      setParsing(false);
    }
  };

  return (
    <label
      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-medium shadow-xs transition-colors hover:bg-muted ${disabled || parsing ? "pointer-events-none opacity-50" : ""}`}
    >
      {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {parsing ? "Parsing..." : "Upload pre-filled .docx"}
      <input
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        disabled={disabled || parsing}
        onChange={onPick}
      />
    </label>
  );
}
