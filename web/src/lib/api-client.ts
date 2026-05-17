/** Lightweight client for the FastAPI OCR sidecar. */

export interface LessonDomain1 {
  materials?: string | null;
  learning_target?: string | null;
  activities?: string | null;
  grouping?: string | null;
  raw?: string | null;
}
export interface LessonDomain2 {
  transitions?: string | null;
  distribution_and_collection?: string | null;
  non_instructional_duties?: string | null;
  behavior_expectations?: string | null;
  lesson_outcomes?: string | null;
  state_standards?: string | null;
  teaching_methods?: string | null;
  raw?: string | null;
}
export interface LessonDomain3 {
  extending_questions?: string | null;
  engagement_evidence?: string | null;
  structure_explained?: string | null;
  raw?: string | null;
}
export interface LessonPostObservation {
  success_assessment?: string | null;
  student_learning_evidence?: string | null;
  procedures_impact?: string | null;
  departure_from_plan?: string | null;
  instructional_delivery_effectiveness?: string | null;
  what_to_do_differently?: string | null;
  delivery_impact_on_engagement?: string | null;
  informal_assessment_lessons?: string | null;
  behavior_impact_on_engagement?: string | null;
  raw?: string | null;
}

export interface LessonExtractionResult {
  ocr_raw_text: string;
  confidence: number;
  domain1: LessonDomain1;
  domain2: LessonDomain2;
  domain3: LessonDomain3;
  post_observation: LessonPostObservation;
  warnings: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10811";

export async function extractLessonScreenshot(file: File): Promise<LessonExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/extract-lesson-screenshot`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Extraction failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as LessonExtractionResult;
}
