import React, { useState, useMemo, useEffect } from "react";
import {
  MapPin, Heart, SlidersHorizontal, Loader2, ArrowUpRight,
  TrendingDown, GitCompare, Check, Footprints, Train, Search,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Design tokens — warm plaster paper, deep slate ink, burnt ochre.
 * ------------------------------------------------------------------ */
const T = {
  paper: "#ECE8E1", surface: "#FBFAF6", ink: "#17242E", inkSoft: "#4A5560",
  stone: "#8C8578", line: "#DAD5CB", lineSoft: "#E7E3DB",
  ochre: "#C07A24", ochreDeep: "#9C5F16", sage: "#5F7355", brick: "#A2472B",
};

/* Neighborhood reference: character index (curated) + zip mapping +
 * walk/transit estimates (neighborhood-level, not per-unit). */
const HOODS = {
  Williamsburg:        { zips: ["11211", "11249"], walk: 94, transit: 98, creative: 95, quiet: 30, trend: "In demand" },
  Greenpoint:          { zips: ["11222"],          walk: 85, transit: 90, creative: 90, quiet: 58, trend: "In demand" },
  "Bed-Stuy":          { zips: ["11216", "11221", "11233", "11238"], walk: 84, transit: 86, creative: 92, quiet: 60, trend: "Rising" },
  "Park Slope":        { zips: ["11215", "11217"], walk: 92, transit: 92, creative: 72, quiet: 74, trend: "Steady" },
  DUMBO:               { zips: ["11201"],          walk: 89, transit: 88, creative: 86, quiet: 55, trend: "Premium" },
  "Fort Greene":       { zips: ["11205"],          walk: 90, transit: 91, creative: 82, quiet: 68, trend: "Steady" },
  "Prospect Heights":  { zips: ["11238"],          walk: 93, transit: 90, creative: 78, quiet: 70, trend: "Steady" },
  "Red Hook":          { zips: ["11231"],          walk: 78, transit: 62, creative: 84, quiet: 78, trend: "Under-radar" },
  "Crown Heights":     { zips: ["11213", "11225"], walk: 88, transit: 87, creative: 80, quiet: 64, trend: "Rising" },
};
const zipToHood = (zip) => {
  for (const [name, m] of Object.entries(HOODS)) if (m.zips.includes(zip)) return name;
  return "Brooklyn";
};

/* Curated sample set so the page reads as finished before live data loads. */
const SAMPLE = [
  { id: "s1", address: "184 Bedford Ave", zip: "11211", price: 2850, beds: 1, baths: 1, sqft: 720, year: 1921, listDate: null, posted: 2, photo: null },
  { id: "s2", address: "421 Jefferson Ave", zip: "11221", price: 2200, beds: 2, baths: 1, sqft: 1000, year: 1905, listDate: null, posted: 4, photo: null },
  { id: "s3", address: "77 Franklin St", zip: "11222", price: 2650, beds: 1, baths: 1, sqft: 860, year: 1945, listDate: null, posted: 1, photo: null },
  { id: "s4", address: "312 5th Ave", zip: "11215", price: 3200, beds: 2, baths: 2, sqft: 1120, year: 1890, listDate: null, posted: 3, photo: null },
  { id: "s5", address: "45 Water St", zip: "11201", price: 3500, beds: 1, baths: 1, sqft: 940, year: 2018, listDate: null, posted: 2, photo: null },
  { id: "s6", address: "128 S Oxford St", zip: "11205", price: 2950, beds: 2, baths: 1, sqft: 980, year: 1899, listDate: null, posted: 5, photo: null },
  { id: "s7", address: "560 Vanderbilt Ave", zip: "11238", price: 3050, beds: 1, baths: 1, sqft: 800, year: 2016, listDate: null, posted: 2, photo: null },
  { id: "s8", address: "90 Van Brunt St", zip: "11231", price: 2100, beds: 1, baths: 1, sqft: 780, year: 1930, listDate: null, posted: 6, photo: null },
];

/* Attach derived, display-only fields (neighborhood, walk/transit, seed). */
const enrich = (l) => {
  const neighborhood = zipToHood(l.zip);
  const meta = HOODS[neighborhood] || {};
  const hashSeed = String(l.id).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const posted = l.posted ?? l.daysOnMarket ?? daysSince(l.listDate);
  return {
    ...l, neighborhood,
    walk: meta.walk ?? 80, transit: meta.transit ?? 85,
    seed: (hashSeed % 6) + 2, posted,
    isNew: l.isNew ?? (posted != null && posted <= 7),
  };
};
const daysSince = (iso) => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return isNaN(d) ? null : Math.max(0, d);
};

/* Brownstone facade — visual signature / photo fallback. */
function Facade({ seed = 3, tone = T.ink }) {
  const floors = 3 + (seed % 2), bays = 2 + (seed % 2), stoop = seed % 3 !== 0;
  const cells = [];
  for (let f = 0; f < floors; f++)
    for (let b = 0; b < bays; b++)
      cells.push(<rect key={`${f}-${b}`} x={16 + b * (168 / bays)} y={22 + f * 30} width={168 / bays - 14} height={20} rx={2} fill="none" stroke={tone} strokeWidth="1.4" opacity="0.9" />);
  return (
    <svg viewBox="0 0 200 150" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <line x1="8" y1="14" x2="192" y2="14" stroke={tone} strokeWidth="2.4" />
      <line x1="8" y1="18" x2="192" y2="18" stroke={tone} strokeWidth="1" opacity="0.5" />
      <rect x="10" y="18" width="180" height="118" fill="none" stroke={tone} strokeWidth="1.6" />
      {cells}
      <rect x={stoop ? 150 : 88} y={floors * 30 - 6} width="26" height="34" rx="2" fill={tone} opacity="0.14" stroke={tone} strokeWidth="1.4" />
    </svg>
  );
}

function Meter({ label, value, color = T.ink }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ font: "500 10px/1 var(--mono)", letterSpacing: ".08em", color: T.stone, width: 58, textTransform: "uppercase" }}>{label}</span>
      <span style={{ flex: 1, height: 3, background: T.line, borderRadius: 2, overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${value}%`, background: color }} />
      </span>
      <span style={{ font: "500 10px/1 var(--mono)", color: T.inkSoft, width: 18, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function App() {
  const [raw, setRaw] = useState(SAMPLE);
  const [isSample, setIsSample] = useState(true);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState("");
  const [sourceInfo, setSourceInfo] = useState(null);

  const [priceMin, setPriceMin] = useState(1500);
  const [priceMax, setPriceMax] = useState(4000);
  const [beds, setBeds] = useState(0);
  const [hoods, setHoods] = useState([]);
  const [sortBy, setSortBy] = useState("match");
  const [saved, setSaved] = useState([]);
  const [compare, setCompare] = useState([]);
  const [showFilters, setShowFilters] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t); }, []);

  const listings = useMemo(() => raw.map(enrich), [raw]);

  const matchScore = (a) => {
    let s = 46;
    s += (HOODS[a.neighborhood]?.creative ?? 70) * 0.28;
    if (a.price >= priceMin && a.price <= priceMax) s += 18;
    if (beds === 0 || a.beds >= beds) s += 14;
    return Math.max(0, Math.min(100, Math.round(s)));
  };

  const results = useMemo(() => {
    let r = listings.filter(a =>
      a.price >= priceMin && a.price <= priceMax &&
      (beds === 0 || a.beds >= beds) &&
      (hoods.length === 0 || hoods.includes(a.neighborhood))
    );
    r.sort((a, b) =>
      sortBy === "price" ? a.price - b.price :
      sortBy === "newest" ? (a.posted ?? 99) - (b.posted ?? 99) :
      matchScore(b) - matchScore(a)
    );
    return r;
  }, [listings, priceMin, priceMax, beds, hoods, sortBy]);

  const stats = useMemo(() => {
    if (!results.length) return null;
    const p = results.map(a => a.price).sort((x, y) => x - y);
    return { median: p[Math.floor(p.length / 2)], min: p[0], max: p[p.length - 1] };
  }, [results]);

  const allHoods = useMemo(() => [...new Set(listings.map(a => a.neighborhood))].filter(h => HOODS[h]), [listings]);
  const toggle = (arr, set, id, cap) => set(arr.includes(id) ? arr.filter(x => x !== id) : (cap && arr.length >= cap ? arr : [...arr, id]));

  /* Live data via the serverless proxy (keeps the API key off the client). */
  const loadLive = async () => {
    setStatus("loading"); setErrorMsg("");
    try {
      // The proxy defaults to Brooklyn, NY and returns a broad active set;
      // price/beds/neighborhood are filtered client-side below.
      const res = await fetch(`/api/rentals?limit=200`);

      // If the /api function isn't running (e.g. plain `vite dev`), the dev
      // server returns HTML, not JSON. Catch that and say so plainly.
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("The /api/rentals function isn't running here. Live data needs a Vercel deploy, or `vercel dev` locally — plain `npm run dev` can't run it.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.hint || data.error || "Request failed.");
      if (!data.listings?.length) throw new Error(data.hint || "No live listings came back for these filters — try a wider range.");
      setRaw(data.listings); setSourceInfo(data.sources || null); setIsSample(false); setStatus("idle");
    } catch (e) {
      setErrorMsg(String(e.message || e)); setStatus("error");
    }
  };

  const pct = (v) => `${((v - 1000) / (6000 - 1000)) * 100}%`;

  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, fontFamily: "var(--sans)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        :root{ --sans:'Inter',system-ui,sans-serif; --display:'Fraunces',Georgia,serif; --mono:'IBM Plex Mono',ui-monospace,monospace; }
        *{ box-sizing:border-box; } button{ font-family:inherit; cursor:pointer; border:none; background:none; }
        input,select{ font-family:inherit; } ::selection{ background:${T.ochre}; color:${T.surface}; }
        .lift{ opacity:0; transform:translateY(14px); transition:opacity .5s ease, transform .5s cubic-bezier(.2,.7,.2,1); }
        .lift.in{ opacity:1; transform:none; }
        .card{ background:${T.surface}; border:1px solid ${T.lineSoft}; border-radius:4px; overflow:hidden;
                transition:transform .28s cubic-bezier(.2,.7,.2,1), box-shadow .28s, border-color .28s; }
        .card:hover{ transform:translateY(-3px); border-color:${T.ochre}; box-shadow:0 14px 34px -20px rgba(23,36,46,.5); }
        .facadewrap{ transition:transform .5s cubic-bezier(.2,.7,.2,1); }
        .card:hover .facadewrap{ transform:translateY(-2px) scale(1.015); }
        .iconbtn{ width:32px; height:32px; border-radius:999px; display:grid; place-items:center;
                  background:${T.surface}cc; border:1px solid ${T.lineSoft}; backdrop-filter:blur(4px);
                  transition:background .2s, border-color .2s, color .2s; color:${T.stone}; }
        .iconbtn:hover{ border-color:${T.ochre}; color:${T.ink}; }
        .chip{ padding:6px 12px; border-radius:999px; border:1px solid ${T.line}; background:transparent;
               font:500 12px var(--sans); color:${T.inkSoft}; transition:all .18s; }
        .chip:hover{ border-color:${T.ink}; color:${T.ink}; } .chip.on{ background:${T.ink}; border-color:${T.ink}; color:${T.surface}; }
        .seg{ padding:7px 0; flex:1; font:500 12px var(--sans); color:${T.inkSoft}; border-radius:3px; transition:all .18s; }
        .seg.on{ background:${T.ink}; color:${T.surface}; }
        .cta{ display:inline-flex; align-items:center; gap:6px; font:500 12.5px var(--sans); color:${T.ink}; transition:gap .2s, color .2s; }
        .cta:hover{ gap:11px; color:${T.ochreDeep}; }
        .rng{ -webkit-appearance:none; appearance:none; width:100%; height:20px; background:transparent; position:absolute; left:0; top:-9px; pointer-events:none; }
        .rng::-webkit-slider-thumb{ -webkit-appearance:none; pointer-events:auto; width:16px; height:16px; border-radius:999px; background:${T.surface}; border:2px solid ${T.ink}; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.2); }
        .rng::-moz-range-thumb{ pointer-events:auto; width:16px; height:16px; border-radius:999px; background:${T.surface}; border:2px solid ${T.ink}; cursor:pointer; }
        .link{ text-decoration:none; color:${T.ochreDeep}; border-bottom:1px solid ${T.ochre}55; }
        .link:hover{ border-color:${T.ochre}; }
        @keyframes spin{ to{ transform:rotate(360deg) } }
        @media (max-width:880px){ .cols{ grid-template-columns:1fr !important; } .sidebar{ position:static !important; } .grid2{ grid-template-columns:1fr !important; } }
        @media (prefers-reduced-motion:reduce){ .lift,.card,.facadewrap,.cta{ transition:none !important; } .lift{ opacity:1; transform:none; } }
      `}</style>

      {/* Masthead */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: `${T.paper}f2`, backdropFilter: "blur(8px)", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ width: 12, height: 12, background: T.ochre, display: "inline-block", transform: "translateY(1px)" }} />
            <span style={{ font: "600 20px/1 var(--display)", letterSpacing: "-.01em" }}>The Brooklyn Register</span>
            <span style={{ font: "500 10px/1 var(--mono)", letterSpacing: ".16em", color: T.stone, textTransform: "uppercase", marginLeft: 4 }}>Rental Index · Kings Co.</span>
          </div>
          <button onClick={loadLive} className="cta" disabled={status === "loading"}>
            {status === "loading" ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading…</>
              : isSample ? <>Load live listings <ArrowUpRight size={15} /></>
              : <>Live · connected <Check size={15} /></>}
          </button>
        </div>
      </header>

      {/* Hero / ledger */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 24px 34px" }}>
        <div style={{ maxWidth: 720 }}>
          <span style={{ font: "500 11px var(--mono)", letterSpacing: ".18em", color: T.ochreDeep, textTransform: "uppercase" }}>
            Brooklyn · rentals · {isSample ? "sample set" : "live data"}
          </span>
          <h1 style={{ font: "500 clamp(38px,6vw,66px)/0.98 var(--display)", letterSpacing: "-.02em", margin: "18px 0 0" }}>
            Find the block<br />you belong on.
          </h1>
          <p style={{ font: "400 16px/1.6 var(--sans)", color: T.inkSoft, maxWidth: 520, marginTop: 18 }}>
            Every listing scored against how you actually live — light, quiet, the walk to the train, the character of the street. Not just square footage.
          </p>
        </div>

        {stats && (
          <div style={{ marginTop: 40, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, display: "flex", flexWrap: "wrap" }}>
            {[["Median rent", `$${stats.median.toLocaleString()}`], ["Range", `$${stats.min.toLocaleString()}–${stats.max.toLocaleString()}`], ["Listings shown", String(results.length)], ["Neighborhoods", String(allHoods.length)]].map(([k, v], i) => (
              <div key={k} style={{ flex: "1 1 160px", padding: "18px 22px 18px 0", marginRight: 22, borderRight: i < 3 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ font: "500 10px var(--mono)", letterSpacing: ".14em", color: T.stone, textTransform: "uppercase" }}>{k}</div>
                <div style={{ font: "500 26px var(--mono)", color: T.ink, marginTop: 6 }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {isSample && status !== "error" && (
          <p style={{ font: "400 12px var(--sans)", color: T.stone, marginTop: 14 }}>
            Showing a curated sample. Press <button onClick={loadLive} className="link" style={{ background: "none", font: "inherit", cursor: "pointer" }}>Load live listings</button> to pull real Brooklyn rentals through the server.
          </p>
        )}
        {status === "error" && (
          <p style={{ font: "500 12.5px var(--sans)", color: T.brick, marginTop: 14 }}>
            {errorMsg} <span style={{ color: T.stone, fontWeight: 400 }}>· Still browsing the sample set.</span>
          </p>
        )}
        {!isSample && sourceInfo && (
          <p style={{ font: "500 11px var(--mono)", color: T.stone, marginTop: 14, letterSpacing: ".04em" }}>
            SOURCES ·{" "}
            {Object.entries(sourceInfo).map(([name, n], i) => (
              <span key={name}>{i > 0 ? "  ·  " : " "}{name} {n}</span>
            ))}
          </p>
        )}
      </section>

      {/* Body */}
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 80px" }}>
        <div className="cols" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 40, alignItems: "start" }}>

          {/* Filters */}
          <aside className="sidebar" style={{ position: "sticky", top: 84 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ font: "500 11px var(--mono)", letterSpacing: ".14em", color: T.stone, textTransform: "uppercase" }}>Refine</span>
              <button onClick={() => setShowFilters(s => !s)} className="iconbtn"><SlidersHorizontal size={15} /></button>
            </div>
            {showFilters && (
              <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
                <div>
                  <label style={lbl}>Monthly rent</label>
                  <div style={{ position: "relative", height: 4, background: T.line, borderRadius: 3, margin: "22px 0 10px" }}>
                    <div style={{ position: "absolute", height: "100%", left: pct(priceMin), right: `calc(100% - ${pct(priceMax)})`, background: T.ink, borderRadius: 3 }} />
                    <input className="rng" type="range" min="1000" max="6000" step="50" value={priceMin} onChange={e => setPriceMin(Math.min(+e.target.value, priceMax - 100))} />
                    <input className="rng" type="range" min="1000" max="6000" step="50" value={priceMax} onChange={e => setPriceMax(Math.max(+e.target.value, priceMin + 100))} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", font: "500 12px var(--mono)", color: T.inkSoft }}>
                    <span>${priceMin.toLocaleString()}</span><span>${priceMax.toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Bedrooms</label>
                  <div style={{ display: "flex", gap: 6, background: T.lineSoft, padding: 4, borderRadius: 5, marginTop: 10 }}>
                    {[0, 1, 2, 3].map(n => <button key={n} className={`seg ${beds === n ? "on" : ""}`} onClick={() => setBeds(n)}>{n === 0 ? "Any" : `${n}+`}</button>)}
                  </div>
                </div>
                <div>
                  <label style={lbl}>Neighborhood</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                    {allHoods.map(h => <button key={h} className={`chip ${hoods.includes(h) ? "on" : ""}`} onClick={() => toggle(hoods, setHoods, h)}>{h}</button>)}
                  </div>
                </div>
                <div>
                  <label style={lbl}>Sort by</label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: "100%", appearance: "none", padding: "10px 12px", borderRadius: 5, border: `1px solid ${T.line}`, background: T.surface, font: "500 13px var(--sans)", color: T.ink, marginTop: 10 }}>
                    <option value="match">Best fit for you</option>
                    <option value="price">Rent, low to high</option>
                    <option value="newest">Most recent</option>
                  </select>
                </div>
                {(hoods.length > 0 || beds > 0) && <button onClick={() => { setHoods([]); setBeds(0); }} style={{ font: "500 12px var(--sans)", color: T.stone, textAlign: "left" }}>Clear all ×</button>}
              </div>
            )}
          </aside>

          {/* Right column */}
          <div>
            {/* neighborhood strip */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ font: "500 22px var(--display)" }}>The neighborhoods</h2>
                <span style={{ font: "500 10px var(--mono)", letterSpacing: ".14em", color: T.stone, textTransform: "uppercase" }}>Character index</span>
              </div>
              <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory" }}>
                {allHoods.map((h, i) => {
                  const v = HOODS[h]; if (!v) return null;
                  const active = hoods.includes(h);
                  return (
                    <button key={h} onClick={() => toggle(hoods, setHoods, h)} className={`lift ${mounted ? "in" : ""}`}
                      style={{ transitionDelay: `${i * 45}ms`, scrollSnapAlign: "start", textAlign: "left", minWidth: 234, background: T.surface, border: `1px solid ${active ? T.ochre : T.lineSoft}`, borderRadius: 4, padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ font: "600 16px var(--display)" }}>{h}</span>
                        <span style={{ font: "500 9px var(--mono)", letterSpacing: ".1em", textTransform: "uppercase", color: v.trend === "In demand" || v.trend === "Premium" ? T.brick : T.sage, border: `1px solid ${T.line}`, padding: "3px 7px", borderRadius: 3 }}>{v.trend}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        <Meter label="Creative" value={v.creative} color={T.ochre} />
                        <Meter label="Quiet" value={v.quiet} color={T.sage} />
                        <Meter label="Transit" value={v.transit} color={T.ink} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ font: "500 22px var(--display)" }}>
                {results.length} {results.length === 1 ? "home" : "homes"}
                {hoods.length > 0 && <span style={{ color: T.stone, fontStyle: "italic" }}> · {hoods.join(", ")}</span>}
              </h2>
              {compare.length > 0 && <span style={{ font: "500 12px var(--mono)", color: T.ochreDeep, display: "inline-flex", alignItems: "center", gap: 6 }}><GitCompare size={13} /> Comparing {compare.length}</span>}
            </div>

            {results.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", border: `1px dashed ${T.line}`, borderRadius: 6 }}>
                <Search size={26} style={{ color: T.stone }} />
                <p style={{ font: "500 15px var(--sans)", color: T.inkSoft, marginTop: 14 }}>Nothing matches those filters yet.</p>
                <p style={{ font: "400 13px var(--sans)", color: T.stone, marginTop: 4 }}>Widen your rent range or clear a neighborhood.</p>
              </div>
            ) : (
              <div className="grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                {results.map((a, i) => {
                  const ms = matchScore(a);
                  const isSaved = saved.includes(a.id), inCompare = compare.includes(a.id);
                  const msColor = ms >= 78 ? T.sage : ms >= 60 ? T.ochre : T.stone;
                  return (
                    <article key={a.id} className={`card lift ${mounted ? "in" : ""}`} style={{ transitionDelay: `${120 + i * 55}ms` }}>
                      <div style={{ position: "relative", height: 150, background: a.photo ? T.ink : `linear-gradient(160deg, ${T.paper}, ${T.lineSoft})`, borderBottom: `1px solid ${T.lineSoft}` }}>
                        {a.photo ? (
                          <img src={a.photo} alt={a.address} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div className="facadewrap" style={{ position: "absolute", inset: "14px 20px 0", bottom: 0 }}><Facade seed={a.seed} tone={T.ink} /></div>
                        )}
                        <div style={{ position: "absolute", top: 12, left: 14, font: "500 9px var(--mono)", letterSpacing: ".14em", textTransform: "uppercase", color: T.inkSoft, background: `${T.surface}e8`, padding: "4px 8px", borderRadius: 3 }}>{a.neighborhood}</div>
                        <div style={{ position: "absolute", top: 10, right: 12, display: "flex", gap: 7 }}>
                          <button className="iconbtn" onClick={() => toggle(saved, setSaved, a.id)} style={{ color: isSaved ? T.brick : T.stone, borderColor: isSaved ? T.brick : T.lineSoft }}><Heart size={15} fill={isSaved ? T.brick : "none"} /></button>
                          <button className="iconbtn" onClick={() => toggle(compare, setCompare, a.id, 3)} style={{ color: inCompare ? T.ochreDeep : T.stone, borderColor: inCompare ? T.ochre : T.lineSoft }}>{inCompare ? <Check size={15} /> : <GitCompare size={15} />}</button>
                        </div>
                      </div>

                      <div style={{ padding: "16px 18px 18px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <div>
                            <h3 style={{ font: "600 18px/1.15 var(--display)" }}>{a.address}</h3>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, font: "400 12px var(--sans)", color: T.stone, marginTop: 3 }}>
                              <MapPin size={12} /> {a.city}, NY{a.year ? ` · built ${a.year}` : ""}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ font: "500 21px var(--mono)", letterSpacing: "-.02em" }}>${a.price.toLocaleString()}</div>
                            <div style={{ font: "500 9px var(--mono)", letterSpacing: ".1em", color: T.stone, textTransform: "uppercase" }}>per month</div>
                          </div>
                        </div>

                        <div style={{ display: "flex", border: `1px solid ${T.lineSoft}`, borderRadius: 4, marginTop: 14 }}>
                          {[["Beds", a.beds], ["Baths", a.baths], ["Sq ft", a.sqft ?? "—"]].map(([k, val], j) => (
                            <div key={k} style={{ flex: 1, padding: "9px 0", textAlign: "center", borderRight: j < 2 ? `1px solid ${T.lineSoft}` : "none" }}>
                              <div style={{ font: "500 15px var(--mono)", color: T.ink }}>{val}</div>
                              <div style={{ font: "500 9px var(--mono)", letterSpacing: ".1em", color: T.stone, textTransform: "uppercase", marginTop: 2 }}>{k}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", font: "500 9px var(--mono)", letterSpacing: ".1em", textTransform: "uppercase", color: T.stone, marginBottom: 5 }}>
                              <span>Fit for you</span><span style={{ color: msColor }}>{ms}%</span>
                            </div>
                            <div style={{ height: 4, background: T.line, borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${ms}%`, background: msColor, transition: "width .5s ease" }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 12, font: "500 11px var(--mono)", color: T.inkSoft }} title="Neighborhood-level estimate">
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Footprints size={13} style={{ color: T.stone }} />{a.walk}</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Train size={13} style={{ color: T.stone }} />{a.transit}</span>
                          </div>
                        </div>

                        {(a.priceReduced || a.isNew) && (
                          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                            {a.priceReduced && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, font: "500 10px var(--mono)", color: T.sage, border: `1px solid ${T.lineSoft}`, padding: "3px 7px", borderRadius: 3 }}><TrendingDown size={11} /> Price reduced</span>}
                            {a.isNew && <span style={{ font: "500 10px var(--mono)", color: T.ochreDeep, border: `1px solid ${T.lineSoft}`, padding: "3px 7px", borderRadius: 3 }}>New listing</span>}
                          </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.lineSoft}`, gap: 10 }}>
                          <span style={{ font: "400 11px var(--sans)", color: T.stone, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.office ? a.office : a.posted != null ? `Listed ${a.posted}d ago` : (isSample ? "Sample listing" : "Recently listed")}
                          </span>
                          {isSample ? (
                            <span className="cta" style={{ color: T.stone }}>Sample</span>
                          ) : (
                            <button className="cta" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(`${a.formattedAddress || a.address + ", " + a.city} for rent`)}`, "_blank")}>
                              Search address <ArrowUpRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <p style={{ font: "400 11px var(--sans)", color: T.stone, marginTop: 26 }}>
              Walk/transit figures and the neighborhood character index are curated estimates, not per-unit survey data. Listing prices, beds, baths, and dates come from the RentCast API when live data is loaded. RentCast doesn't supply listing photos or a public listing link, so cards show a facade illustration and an address search.
            </p>
          </div>
        </div>
      </main>

      <footer style={{ background: T.ink, color: T.paper }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 24px", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ width: 12, height: 12, background: T.ochre, display: "inline-block" }} />
            <span style={{ font: "600 18px var(--display)" }}>The Brooklyn Register</span>
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            {[["Saved", saved.length], ["Comparing", compare.length], ["Listings", results.length]].map(([k, v]) => (
              <div key={k}>
                <div style={{ font: "500 22px var(--mono)", color: T.ochre }}>{v}</div>
                <div style={{ font: "500 9px var(--mono)", letterSpacing: ".14em", textTransform: "uppercase", color: `${T.paper}99`, marginTop: 3 }}>{k}</div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

const lbl = { font: "500 11px var(--mono)", letterSpacing: ".14em", color: "#8C8578", textTransform: "uppercase" };
