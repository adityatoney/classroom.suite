import { describe, expect, it } from "vitest";
import { compileNarrative } from "./comment-engine";

describe("compileNarrative", () => {
  it("substitutes NAME on the first sentence and capitalized pronoun on the second", () => {
    const out = compileNarrative({
      studentName: "Aiden",
      pronoun: "he",
      selectedComments: ["NAME is curious.", "HE shows growth."],
    });
    expect(out).toBe("Aiden is curious. he shows growth.");
  });

  it("handles odd-only single-sentence input", () => {
    const out = compileNarrative({
      studentName: "Aiden",
      pronoun: "he",
      selectedComments: ["NAME tries."],
    });
    expect(out).toBe("Aiden tries.");
  });

  it("replaces NAME on even sentences with the capitalized pronoun", () => {
    const out = compileNarrative({
      studentName: "Aiden",
      pronoun: "he",
      selectedComments: ["NAME tries.", "NAME persists."],
    });
    expect(out).toBe("Aiden tries. He persists.");
  });

  it("resolves HIS/HER slash form to the lowercase possessive", () => {
    const out = compileNarrative({
      studentName: "Maya",
      pronoun: "she",
      selectedComments: ["NAME shared HIS/HER work."],
    });
    expect(out).toBe("Maya shared her work.");
  });

  it("manualOverride wins over compiled output", () => {
    const out = compileNarrative({
      studentName: "Aiden",
      pronoun: "he",
      selectedComments: ["NAME is curious.", "HE shows growth."],
      manualOverride: "Custom paragraph written by hand.",
    });
    expect(out).toBe("Custom paragraph written by hand.");
  });

  it("maps the 'they' pronoun's subject and possessive forms", () => {
    // HE/SHE always lowercase per spec; the sentence-start capitalization rule
    // is only applied to NAME (so authors write NAME at the start of even
    // sentences when they want capitalized pronouns).
    const out = compileNarrative({
      studentName: "Sam",
      pronoun: "they",
      selectedComments: ["NAME shared HIS work.", "NAME contributed often."],
    });
    expect(out).toBe("Sam shared their work. They contributed often.");
  });

  it("replaces multiple tokens in one sentence", () => {
    const out = compileNarrative({
      studentName: "Aiden",
      pronoun: "he",
      selectedComments: ["NAME's HIS effort is steady."],
    });
    expect(out).toBe("Aiden's his effort is steady.");
  });

  it("returns empty string for empty selection", () => {
    expect(
      compileNarrative({ studentName: "Aiden", pronoun: "he", selectedComments: [] })
    ).toBe("");
  });

  it("splits multi-sentence templates correctly by position", () => {
    const out = compileNarrative({
      studentName: "Maya",
      pronoun: "she",
      selectedComments: ["NAME is great. HE is improving."],
    });
    expect(out).toBe("Maya is great. she is improving.");
  });

  it("does not mangle word boundaries (NAMES, HERS, NAMED stay intact)", () => {
    const out = compileNarrative({
      studentName: "Aiden",
      pronoun: "she",
      selectedComments: ["NAMES NAMED HERS untouched. NAME persists."],
    });
    expect(out).toContain("NAMES NAMED HERS untouched");
    expect(out).toContain("She persists.");
  });

  it("treats whitespace-only manualOverride as no override", () => {
    const out = compileNarrative({
      studentName: "Aiden",
      pronoun: "he",
      selectedComments: ["NAME tries."],
      manualOverride: "   ",
    });
    expect(out).toBe("Aiden tries.");
  });
});
