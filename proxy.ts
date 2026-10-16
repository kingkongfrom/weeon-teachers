import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isTeacherPortalRole } from "@/lib/auth/portal-role";
import { authCookieOptions } from "@/lib/supabase/auth-cookie";

function redirectWithSession(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        const changed = cookiesToSet.some(
          ({ name, value }) => request.cookies.get(name)?.value !== value,
        );
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        if (changed) {
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        }
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const needsSession =
    pathname.startsWith("/grupos") ||
    pathname.startsWith("/inicio") ||
    pathname.startsWith("/aula-virtual") ||
    pathname.startsWith("/comunicacion") ||
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/horarios") ||
    pathname.startsWith("/estudiantes") ||
    pathname.startsWith("/reportes") ||
    pathname === "/crear-contrasena";

  if (user) {
    const claimRole = user.app_metadata?.role;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const teacher = isTeacherPortalRole(profile?.role) && claimRole !== "admin";
    if (profile && !teacher) {
      await supabase.auth.signOut({ scope: "local" });
      if (pathname !== "/") {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/";
        loginUrl.search = "aviso=admin";
        return redirectWithSession(loginUrl, supabaseResponse);
      }
      return supabaseResponse;
    }
  }

  if (!user && needsSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.search = "";
    return redirectWithSession(loginUrl, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/inicio",
    "/inicio/:path*",
    "/aula-virtual",
    "/aula-virtual/:path*",
    "/comunicacion",
    "/comunicacion/:path*",
    "/agenda",
    "/agenda/:path*",
    "/crear-contrasena",
    "/grupos",
    "/grupos/:path*",
    "/estudiantes",
    "/estudiantes/:path*",
    "/horarios",
    "/reportes",
  ],
};
