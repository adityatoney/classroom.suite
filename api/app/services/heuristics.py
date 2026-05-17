"""Heuristic parser: split OCR'd lesson screenshots into the CHA Faculty
Observation Form domains.

The form's pre-observation section has three numbered Domains plus a
Post-Observation reflection section. We anchor on each section header,
slice the text, then attempt subfield extraction inside each slice.
"""
import re
from typing import List, Optional, Tuple

from app.schemas import Domain1, Domain2, Domain3, PostObservation


SECTION_ANCHORS = [
    ("domain1", re.compile(r"DOMAIN\s*1[^a-z]*Planning", re.IGNORECASE)),
    ("domain2", re.compile(r"DOMAIN\s*2[^a-z]*Classroom\s*Environment", re.IGNORECASE)),
    ("domain3", re.compile(r"DOMAIN\s*3[^a-z]*Instruction", re.IGNORECASE)),
    ("post",    re.compile(r"Post[\-\s]*Observation", re.IGNORECASE)),
]


def _slice_sections(text: str) -> dict:
    """Return {section_key: section_text} for whatever anchors are found."""
    matches = []
    for key, pattern in SECTION_ANCHORS:
        m = pattern.search(text)
        if m:
            matches.append((m.start(), key))

    matches.sort()
    out: dict = {}
    for i, (start, key) in enumerate(matches):
        end = matches[i + 1][0] if i + 1 < len(matches) else len(text)
        out[key] = text[start:end].strip()
    return out


def _extract_subfield(section_text: str, label_patterns: List[str], stop_patterns: List[str]) -> Optional[str]:
    """Find a labeled subfield in a section by regex.

    label_patterns are alternatives matched against the leading prompt.
    stop_patterns are the next subfield labels (or any next-section anchor)
    that terminate the value.
    """
    label_re = re.compile("|".join(label_patterns), re.IGNORECASE)
    label_match = label_re.search(section_text)
    if not label_match:
        return None

    start = label_match.end()
    rest = section_text[start:]

    stop_re = re.compile("|".join(stop_patterns), re.IGNORECASE) if stop_patterns else None
    if stop_re:
        stop_match = stop_re.search(rest)
        end = stop_match.start() if stop_match else len(rest)
    else:
        end = len(rest)

    value = rest[:end].strip(" :\n\t-")
    # Strip the Word placeholder text
    value = re.sub(r"Click here to enter text\.?", "", value, flags=re.IGNORECASE).strip()
    return value or None


def _parse_domain1(text: str) -> Domain1:
    materials = _extract_subfield(
        text,
        [r"What materials are being used"],
        [r"What do you expect the students", r"What will the students do",
         r"What is the student grouping", r"DOMAIN\s*2"],
    )
    learning_target = _extract_subfield(
        text,
        [r"What do you expect the students to know", r"Learning Target"],
        [r"What will the students do", r"What is the student grouping", r"DOMAIN\s*2"],
    )
    activities = _extract_subfield(
        text,
        [r"What will the students do to demonstrate", r"learning activities"],
        [r"What is the student grouping", r"DOMAIN\s*2"],
    )
    grouping = _extract_subfield(
        text,
        [r"What is the student grouping"],
        [r"DOMAIN\s*2"],
    )
    return Domain1(
        materials=materials,
        learning_target=learning_target,
        activities=activities,
        grouping=grouping,
        raw=text if not any([materials, learning_target, activities, grouping]) else None,
    )


def _parse_domain2(text: str) -> Domain2:
    transitions = _extract_subfield(
        text,
        [r"Describe the transitions"],
        [r"Distribution and collection", r"Non[\-\s]instructional duties",
         r"behavior expectations", r"DOMAIN\s*3"],
    )
    distribution = _extract_subfield(
        text,
        [r"Distribution and collection"],
        [r"Non[\-\s]instructional duties", r"behavior expectations", r"DOMAIN\s*3"],
    )
    non_instructional = _extract_subfield(
        text,
        [r"Non[\-\s]instructional duties"],
        [r"behavior expectations", r"learning outcomes", r"DOMAIN\s*3"],
    )
    behavior = _extract_subfield(
        text,
        [r"behavior expectations.*clearly communicated", r"behavior expectations"],
        [r"learning outcomes", r"WA\s*State\s*Standards", r"teaching.*methods", r"DOMAIN\s*3"],
    )
    outcomes = _extract_subfield(
        text,
        [r"learning outcomes for this lesson"],
        [r"WA\s*State\s*Standards", r"teaching.*methods", r"DOMAIN\s*3"],
    )
    standards = _extract_subfield(
        text,
        [r"WA\s*State\s*Standards"],
        [r"teaching.*methods", r"DOMAIN\s*3"],
    )
    methods = _extract_subfield(
        text,
        [r"teaching.*learning activities will be observed", r"teaching methods"],
        [r"DOMAIN\s*3"],
    )
    return Domain2(
        transitions=transitions,
        distribution_and_collection=distribution,
        non_instructional_duties=non_instructional,
        behavior_expectations=behavior,
        lesson_outcomes=outcomes,
        state_standards=standards,
        teaching_methods=methods,
        raw=text if not any([transitions, distribution, non_instructional, behavior, outcomes, standards, methods]) else None,
    )


def _parse_domain3(text: str) -> Domain3:
    questions = _extract_subfield(
        text,
        [r"What questions will you ask to encourage"],
        [r"What evidence will demonstrate", r"structure of the lesson", r"Post[\-\s]Observation"],
    )
    engagement = _extract_subfield(
        text,
        [r"What evidence will demonstrate"],
        [r"structure of the lesson", r"Post[\-\s]Observation"],
    )
    structure = _extract_subfield(
        text,
        [r"Will the structure of the lesson"],
        [r"Post[\-\s]Observation"],
    )
    return Domain3(
        extending_questions=questions,
        engagement_evidence=engagement,
        structure_explained=structure,
        raw=text if not any([questions, engagement, structure]) else None,
    )


def _parse_post(text: str) -> PostObservation:
    success = _extract_subfield(text, [r"how successful was the lesson"], [r"What evidence do you have"])
    evidence = _extract_subfield(text, [r"What evidence do you have of student learning"], [r"classroom procedures"])
    procedures = _extract_subfield(text, [r"classroom procedures \(routines"], [r"depart from your plan"])
    departure = _extract_subfield(text, [r"Did you depart from your plan"], [r"different aspects of your instructional delivery"])
    delivery_eff = _extract_subfield(
        text,
        [r"different aspects of your instructional delivery"],
        [r"do differently if you had an opportunity", r"How did your instructional delivery"],
    )
    differently = _extract_subfield(
        text,
        [r"do differently if you had an opportunity"],
        [r"How did your instructional delivery"],
    )
    delivery_impact = _extract_subfield(
        text,
        [r"How did your instructional delivery"],
        [r"informal assessment"],
    )
    informal = _extract_subfield(
        text,
        [r"informal assessment during the lesson"],
        [r"impact did student behavior"],
    )
    behavior_impact = _extract_subfield(
        text,
        [r"impact did student behavior"],
        [],
    )
    all_fields = [success, evidence, procedures, departure, delivery_eff, differently, delivery_impact, informal, behavior_impact]
    return PostObservation(
        success_assessment=success,
        student_learning_evidence=evidence,
        procedures_impact=procedures,
        departure_from_plan=departure,
        instructional_delivery_effectiveness=delivery_eff,
        what_to_do_differently=differently,
        delivery_impact_on_engagement=delivery_impact,
        informal_assessment_lessons=informal,
        behavior_impact_on_engagement=behavior_impact,
        raw=text if not any(all_fields) else None,
    )


def parse_domains(text: str) -> Tuple[Domain1, Domain2, Domain3, PostObservation, List[str]]:
    """Top-level parser. Returns the four section models + a list of warnings."""
    sections = _slice_sections(text)
    warnings: List[str] = []

    for key in ("domain1", "domain2", "domain3", "post"):
        if key not in sections:
            warnings.append(f"Section anchor not found: {key}")

    d1 = _parse_domain1(sections.get("domain1", ""))
    d2 = _parse_domain2(sections.get("domain2", ""))
    d3 = _parse_domain3(sections.get("domain3", ""))
    post = _parse_post(sections.get("post", ""))

    return d1, d2, d3, post, warnings
