import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WebsiteImage } from "../website-image";

const NAMES: Record<string, string> = {
  "/": "Home page hero",
  "/lifestyle/penthouse-apartments-for-sale-rent/": "Penthouses (lifestyle tile and page)",
  "/lifestyle/duplex-apartments-for-sale-rent/": "Duplex apartments (lifestyle tile and page)",
  "/lifestyle/pet-friendly-apartments-for-sale-rent/": "Pet-friendly (lifestyle tile and page)",
  "/lifestyle/sea-view-apartments-for-sale-rent/": "Sea view (lifestyle tile and page)",
};

export default function WebsitePage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Website</h1>
          <p className="muted">Images for the website&apos;s home page and lifestyle pages. Development and location images are set on their own pages.</p>
        </div>
      </div>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <Pages />
      </Suspense>
    </>
  );
}

async function Pages() {
  await connection();
  const user = await requireUser();
  const supabase = await createClient();
  const { data: pages } = await supabase.from("site_pages").select("path, website_image").in("path", Object.keys(NAMES)).is("deleted_at", null);
  const byPath = new Map((pages ?? []).map((p) => [p.path, p]));
  return (
    <div className="grid-2">
      {Object.entries(NAMES).map(([path, name]) => (
        <section key={path} className="panel">
          <h2 className="section-title">{name}</h2>
          {user.role === "super_admin" ? (
            <WebsiteImage kind="page" id={path} url={(byPath.get(path)?.website_image as Record<string, { url: string }> | null)?.["800"]?.url ?? null}
              hint={path === "/" ? "A wide, bright photo. It fills the top of the home page (cropped to fit)." : "Shown on the lifestyle tile and at the top of the page."} />
          ) : <p className="muted">Only a Super Admin can change website page images.</p>}
        </section>
      ))}
    </div>
  );
}
