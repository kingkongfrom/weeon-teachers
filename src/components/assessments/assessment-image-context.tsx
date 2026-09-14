"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AssessmentImageContextValue = { classId: string; assessmentId: string };

const AssessmentImageContext = createContext<AssessmentImageContextValue | null>(null);

/** Makes the assessment target available to nested rich-text editors so their
 * toolbar can upload inline images to the class bucket. */
export function AssessmentImageProvider({
  value,
  children,
}: {
  value: AssessmentImageContextValue;
  children: ReactNode;
}) {
  return <AssessmentImageContext.Provider value={value}>{children}</AssessmentImageContext.Provider>;
}

export function useAssessmentImageContext(): AssessmentImageContextValue | null {
  return useContext(AssessmentImageContext);
}
