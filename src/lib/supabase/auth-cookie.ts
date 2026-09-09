/** Keeps teacher-portal auth separate from app.weeon.school on localhost. */
export const AUTH_COOKIE_NAME = "sb-weeon-teachers-auth";

export function authCookieOptions() {
  return { name: AUTH_COOKIE_NAME, path: "/" as const };
}
