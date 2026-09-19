import type { BroadcastKind } from "@/lib/comms/broadcast-filter";
import { COMMS_CIRCULARES } from "@/lib/comms/paths";

/** Audience segment for circulares (Spanish labels in the product UI). */
export type CircularAudienceSlug = "encargados" | "docentes" | "estudiantes";

export const CIRCULAR_AUDIENCE_SLUGS: CircularAudienceSlug[] = [
  "encargados",
  "docentes",
  "estudiantes",
];

export const DEFAULT_CIRCULAR_AUDIENCE: CircularAudienceSlug = "encargados";

export function isCircularAudienceSlug(value: string): value is CircularAudienceSlug {
  return CIRCULAR_AUDIENCE_SLUGS.includes(value as CircularAudienceSlug);
}

export function parseCircularAudience(value: string | undefined | null): CircularAudienceSlug {
  if (value && isCircularAudienceSlug(value)) return value;
  return DEFAULT_CIRCULAR_AUDIENCE;
}

export function circularAudienceToKind(slug: CircularAudienceSlug): BroadcastKind {
  if (slug === "docentes") return "teachers";
  if (slug === "estudiantes") return "students";
  return "parents";
}

export function kindToCircularAudience(kind: BroadcastKind): CircularAudienceSlug {
  if (kind === "teachers") return "docentes";
  if (kind === "students") return "estudiantes";
  return "encargados";
}

export function circularesHref(audience: CircularAudienceSlug = DEFAULT_CIRCULAR_AUDIENCE): string {
  return `${COMMS_CIRCULARES}?audience=${audience}`;
}

export function circularComposeHref(audience: CircularAudienceSlug): string {
  return `${COMMS_CIRCULARES}/nuevo?audience=${audience}`;
}

export function circularThreadHref(audience: CircularAudienceSlug, threadId: string): string {
  return `${COMMS_CIRCULARES}/${threadId}?audience=${audience}`;
}

/** i18n keys for audience tab hint text. */
export const CIRCULAR_AUDIENCE_I18N: Record<
  CircularAudienceSlug,
  {
    tab: "comms.audienceTabEncargados" | "comms.audienceTabDocentes" | "comms.audienceTabEstudiantes";
    description:
      | "comms.circularEncargadosDescription"
      | "comms.circularDocentesDescription"
      | "comms.circularEstudiantesDescription";
  }
> = {
  encargados: {
    tab: "comms.audienceTabEncargados",
    description: "comms.circularEncargadosDescription",
  },
  docentes: {
    tab: "comms.audienceTabDocentes",
    description: "comms.circularDocentesDescription",
  },
  estudiantes: {
    tab: "comms.audienceTabEstudiantes",
    description: "comms.circularEstudiantesDescription",
  },
};
