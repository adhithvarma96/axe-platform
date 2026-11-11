import { Suspense } from "react";
import Link from "next/link";
import { allListings, reviews, sitePage, sizes, team } from "@/lib/site/data";
import { staticMetadata } from "../static-page";
import { Banner, Copy, Crumbs, CtaBand } from "../place";
import { SiteHeader, Icon, ICON } from "../components";
import { Reviews, Stats, TeamCards } from "../sections";

export const generateMetadata = () => staticMetadata("/about-us/", "About Us");

// The three commitments from the live About page (kept word for word in the copy below).
const VALUES: { icon: keyof typeof ICON; title: string; text: string }[] = [
  { icon: "shield", title: "Transparency", text: "No hidden agendas. Just honest, data-driven guidance." },
  { icon: "handshake", title: "High-quality service", text: "From your first inquiry to closing day, we aim to exceed expectations." },
  { icon: "chart", title: "Smart use of technology", text: "We're constantly building tools and platforms that simplify property discovery, comparison, and decision-making." },
];

export default function Page() {
  return (
    <Suspense fallback={<><SiteHeader /><div style={{ minHeight: 600 }} /></>}>
      <About />
    </Suspense>
  );
}

async function About() {
  const [page, all, revs, people] = await Promise.all([sitePage("/about-us/"), allListings(), reviews(), team()]);
  const photo = sizes(page?.image)["1600"] ?? sizes(page?.image)["2048"] ?? all.map((l) => sizes(l.cover)["1600"]).find(Boolean);
  // The live page's body, minus the Vision list shown as cards below.
  const body = (page?.body ?? "").split("## Our Vision")[0];
  const rest = (page?.body ?? "").split("## Our Mission")[1];
  return (
    <>
      <SiteHeader />
      <Banner eyebrow="About Axe Realty" h1={page?.h1 || "About Axe Realty"} />
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "About Us" }]} />

      <section className="wrap section about-intro">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {page?.intro && <p className="lead" style={{ color: "var(--ink)", fontSize: 22, lineHeight: 1.45, fontFamily: "var(--font-heading), Josefin Sans, sans-serif" }}>{page.intro}</p>}
          <Copy text={body} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="s-btn" href="/properties/">Explore listings</Link>
            <Link className="s-btn s-btn-dark" href="/our-team/">Meet the team</Link>
          </div>
        </div>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="" className="about-photo" loading="lazy" />
        )}
      </section>

      <section className="section section-alt">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 760 }}>
            <span className="pill" style={{ alignSelf: "flex-start", background: "var(--red)" }}>Our vision</span>
            <h2 className="h2">To become Colombo&apos;s go-to apartment brokerage, and ultimately the city&apos;s most trusted real estate firm</h2>
            <p>We believe this is achievable through three core commitments:</p>
          </div>
          <div className="values">
            {VALUES.map((v) => (
              <div key={v.title} className="value">
                <span className="why-icon"><Icon d={ICON[v.icon]} size={22} /></span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
          <p style={{ maxWidth: 760 }}>As the Colombo property market grows more complex, we aim to simplify it, without ever dumbing it down.</p>
          <Stats />
        </div>
      </section>

      {rest && (
        <section className="wrap section" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className="h2">Our mission</h2>
          <Copy text={rest} />
        </section>
      )}

      {people.length > 0 && (
        <section className="section section-alt">
          <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
              <h2 className="h2">The people you&apos;ll work with</h2>
              <Link className="s-btn s-btn-dark" href="/our-team/">Meet the whole team</Link>
            </div>
            <TeamCards people={people.slice(0, 3)} compact />
          </div>
        </section>
      )}

      <Reviews items={revs} />
      <CtaBand title="Looking for an apartment in Colombo?" text="Tell us what you need and we'll send you options that match, usually the same day." />
    </>
  );
}
