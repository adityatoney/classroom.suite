from typing import List, Optional

from pydantic import BaseModel


class Domain1(BaseModel):
    """Planning and Preparation."""
    materials: Optional[str] = None
    learning_target: Optional[str] = None
    activities: Optional[str] = None
    grouping: Optional[str] = None
    raw: Optional[str] = None


class Domain2(BaseModel):
    """The Classroom Environment."""
    transitions: Optional[str] = None
    distribution_and_collection: Optional[str] = None
    non_instructional_duties: Optional[str] = None
    behavior_expectations: Optional[str] = None
    lesson_outcomes: Optional[str] = None
    state_standards: Optional[str] = None
    teaching_methods: Optional[str] = None
    raw: Optional[str] = None


class Domain3(BaseModel):
    """Instruction."""
    extending_questions: Optional[str] = None
    engagement_evidence: Optional[str] = None
    structure_explained: Optional[str] = None
    raw: Optional[str] = None


class PostObservation(BaseModel):
    """Post-Observation Reflection — completed after the lesson."""
    success_assessment: Optional[str] = None              # 4a
    student_learning_evidence: Optional[str] = None       # 3c
    procedures_impact: Optional[str] = None               # 2c
    departure_from_plan: Optional[str] = None             # 1c
    instructional_delivery_effectiveness: Optional[str] = None
    what_to_do_differently: Optional[str] = None
    delivery_impact_on_engagement: Optional[str] = None
    informal_assessment_lessons: Optional[str] = None     # 3d
    behavior_impact_on_engagement: Optional[str] = None   # 2d
    raw: Optional[str] = None


class LessonExtractionResult(BaseModel):
    ocr_raw_text: str
    confidence: float
    domain1: Domain1
    domain2: Domain2
    domain3: Domain3
    post_observation: PostObservation
    warnings: List[str]
