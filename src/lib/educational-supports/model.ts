export const EDUCATIONAL_SUPPORT_CATEGORIES = [
  "learning",
  "assessment",
  "behavior",
  "physical",
  "communication",
  "health",
  "other",
] as const;

export const EDUCATIONAL_SUPPORT_SUBJECT_SCOPES = ["all", "specific"] as const;

export type EducationalSupportCategory = (typeof EDUCATIONAL_SUPPORT_CATEGORIES)[number];
export type EducationalSupportSubjectScope = (typeof EDUCATIONAL_SUPPORT_SUBJECT_SCOPES)[number];

export type EducationalSupport = {
  id: string;
  studentId: string;
  category: EducationalSupportCategory;
  title: string;
  description: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  active: boolean;
  subjectScope: EducationalSupportSubjectScope;
  subjectIds: string[];
  subjectLabels: string[];
  /** Free-text note added when the support is completed or extended. */
  observations: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type ClassEducationalSupportFlag = {
  studentId: string;
  activeCount: number;
  needsReview: boolean;
  needsPeriodRegistration: boolean;
};

export type ClassEducationalSupportFlags = Record<
  string,
  Pick<ClassEducationalSupportFlag, "activeCount" | "needsReview" | "needsPeriodRegistration">
>;

export type EducationalSupportRegistration = {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string | null;
  periodKey: string;
  periodLabel: string;
  functioningNotes: string | null;
  appliedPersonal: boolean;
  appliedCurricular: boolean;
  appliedAccess: boolean;
  appliedMethodology: boolean;
  appliedEvaluation: boolean;
  resultsNotes: string;
  observations: string | null;
  submittedAt: string;
  updatedAt: string;
  isCurrentPeriod: boolean;
};

export type EducationalSupportRegistrationInput = {
  studentId: string;
  classId: string;
  subjectId?: string | null;
  functioningNotes?: string | null;
  appliedPersonal: boolean;
  appliedCurricular: boolean;
  appliedAccess: boolean;
  appliedMethodology: boolean;
  appliedEvaluation: boolean;
  resultsNotes: string;
  observations?: string | null;
};

export function supportActionPending(
  flag: Pick<ClassEducationalSupportFlag, "needsReview" | "needsPeriodRegistration">,
): boolean {
  return flag.needsReview || flag.needsPeriodRegistration;
}
/** School period a support vigencia can be extended to (semestre/trimestre). */
export type SchoolPeriodOption = {
  index: number;
  label: string;
  startDate: string;
  endDate: string;
};

/** Formats `YYYY-MM-DD` as a short dd/mm for compact labels. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return month && day ? `${day}/${month}` : iso;
}

/** "II Periodo" — the menu shows the period name; the dates move to the hint. */
export function periodOptionLabel(period: SchoolPeriodOption): string {
  return period.label;
}

/** "I Periodo · 23/02 – 03/07" for the line under the picker. */
export function periodOptionRange(period: SchoolPeriodOption): string {
  return `${period.label} · ${shortDate(period.startDate)} – ${shortDate(period.endDate)}`;
}