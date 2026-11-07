import { Suspense } from "react";
import type { Metadata } from "next";
import { gallery, sizes } from "@/lib/site/data";
import { intentLabel, SITE, typeNoun, waLink } from "@/lib/site/listing";
import { SiteHeader } from "../../components";
import { Gallery } from "../../gallery";

// Client photo gallery behind the "Property Pictures Link" in WhatsApp shares (SPEC 7.12).
// Unlisted: long random token, noindex, no referrer, only photos + basic specs. Works whether
// or not the listing is on the website; agents can switch the link off per listing.
export const metadata: Metadata = {
  title: "Property photos",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function GalleryPage({ params }: PageProps<"/g/[token]">) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="wrap section" style={{ minHeight: 480 }} />}>
        <Body params={params} />
      </Suspense>
    </>
  );
}

const FURNISHING: Record<string, string> = { fully: "Fully furnished", semi: "Semi furnished", unfurnished: "Unfurnished" };
const furnishing = (f: string | null) => (f ? FURNISHING[f] ?? null : null);

async function Body({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const g = await gallery(token);
  if (!g) {
    return (
      <section className="wrap section" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 640 }}>
        <h1 style={{ fontSize: 30 }}>This photo link has expired</h1>
        <p>The property may have been let or sold. Ask your Axe Realty agent for the latest photos, or browse what is available now.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a className="s-btn" href="/properties/">See available properties</a>
          <a className="s-btn s-btn-wa" href={waLink("Hi Axe Realty, the photo link I was sent has expired.")}>WhatsApp us</a>
        </div>
      </section>
    );
  }
  const noun = typeNoun(g.property_type);
  const heading = [g.beds ? `${g.beds} Bed` : null, noun, intentLabel({ listing_types: g.listing_types as ("rent_long_term" | "rent_short_term" | "sale")[] }), g.location_name ? `in ${g.location_name}` : null].filter(Boolean).join(" ");
  const specs = [
    g.development_name,
    g.beds != null ? `${g.beds} Beds` : null,
    g.baths != null ? `${g.baths} Baths` : null,
    g.square_feet ? `${Number(g.square_feet).toLocaleString("en-US")} sq ft` : null,
    furnishing(g.furnished),
  ].filter(Boolean) as string[];
  const photos = g.photos.map((p) => {
    const s = sizes(p);
    const t = s["800"] ?? s["400"], big = s["2048"] ?? s["full"] ?? s["1600"] ?? t;
    return { thumb: t?.url ?? "", large: big?.url ?? "", width: big?.width ?? 0, height: big?.height ?? 0 };
  }).filter((p) => p.thumb);
  const agentNo = (g.agent_whatsapp ?? "").replace(/\D/g, "") || SITE.whatsapp;
  const ask = `Hi${g.agent_name ? ` ${g.agent_name.split(" ")[0]}` : ""}, I'm looking at the photos of ${g.listing_no} (${heading}). Could you share more details?`;

  return (
    <section className="wrap section" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: "1 1 420px" }}>
          <span className="s-label">Ref {g.listing_no}</span>
          <h1 style={{ fontSize: "clamp(26px, 3.6vw, 38px)" }}>{heading}</h1>
          {specs.length > 0 && <p style={{ color: "var(--ink)", fontWeight: 500 }}>{specs.join(" · ")}</p>}
        </div>
        <a className="s-btn s-btn-wa" href={waLink(ask, agentNo)}>WhatsApp {g.agent_name ? g.agent_name.split(" ")[0] : "Axe Realty"}</a>
      </div>
      <Gallery photos={photos} title={heading} layout="grid" />
      <p style={{ fontSize: 14 }}>{photos.length} photo{photos.length === 1 ? "" : "s"} · Tap any photo to view full screen. Shared privately by {SITE.name}.</p>
    </section>
  );
}
