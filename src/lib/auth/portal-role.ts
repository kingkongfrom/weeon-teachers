/** School administrators sign in on the ERP. This portal accepts teachers only. */
export const TEACHER_PORTAL_ONLY_ERROR =
  "Esta cuenta es de administración del colegio. Ingrese en app.weeon.school. Este portal es solo para docentes.";

export function isTeacherPortalRole(role: unknown): role is "teacher" {
  return role === "teacher";
}
