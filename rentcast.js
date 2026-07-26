// Provider adapter: RentCast (https://developers.rentcast.io)
// Verified endpoint: GET https://api.rentcast.io/v1/listings/rental/long-term
// Auth: header X-Api-Key. Free plan: 50 requests/month, up to 500 rows/request.
//
// Every adapter exports the same shape:
//   { name, isEnabled(), fetchListings(query) -> Promise<Listing[]> }
// A "Listing" is the normalized object defined at the bottom of this file.

const BASE = "https://api.rentcast.io/v1/listings/rental/long-term";

export default {
  name: "RentCast",

  // Enabled only when its key is present, so the aggregator can skip it cleanly.
  isEnabled: () => !!process.env.RENTCAST_API_KEY,

  async fetchListings(q = {}) {
    const key = process.env.RENTCAST_API_KEY;
    const params = new URLSearchParams();
    if (q.zipCode) params.set("zipCode", q.zipCode);
    else { params.set("city", q.city || "Brooklyn"); params.set("state", q.state || "NY"); }
    params.set("status", "Active");
    params.set("limit", Math.min(Number(q.limit) || 200, 500).toString());
    if (q.offset) params.set("offset", q.offset);

    const r = await fetch(`${BASE}?${params.toString()}`, {
      headers: { Accept: "application/json", "X-Api-Key": key },
    });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = null; }

    if (!r.ok) {
      const msg =
        r.status === 401 ? "invalid RentCast key or inactive plan" :
        r.status === 429 ? "RentCast monthly limit reached" :
        `RentCast HTTP ${r.status}`;
      throw new Error(msg);
    }
    const rows = Array.isArray(data) ? data : (data?.listings || data?.data || []);
    return rows.map(normalize).filter(l => l.price > 0);
  },
};

function normalize(p) {
  return {
    id: p.id || p.formattedAddress,
    address: p.addressLine1 || p.formattedAddress || "Address withheld",
    formattedAddress: p.formattedAddress || `${p.addressLine1 || ""}, ${p.city || "Brooklyn"} NY`,
    city: p.city || "Brooklyn",
    zip: p.zipCode || "",
    price: p.price || 0,
    beds: p.bedrooms ?? 0,
    baths: p.bathrooms ?? 1,
    sqft: p.squareFootage || null,
    year: p.yearBuilt || null,
    listDate: p.listedDate || null,
    daysOnMarket: typeof p.daysOnMarket === "number" ? Math.round(p.daysOnMarket) : null,
    agent: p.listingAgent?.name || null,
    office: p.listingOffice?.name || null,
    lat: p.latitude ?? null,
    lon: p.longitude ?? null,
    photo: null,
    url: null,
    source: "RentCast",
  };
}
