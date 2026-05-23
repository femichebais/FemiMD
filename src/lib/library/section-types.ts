import type { LibrarySectionType } from "@/db/schema";

export const SECTION_TYPE_ORDER: readonly LibrarySectionType[] = [
  "definition",
  "description",
  "what_happens_in_body",
  "symptoms",
  "physical_exam",
  "management",
  "treatment",
  "what_to_do",
] as const;

export const SECTION_TYPE_LABELS: Record<LibrarySectionType, string> = {
  definition: "Definition",
  description: "Description",
  what_happens_in_body: "What's happening in the body",
  symptoms: "Symptoms",
  physical_exam: "Physical exam",
  management: "Management",
  treatment: "Treatment",
  what_to_do: "What to do",
};

// Type-guard against arbitrary strings coming out of form data.
export function isSectionType(value: string): value is LibrarySectionType {
  return (SECTION_TYPE_ORDER as readonly string[]).includes(value);
}

// The "what to do" card renders with a warm accent (yellow) to read as a
// next-step CTA, mirroring the reference design.
export const ACCENT_SECTION_TYPE: LibrarySectionType = "what_to_do";
