import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { OLD_LISTINGS } from "@/lib/site/old-listings";

// One codebase, two surfaces:
//   internal app  -> app.axerealty.lk, app.localhost, or any deployment with APP_SURFACE=crm
//   public site   -> axerealty.lk, localhost, or APP_SURFACE=site
// App pages live under src/app/crm and are served at the root of the app host.

const CRM_PUBLIC = ["/login", "/auth"]; // reachable on the app host without a session

type Known = { property: Set<string>; location: Set<string>; development: Set<string> };
let knownCache: { at: number; value: Known } | null = null;
/** Valid public slugs, refreshed at most once a minute. Returns null if unavailable (then pages decide). */
async function knownSlugs(): Promise<Known | null> {
  if (knownCache && Date.now() - knownCache.at < 60_000) return knownCache.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const get = async (view: string) => {
      const r = await fetch(`${url}/rest/v1/${view}?select=slug`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(2500) });
      if (!r.ok) throw new Error(String(r.status));
      return new Set(((await r.json()) as { slug: string | null }[]).map((x) => x.slug ?? "").filter(Boolean));
    };
    const [property, location, development] = await Promise.all([get("web_listings"), get("web_locations"), get("web_developments")]);
    knownCache = { at: Date.now(), value: { property, location, development } };
    return knownCache.value;
  } catch {
    return knownCache?.value ?? null;
  }
}

/** Adhith's decision for an old listing: its new listing while that is live on the site, else the fallback page. */
async function resolveOldListing(entry: (typeof OLD_LISTINGS)[string]): Promise<string> {
  if ("path" in entry) return entry.path;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return entry.fallback;
  try {
    const r = await fetch(`${url}/rest/v1/web_listings?select=slug&listing_no=eq.${encodeURIComponent(entry.listing)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2500),
    });
    const rows = (await r.json()) as { slug: string }[];
    return rows[0]?.slug ? `/property/${rows[0].slug}/` : entry.fallback;
  } catch {
    return entry.fallback;
  }
}

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
    // Old website listing addresses: permanent redirect before anything renders.
    const m = path.match(/^\/(property|location|development)\/([^/]+)\/?$/);
    if (m && m[1] === "property" && OLD_LISTINGS[m[2]]) {
      const target = await resolveOldListing(OLD_LISTINGS[m[2]]);
      return NextResponse.redirect(new URL(target, request.url), 301);
    }
    // Unknown listing/location/development: a real 404 (pages stream, so they can't change the status later).
    if (m) {
      const known = await knownSlugs();
      if (known && !known[m[1] as keyof Known].has(m[2])) {
        return NextResponse.rewrite(new URL("/not-found-page", request.url), { status: 404 });
      }
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
