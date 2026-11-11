// Home and About sections: Why choose Axe Realty (with real listing photography), Google reviews,
// the numbers band, and team cards. Shared so About and Our Team reuse them.
import Link from "next/link";
import type { WebReview, WebTeamMember } from "@/lib/site/data";
import { SITE } from "@/lib/site/listing";
import { Icon, ICON } from "./components";

export const WHY: { icon: keyof typeof ICON; title: string; text: string }[] = [
  { icon: "target", title: "100% focused on Colombo apartments", text: "No distractions: apartments in Colombo are all we do, so we know every building and what it really rents and sells for." },
  { icon: "map", title: "Neighbourhood knowledge", text: "From Colombo 02 to Rajagiriya, local insight that guides smarter decisions on where to live or invest." },
  { icon: "check", title: "Curated listings", text: "Real photos and accurate details across the top developments and locations, checked before they go live." },
  { icon: "handshake", title: "Personal support, start to finish", text: "One point of contact from the first viewing to handover, and still there after you move in." },
  { icon: "chart", title: "Transparent, data-backed advice", text: "Honest guidance on price, backed by what actually closes in the market, not wishful asking prices." },
];

export const STATS: [string, string][] = [["500+", "Happy customers"], ["100%", "Client satisfaction"], ["200+", "Properties island-wide"]];

export function WhyChoose({ photos }: { photos: string[] }) {
  const [a, b, c] = photos;
  return (
    <section className="section section-alt">
      <div className="wrap why">
        <div className="why-media" aria-hidden={!a}>
          {a && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="why-img why-img-a" src={a} alt="" loading="lazy" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b && <img className="why-img why-img-b" src={b} alt="" loading="lazy" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c && <img className="why-img why-img-c" src={c} alt="" loading="lazy" />}
              <div className="why-badge"><b>{STATS[0][0]}</b><span>{STATS[0][1].toLowerCase()} in Colombo</span></div>
            </>
          )}
        </div>
        <div className="why-copy">
          <span className="pill" style={{ alignSelf: "flex-start", background: "var(--red)" }}>We are special</span>
          <h2 className="h2">Why choose Axe Realty</h2>
          <p>We specialise exclusively in Colombo apartments, offering a refined portfolio of luxury, brand-new and investment-ready homes across the city&apos;s most sought-after developments.</p>
          <ul className="why-list">
            {WHY.map((w) => (
              <li key={w.title}>
                <span className="why-icon"><Icon d={ICON[w.icon]} size={20} /></span>
                <span><b>{w.title}</b><span>{w.text}</span></span>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="s-btn" href="/properties/">Explore listings</Link>
            <Link className="s-btn s-btn-dark" href="/about-us/">About us</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stars({ n = 5 }: { n?: number }) {
  return (
    <span className="stars" role="img" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => <svg key={i} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d={ICON.star} fill={i < n ? "#f5b400" : "#d9d6cf"} /></svg>)}
    </span>
  );
}

const GoogleG = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.8-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

export function Reviews({ items }: { items: WebReview[] }) {
  if (!items.length) return null;
  const avg = items.reduce((s, r) => s + (r.rating ?? 5), 0) / items.length;
  const ago = (d: string | null) => d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) : "";
  return (
    <section className="section">
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div className="reviews-head">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="pill" style={{ alignSelf: "flex-start" }}>Client reviews</span>
            <h2 className="h2">What our clients say</h2>
          </div>
          <div className="reviews-score">
            <GoogleG />
            <div>
              <b>{avg >= 4.8 ? "Excellent" : "Very good"} · {avg.toFixed(1)}</b>
              <Stars n={Math.round(avg)} />
            </div>
            <a href={SITE.googleReviews} target="_blank" rel="noopener">Read all on Google</a>
          </div>
        </div>
        <div className="reviews-row" role="list">
          {items.map((r) => (
            <figure key={`${r.reviewer_name}-${r.review_date}`} className="review" role="listitem">
              <div className="review-top">
                <span className="review-avatar" aria-hidden="true">{(r.reviewer_name ?? "?").trim()[0]}</span>
                <div style={{ minWidth: 0 }}>
                  <figcaption className="review-name">{r.reviewer_name}</figcaption>
                  <span className="review-date">{ago(r.review_date)}</span>
                </div>
                <span style={{ marginLeft: "auto" }}><GoogleG /></span>
              </div>
              <Stars n={r.rating ?? 5} />
              <blockquote className="review-body">{r.body}</blockquote>
            </figure>
          ))}
        </div>
        <Stats />
      </div>
    </section>
  );
}

export function Stats() {
  return (
    <div className="stats">
      {STATS.map(([n, l]) => <div key={l} className="stat"><b>{n}</b><span>{l}</span></div>)}
    </div>
  );
}

export function TeamCards({ people, compact = false }: { people: WebTeamMember[]; compact?: boolean }) {
  if (!people.length) return null;
  return (
    <div className={`team-grid${compact ? " team-grid-compact" : ""}`}>
      {people.map((p) => {
        const ph = (p.photo ?? null) as Record<string, { url: string }> | null;
        const img = ph?.["800"]?.url ?? ph?.["400"]?.url ?? ph?.full?.url ?? null;
        const wa = (p.whatsapp ?? "").replace(/\D/g, "");
        return (
          <article key={p.id ?? p.name} className="team-card">
            <div className="team-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img ? <img src={img} alt={p.name ?? ""} loading="lazy" /> : <span aria-hidden="true">{(p.name ?? "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>}
            </div>
            <div className="team-body">
              <h3>{p.name}</h3>
              {p.title && <span className="team-title">{p.title}</span>}
              {!compact && p.bio && <p>{p.bio}</p>}
              <div className="team-contact">
                {wa && <a className="s-btn s-btn-wa" href={`https://wa.me/${wa}`}>WhatsApp {p.name?.split(" ")[0]}</a>}
                {p.email && <a href={`mailto:${p.email}`} className="team-mail"><Icon d={ICON.mail} size={15} />{p.email}</a>}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
