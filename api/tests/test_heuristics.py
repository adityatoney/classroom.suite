"""Feed a known transcript from the CHA Faculty Observation Form 2026
through the heuristic parser and assert each subfield is extracted."""
from app.services.heuristics import parse_domains


SAMPLE_TRANSCRIPT = """
Educator Name: Sonali Thakre  Grade Level: Second Grade Date of Observation: 05/13/26 Subject: Math

DOMAIN 1: Planning and Preparation Please explain the following instructional elements:

What materials are being used to present the curriculum?
We use the Eureka Math curriculum materials, Smart Board visuals, and student whiteboards.

What do you expect the students to know upon completion of the lesson?
Students will be able to calculate elapsed time across am/pm boundaries.

What will the students do to demonstrate comprehension of the curriculum?
Students will work in pairs on word problems and present their solutions.

What is the student grouping strategy of the activities and how does this support the desired learning outcomes?
Mixed-ability pairs to encourage peer scaffolding.

DOMAIN 2: The Classroom Environment Please explain your classroom procedures:

Describe the transitions in the classroom and how you/the students manage them:
Students use call-and-response chant to switch from whole-group to pair work.

Distribution and collection of materials and supplies:
Table captains distribute and collect; rotates weekly.

Non-instructional duties (attendance, restroom, permission forms, etc.):
Attendance handled during morning meeting.

Are behavior expectations clearly communicated to everyone?
Yes. Class agreements posted on the front wall and reviewed each Monday.

What are your learning outcomes for this lesson?
Mastery of elapsed-time calculations.

How does this lesson relate to the WA State Standards for your subject?
CCSS.MATH.3.MD.A.1 — solve problems involving measurement and estimation.

What teaching/learning activities will be observed?
Mini-lesson, guided practice, pair problem-solving, share-out.

DOMAIN 3: Instruction

What questions will you ask to encourage students to extend their learning?
"How would your answer change if we moved the start time by 30 minutes?"

What evidence will demonstrate that all students are engaged?
Thumbs-up checks, whiteboard responses, pair share-outs.

Will the structure of the lesson be explained to students so they know what is expected?
Yes. Agenda is posted on the board; I review it before we start.

Post-Observation
In general, how successful was the lesson?
Very successful. 80% of students mastered the exit ticket.

What evidence do you have of student learning?
Exit ticket scores and pair conversation observations.

How did your classroom procedures (routines, transitions, student movement) enhance the lesson?
Smooth transitions kept pacing tight.

Did you depart from your plan?
Slightly — added an extra example based on early confusion.

Comment on different aspects of your instructional delivery:
Visuals were effective; mini-lesson could have been shorter.

What would you do differently if you had an opportunity to teach this lesson again?
Cut the mini-lesson by 3 minutes; more practice time.

How did your instructional delivery impact students' cognitive engagement?
Students engaged through hands-on practice.

What did you learn from the informal assessment during the lesson?
Identified two students who need re-teaching on am/pm boundary.

What impact did student behavior have on cognitive engagement and learning?
Minimal disruptions; class agreements held.
"""


def test_parses_all_four_sections():
    d1, d2, d3, post, warnings = parse_domains(SAMPLE_TRANSCRIPT)
    assert warnings == []

    assert "Eureka Math" in (d1.materials or "")
    assert "elapsed time" in (d1.learning_target or "").lower()
    assert "word problems" in (d1.activities or "").lower()
    assert "Mixed-ability" in (d1.grouping or "")

    assert "call-and-response" in (d2.transitions or "")
    assert "Table captains" in (d2.distribution_and_collection or "")
    assert "morning meeting" in (d2.non_instructional_duties or "")
    assert "Class agreements" in (d2.behavior_expectations or "")
    assert "elapsed-time" in (d2.lesson_outcomes or "").lower()
    assert "CCSS" in (d2.state_standards or "")
    assert "Mini-lesson" in (d2.teaching_methods or "")

    assert "30 minutes" in (d3.extending_questions or "")
    assert "Thumbs-up" in (d3.engagement_evidence or "")
    assert "Agenda is posted" in (d3.structure_explained or "")

    assert "successful" in (post.success_assessment or "").lower()
    assert "Exit ticket" in (post.student_learning_evidence or "")
    assert "Smooth transitions" in (post.procedures_impact or "")


def test_missing_sections_warned():
    _, _, _, _, warnings = parse_domains("garbage with no anchors")
    assert any("domain1" in w for w in warnings)
    assert any("domain2" in w for w in warnings)
    assert any("domain3" in w for w in warnings)
    assert any("post" in w for w in warnings)
