export function requireSupabasePublicEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan variables de Supabase. Configure SUPABASE_URL y SUPABASE_ANON_KEY en .env.local",
    );
  }

  return { url, anonKey };
}

export function teachersOrigin(requestOrigin?: string | null): string {
  const fromEnv = process.env.WEEON_TEACHERS_ORIGIN?.trim();
  if (process.env.NODE_ENV === "production") {
    return (fromEnv || "https://teachers.weeon.school").replace(/\/+$/, "");
  }
  if (requestOrigin?.trim()) {
    return requestOrigin.trim().replace(/\/+$/, "");
  }
  return (fromEnv || "http://localhost:3000").replace(/\/+$/, "");
}
