export const EDUCATIONAL_SUPPORT_CATEGORIES = [
  "learning",
  "assessment",
  "behavior",
  "physical",
  "communication",
  "health",
  "other",
] as const;

export type EducationalSupportCategory = (typeof EDUCATIONAL_SUPPORT_CATEGORIES)[number];

export type EducationalSupport = {
  id: string;
  studentId: string;
  category: EducationalSupportCategory;
  title: string;
  description: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  active: boolean;
  createdAt: string;
};

export type ClassEducationalSupportFlag = {
  studentId: string;
  activeCount: number;
  needsReview: boolean;
};

export type ClassEducationalSupportFlags = Record<
  string,
  Pick<ClassEducationalSupportFlag, "activeCount" | "needsReview">
>;
