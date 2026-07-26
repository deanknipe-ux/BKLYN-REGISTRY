// Aggregating proxy: runs every enabled provider adapter, merges their results
// into one normalized feed, and dedupes by address. Keys stay server-side.
//
// To add a source: create api/_providers/<name>.js from _template.js, then
// import it and add it to PROVIDERS below.

import rentcast from "./_providers/rentcast.js";
// import someother from "./_providers/someother.js";  // <- add more here

const PROVIDERS = [
  rentcast,
  // someother,
];

export default async function handler(req, res) {
  const q = req.query || {};
  const enabled = PROVIDERS.filter(p => {
    try { return p.isEnabled(); } catch { return false; }
  });

  if (!enabled.length) {
    return res.status(500).json({
      error: "No data providers are configured.",
      hint: "Set at least one provider key (e.g. RENTCAST_API_KEY) in your environment variables.",
    });
  }

  // Query all enabled providers at once; one slow/broken source can't sink the rest.
  const settled = await Promise.allSettled(enabled.map(p => p.fetchListings(q)));

  const sources = {};
  const errors = [];
  let all = [];
  settled.forEach((result, i) => {
    const name = enabled[i].name;
    if (result.status === "fulfilled") {
      const rows = Array.isArray(result.value) ? result.value : [];
      sources[name] = rows.length;
      all = all.concat(rows);
    } else {
      sources[name] = 0;
      errors.push({ provider: name, error: String(result.reason?.message || result.reason) });
    }
  });

  const listings = dedupe(all);

  // If every provider failed, surface that as an error rather than an empty page.
  if (!listings.length && errors.length === enabled.length) {
    return res.status(502).json({
      error: "All providers failed.",
      hint: errors.map(e => `${e.provider}: ${e.error}`).join(" · "),
      sources, errors, listings: [],
    });
  }

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({ count: listings.length, sources, errors, listings });
}

// Merge duplicate listings that appear in more than one source. Two records are
// "the same" if their zip + street address match after normalization. When they
// collide we keep the richest record and fill any gaps from the other, and we
// remember every source the listing appeared in.
function dedupe(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${(r.zip || "").trim()}|${normAddr(r.address || r.formattedAddress)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...r, sources: [r.source].filter(Boolean) });
      continue;
    }
    // Fill missing fields, prefer whichever has a photo/url, track sources.
    for (const f of ["sqft", "year", "beds", "baths", "agent", "office", "photo", "url", "daysOnMarket", "lat", "lon"]) {
      if ((existing[f] == null || existing[f] === "") && r[f] != null) existing[f] = r[f];
    }
    if (r.source && !existing.sources.includes(r.source)) existing.sources.push(r.source);
  }
  return [...map.values()];
}

function normAddr(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[.,#]/g, "")
    .replace(/\b(apt|unit|ste|suite|fl|floor)\b.*$/i, "") // drop unit specifics
    .replace(/\s+/g, " ")
    .trim();
}
