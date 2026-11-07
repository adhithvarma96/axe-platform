import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// One codebase, two surfaces:
//   internal app  -> app.axerealty.lk, app.localhost, or any deployment with APP_SURFACE=crm
//   public site   -> axerealty.lk, localhost, or APP_SURFACE=site
// App pages live under src/app/crm and are served at the root of the app host.

const CRM_PUBLIC = ["/login", "/auth"]; // reachable on the app host without a session

function surfaceFor(request: NextRequest): "crm" | "site" {
  const forced = process.env.APP_SURFACE;
  if (forced === "crm" || forced === "site") return forced;
  const host = (request.headers.get("host") ?? "").toLowerCase();
  // app.axerealty.lk, app.localhost:3000, and the Vercel app project (axe-app-*.vercel.app)
  return host.startsWith("app.") || host.startsWith("axe-app") ? "crm" : "site";
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (surfaceFor(request) === "site") {
    // The website never exposes app pages, even by their internal path.
    if (path === "/crm" || path.startsWith("/crm/")) {
      return NextResponse.rewrite(new URL("/not-found-page", request.url), { status: 404 });
    }
    return NextResponse.next();
  }

  // ---- internal app ----
  const target = request.nextUrl.clone();
  if (!path.startsWith("/crm")) target.pathname = `/crm${path === "/" ? "" : path}`;
  let response = NextResponse.rewrite(target, { request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.rewrite(target, { request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Refreshes the session; the real gate is row-level security in the database.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub && !CRM_PUBLIC.some((p) => path.startsWith(p))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow"); // the app is never indexed
  return response;
}

export const config = {
  // Everything except Next internals, API routes, the health check and static files.
  matcher: ["/((?!_next/static|_next/image|api/|healthz|favicon.ico|robots.txt|sitemap.*\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
