// TEMPLATE — copy this file to add a new listings provider.
//
// How to add a real source (e.g. another licensed rentals API you have a key for):
//   1. Copy this file to  api/_providers/yourprovider.js
//   2. Fill in the real endpoint, auth header, and field mapping from THAT
//      provider's official docs (do not guess — verify each field).
//   3. Add one line to api/rentals.js:  import yourprovider from "./_providers/yourprovider.js";
//      and put it in the PROVIDERS array.
//   4. Add its key to Vercel env vars and .env.example.
//
// The aggregator calls isEnabled() first and skips the provider if it returns
// false, so an unconfigured provider never runs and never errors.
//
// This template is intentionally disabled (isEnabled returns false) and will
// never execute until you implement it and point it at a real endpoint.

export default {
  name: "Template (disabled)",

  isEnabled: () => false, // becomes: () => !!process.env.YOURPROVIDER_API_KEY

  async fetchListings(/* q */) {
    throw new Error("Template provider is not implemented.");
    // Real implementation pattern:
    //
    // const key = process.env.YOURPROVIDER_API_KEY;
    // const r = await fetch("https://REAL_ENDPOINT_FROM_THEIR_DOCS?...", {
    //   headers: { /* real auth header from their docs */ },
    // });
    // if (!r.ok) throw new Error(`YourProvider HTTP ${r.status}`);
    // const data = await r.json();
    // return data.map(normalize);
  },
};

// Map THEIR fields into the shared shape the UI expects. Keep the keys identical
// to the RentCast adapter so merged results stay consistent.
// function normalize(p) {
//   return {
//     id, address, formattedAddress, city, zip, price, beds, baths, sqft, year,
//     listDate, daysOnMarket, agent, office, lat, lon, photo, url,
//     source: "YourProvider",
//   };
// }
