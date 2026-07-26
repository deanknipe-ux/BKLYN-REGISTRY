# The Brooklyn Register

An apartment-rental finder for Brooklyn. React + Vite front end, with a small
serverless function that pulls live listings from the **RentCast API** and keeps
your API key off the browser.

Live data: `GET https://api.rentcast.io/v1/listings/rental/long-term`
(docs: https://developers.rentcast.io/reference/rental-listings-long-term).

---

## What's in here

```
brooklyn-register/
├── api/
│   ├── rentals.js        # aggregator: runs every provider, merges + dedupes
│   └── _providers/
│       ├── rentcast.js   # RentCast adapter (real, wired in)
│       └── _template.js  # copy this to add another source
├── src/
│   ├── App.jsx           # the app (UI + filtering + live/sample data)
│   └── main.jsx          # React entry
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
└── .gitignore
```

The app runs on a **curated sample set out of the box** and switches to **live
Brooklyn rentals** when you press "Load live listings" (which calls `/api/rentals`).
`/api/rentals` queries every configured provider in parallel, merges the results,
removes duplicates by address, and reports how many came from each source.

---

## 1. Put it on GitHub

```bash
cd brooklyn-register
git init
git add .
git commit -m "Brooklyn Register"
git branch -M main
git remote add origin https://github.com/<you>/brooklyn-register.git
git push -u origin main
```

## 2. Get a free RentCast API key

1. Go to **https://app.rentcast.io/app/api** and sign in (create an account if needed).
2. **Select Plan** → choose the **free plan** (50 API requests / month).
3. **Create API Key** and copy it.

RentCast keys are meant to stay secret — this project only ever uses the key
inside the server-side function, never in the browser.

### Quick test that your key works (before touching the app)

```bash
curl -s "https://api.rentcast.io/v1/listings/rental/long-term?city=Brooklyn&state=NY&status=Active&limit=3" \
  -H "Accept: application/json" \
  -H "X-Api-Key: YOUR_KEY" | head -c 800
```
- A JSON array starting with `[{"id":...,"price":...}]` → key + API are good.
- `{"error":...}` or HTTP 401 → key is wrong or the plan isn't activated.
- HTTP 429 → you've used your 50 monthly requests.

## 3. Deploy on Vercel (free)

1. https://vercel.com → **Add New → Project** → import your GitHub repo.
2. Framework preset: **Vite** (auto-detected).
3. **Settings → Environment Variables**, add:
   - **Name:** `RENTCAST_API_KEY`
   - **Value:** your key from step 2
4. **Deploy** → you get a URL like `brooklyn-register.vercel.app`.
5. On the live site, press **Load live listings**.

---

## Run locally

**UI only (sample data), no key needed:**
```bash
npm install
npm run dev          # http://localhost:5173
```
Plain `vite dev` does not run the `/api` function, so "Load live listings" will
report that clearly and keep showing the sample set. That's expected.

**With live data locally**, use the Vercel CLI so the function runs:
```bash
npm i -g vercel
cp .env.example .env   # put your real key in .env
vercel dev             # serves the app AND /api/rentals
```

---

## Why a serverless proxy?

1. **Key safety.** RentCast's docs explicitly say the key must never appear in
   front-end code. The proxy keeps `RENTCAST_API_KEY` on the server.
2. **One request, many listings.** RentCast's free plan is 50 requests/month,
   but each request returns up to 500 listings. The proxy fetches a broad
   Brooklyn set once (and caches it 5 min at the edge); price / beds /
   neighborhood filtering happens in the browser, so changing filters costs
   zero extra API calls.

`api/rentals.js` calls RentCast, normalizes each record, and returns
`{ count, listings }`.

---

## What's real vs. estimated

- **Real (from RentCast):** rent price, beds, baths, square footage, year built,
  address, days on market, listing office/agent.
- **Estimated (curated by this app):** the neighborhood "character index" and the
  per-card walk/transit numbers. They're comparison aids, not survey data — the
  app says so in a footnote.
- **Not available from RentCast:** listing photos and a public listing URL. Cards
  therefore show a facade illustration and a "Search address" action that opens a
  web search for the property.

---

## Adding more listing sources

The proxy is multi-source. Each provider is one file in `api/_providers/` that
exports `{ name, isEnabled(), fetchListings(query) }` and returns listings in the
shared shape. To add one:

1. Copy `api/_providers/_template.js` to `api/_providers/yourprovider.js`.
2. Fill in the real endpoint, auth, and field mapping **from that provider's own
   docs** — verify every field, don't guess.
3. In `api/rentals.js`, import it and add it to the `PROVIDERS` array.
4. Add its key to Vercel env vars (and `.env.example`).

Providers with no key set are skipped automatically, and one failing source never
breaks the others — the response's `sources` and `errors` fields show what each
one returned. A legitimate multi-source setup means using APIs/feeds that supply
their data (RentCast, other licensed rentals APIs, or MLS/IDX/RESO feeds you have
access to) — not scraping sites that don't offer it.

## Switching regions

In `api/rentals.js` the proxy defaults to `city=Brooklyn&state=NY`. Pass
`?zipCode=11211` (or `?city=...&state=...`) to `/api/rentals` to target a
different area, and update the ZIP→neighborhood map in `src/App.jsx` (`HOODS`).
