# FloorGuard — Standalone Cycle-Count Prototype (v1)

A mobile-first warehouse cycle-count web app for carpet-roll inventory.
Pure static site: no build step, no backend, no network dependencies.

## Run it

**On a computer (camera works here):**
```bash
cd floorguard-prototype
python3 -m http.server 8000
```
Then open http://localhost:8000 — `localhost` counts as a secure context,
so the camera barcode scanner will work.

**On an iPhone (camera needs HTTPS):**
Host the folder on any static host (Netlify Drop, GitHub Pages, Cloudflare
Pages, etc.) and open the HTTPS URL. Add to Home Screen for a full-screen
app feel (PWA manifest included).

> Opening `index.html` directly with `file://` works for tapping through,
> but the camera scanner will be unavailable — use the manual entry
> fallback (always available) or the DEMO scan chips.

## What's inside

- `index.html` — app shell, PWA meta tags
- `styles.css` — industrial dark-slate + safety-orange theme, glove-friendly
- `app.js` — hash-router SPA; the isolated `DB` object is the data layer
  (localStorage, key `floorguard_v1`). Swap `DB` for a real Real Floors API
  later without touching the UI.
- `manifest.webmanifest`, `icon.svg` — PWA install assets

## Flow

Home → START CYCLE COUNT → scan roll → scan location → duplicate check →
enter physical balance (ft/in or decimal ft) → confirm → SUBMIT → saved.
Statuses: MATCH / SHORT / OVER / LOCATION MISMATCH / NEEDS REVIEW.
Supervisor dashboard, roll search, per-roll history ledger, and append-only
audit trail included. "Reset demo data" lives in the dashboard footer.
