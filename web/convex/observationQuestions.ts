/**
 * Static catalog of every question on the CHA Faculty Observation Form 2026
 * (source: docs/ST Faculty Observation Form 2026.docx).
 *
 * Two phases:
 * - "pre" — answered from the lesson plan / lesson screenshots BEFORE the
 *   observation. Claude extracts these from the uploaded images.
 * - "post" — reflective questions filled out AFTER teaching the lesson.
 *   Claude does NOT attempt to answer these; they remain editable for the
 *   teacher to fill in by hand.
 */
export type ObservationPhase = "pre" | "post";

export interface ObservationQuestion {
  id: string;
  section: string;
  phase: ObservationPhase;
  label: string;
  /** Short hint shown under the field in the UI. */
  hint?: string;
}

export const OBSERVATION_QUESTIONS: readonly ObservationQuestion[] = [
  // ── Domain 1: Planning and Preparation ───────────────────────────────────
  {
    id: "d1_materials",
    section: "Domain 1: Planning and Preparation",
    phase: "pre",
    label: "What materials are being used to present the curriculum?",
    hint: "Instructional resources including classroom, community, and supplemental student resources.",
  },
  {
    id: "d1_learning_target",
    section: "Domain 1: Planning and Preparation",
    phase: "pre",
    label: "What do you expect the students to know upon completion of the lesson?",
    hint: "Learning target / outcomes.",
  },
  {
    id: "d1_activities",
    section: "Domain 1: Planning and Preparation",
    phase: "pre",
    label: "What will the students do to demonstrate comprehension of the curriculum?",
    hint: "Explain the learning activities within the lesson.",
  },
  {
    id: "d1_grouping",
    section: "Domain 1: Planning and Preparation",
    phase: "pre",
    label: "What is the student grouping strategy of the activities and how does it support the desired learning outcomes?",
    hint: "Whole group, partners, teams...",
  },

  // ── Domain 2: The Classroom Environment ──────────────────────────────────
  {
    id: "d2_transitions",
    section: "Domain 2: The Classroom Environment",
    phase: "pre",
    label: "Describe the transitions in the classroom and how you/the students manage them.",
  },
  {
    id: "d2_distribution",
    section: "Domain 2: The Classroom Environment",
    phase: "pre",
    label: "Distribution and collection of materials and supplies.",
  },
  {
    id: "d2_non_instructional",
    section: "Domain 2: The Classroom Environment",
    phase: "pre",
    label: "Non-instructional duties (attendance, restroom, permission forms, etc.).",
  },
  {
    id: "d2_behavior_expectations",
    section: "Domain 2: The Classroom Environment",
    phase: "pre",
    label: "Are behavior expectations clearly communicated to everyone? Are they posted in the classroom? What are the results of student misbehavior in your classroom?",
  },
  {
    id: "d2_lesson_outcomes",
    section: "Domain 2: The Classroom Environment",
    phase: "pre",
    label: "What are your learning outcomes for this lesson? What do you want the students to understand?",
  },
  {
    id: "d2_state_standards",
    section: "Domain 2: The Classroom Environment",
    phase: "pre",
    label: "How does this lesson relate to the WA State Standards for your subject?",
  },
  {
    id: "d2_teaching_methods",
    section: "Domain 2: The Classroom Environment",
    phase: "pre",
    label: "What teaching/learning activities will be observed? What teaching methods?",
  },

  // ── Domain 3: Instruction ────────────────────────────────────────────────
  {
    id: "d3_extending_questions",
    section: "Domain 3: Instruction",
    phase: "pre",
    label: "What questions will you ask to encourage students to extend their learning and discuss the curriculum?",
  },
  {
    id: "d3_engagement_evidence",
    section: "Domain 3: Instruction",
    phase: "pre",
    label: "What evidence will demonstrate that all students are engaged, responsive, and participating in the conversation?",
  },
  {
    id: "d3_structure_explained",
    section: "Domain 3: Instruction",
    phase: "pre",
    label: "Will the structure of the lesson be explained to students so they know what is expected of them as learners?",
  },

  // ── Post-Observation Reflection ──────────────────────────────────────────
  {
    id: "post_success",
    section: "Post-Observation Reflection",
    phase: "post",
    label: "In general, how successful was the lesson? Did the students learn what you intended for them to learn? How do you know?",
    hint: "Danielson 4a — completed after teaching.",
  },
  {
    id: "post_evidence",
    section: "Post-Observation Reflection",
    phase: "post",
    label: "What evidence do you have of student learning? What do those samples reveal about engagement, understanding, and learning?",
    hint: "Danielson 3c.",
  },
  {
    id: "post_procedures",
    section: "Post-Observation Reflection",
    phase: "post",
    label: "How did your classroom procedures enhance or detract from the lesson? What, if anything, would you do differently?",
    hint: "Danielson 2c.",
  },
  {
    id: "post_departure",
    section: "Post-Observation Reflection",
    phase: "post",
    label: "Did you depart from your plan? If so, how and why?",
    hint: "Danielson 1c.",
  },
  {
    id: "post_delivery_effectiveness",
    section: "Post-Observation Reflection",
    phase: "post",
    label: "Comment on different aspects of your instructional delivery (activities, grouping, materials, resources). To what extent were they effective?",
  },
  {
    id: "post_do_differently",
    section: "Post-Observation Reflection",
    phase: "post",
    label: "What would you do differently if you had an opportunity to teach this lesson again to the same group of students?",
  },
  {
    id: "post_delivery_engagement",
    section: "Post-Observation Reflection",
    phase: "post",
    label: "How did your instructional delivery (directions, procedures, explanation of content, modeling, examples) impact students' cognitive engagement?",
  },
  {
    id: "post_informal_assessment",
    section: "Post-Observation Reflection",
    phase: "post",
    label: "What did you learn from the informal assessment during the lesson? How did the results impact your instruction and/or student learning?",
    hint: "Danielson 3d.",
  },
  {
    id: "post_behavior_engagement",
    section: "Post-Observation Reflection",
    phase: "post",
    label: "What impact did student behavior have on cognitive engagement and learning?",
    hint: "Danielson 2d.",
  },
];

export const PRE_QUESTIONS = OBSERVATION_QUESTIONS.filter((q) => q.phase === "pre");
export const POST_QUESTIONS = OBSERVATION_QUESTIONS.filter((q) => q.phase === "post");
