import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WebsiteImage } from "../website-image";
import { ReviewsManager, type ReviewRow } from "./reviews";

const NAMES: Record<string, string> = {
  "/": "Home page hero",
  "/lifestyle/penthouse-apartments-for-sale-rent/": "Penthouses (lifestyle tile and page)",
  "/lifestyle/duplex-apartments-for-sale-rent/": "Duplex apartments (lifestyle tile and page)",
  "/lifestyle/pet-friendly-apartments-for-sale-rent/": "Pet-friendly (lifestyle tile and page)",
  "/lifestyle/sea-view-apartments-for-sale-rent/": "Sea view (lifestyle tile and page)",
  "/about-us/": "About Us page photo",
};

export default function WebsitePage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Website</h1>
          <p className="muted">Images and client reviews for the website. Development and location images are set on their own pages; team photos on Team &amp; targets.</p>
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
  if (user.role !== "super_admin") redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: pages }, { data: revs }] = await Promise.all([
    supabase.from("site_pages").select("path, website_image").in("path", Object.keys(NAMES)).is("deleted_at", null),
    supabase.from("site_reviews").select("id, reviewer_name, rating, body, review_date, is_published, sort_order").is("deleted_at", null).order("sort_order").order("review_date", { ascending: false }),
  ]);
  const byPath = new Map((pages ?? []).map((p) => [p.path, p]));
  return (
    <>
    <section className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 className="section-title" style={{ margin: 0 }}>Client reviews on the website ({(revs ?? []).filter((r) => r.is_published).length} shown)</h2>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Shown on the home page and About Us. Copy the wording exactly from Google; hide one instead of deleting it.</p>
      <ReviewsManager rows={(revs ?? []) as ReviewRow[]} />
    </section>
    <div className="grid-2">
      {Object.entries(NAMES).map(([path, name]) => (
        <section key={path} className="panel">
          <h2 className="section-title">{name}</h2>
          {user.role === "super_admin" ? (
            <WebsiteImage kind="page" id={path} image={byPath.get(path)?.website_image} ideal={path === "/" ? "homeHero" : "page"}
              hint={path === "/" ? "A wide, bright photo. It fills the top of the home page (cropped to fit)." : path === "/about-us/" ? "Beside the introduction on About Us: the team, the office or a building you manage." : "Shown on the lifestyle tile and at the top of the page."} />
          ) : <p className="muted">Only a Super Admin can change website page images.</p>}
        </section>
      ))}
    </div>
    </>
  );
}
