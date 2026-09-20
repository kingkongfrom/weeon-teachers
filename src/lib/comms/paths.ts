export const COMUNICACION_BASE = "/comunicacion";
export const COMMS_BASE = COMUNICACION_BASE;
export const COMMS_MESSAGES = `${COMUNICACION_BASE}/mensajes`;
export const COMMS_COMPOSE = `${COMUNICACION_BASE}/nuevo`;
export const COMMS_MESSAGE_COMPOSE_SLUG = "nuevo";
export const COMMS_CHAT = `${COMUNICACION_BASE}/chat`;
/** Realtime school admin ↔ teacher (separate from guardian chat). */
export const COMMS_ADMIN_CHAT = `${COMUNICACION_BASE}/chat-admin`;

/** @deprecated Legacy circulars URL */
export const COMMS_CIRCULARES = `${COMUNICACION_BASE}/circulares`;
/** @deprecated Legacy correo URL */
export const COMMS_CORREO = `${COMUNICACION_BASE}/correo`;

export function isCommsMessageComposeSlug(segment: string): boolean {
  return segment === COMMS_MESSAGE_COMPOSE_SLUG;
}

export const TEACHER_MESSAGES = COMMS_MESSAGES;
export const TEACHER_MESSAGES_COMPOSE = COMMS_COMPOSE;
export const TEACHER_MESSAGE_COMPOSE_SLUG = COMMS_MESSAGE_COMPOSE_SLUG;

export function isTeacherMessageComposeSlug(segment: string): boolean {
  return isCommsMessageComposeSlug(segment);
}
