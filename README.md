# 8 West Bio Peptide Dosing Calculator

Static React/Vite web app for `https://calc.8westbio.com`.

The calculator converts vial size, reconstitution volume, desired research amount, and syringe type into concentration, draw volume, syringe markings, approximate full draws per vial, and remainder. It is designed as a branded 8 West Bio research-use planning tool.

## Research-Use Scope

This tool is provided for laboratory research planning only.

- Not for human or veterinary use.
- Not for diagnostic or therapeutic procedures.
- Outputs are estimates and should be independently verified before any laboratory workflow.

## Features

- Vial amount and reconstitution volume inputs.
- Desired amount input with `mcg` and `mg` unit modes.
- U-100 insulin syringe unit conversion.
- 1 mL, 0.5 mL, 0.3 mL, and 3 mL syringe capacity support.
- Warnings when draw volume exceeds selected syringe capacity.
- Warnings for volumes below readable syringe increments.
- Formula and audit trail shown on the page.
- Copyable result summary for research notes.
- Local saved setup presets stored in the browser.
- Mobile-friendly responsive layout.

## Requirements

- Node.js 24 or newer
- npm 11 or newer

## Local Setup

```powershell
npm install
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173/`.

## Production Build

```powershell
npm run build
npm run preview
```

The deployable static files are generated in `dist/`.

## Deployment Notes

This app does not require a VPS for the first release. It can be hosted as static files through Cloudflare Pages, Netlify, Vercel, GitHub Pages, or an Nginx static site.

Recommended production settings:

- Build command: `npm run build`
- Output directory: `dist`
- Domain: `calc.8westbio.com`
- Enforce HTTPS
- Add a redirect from `http://calc.8westbio.com` to HTTPS

HTML is served with `no-store` during the analytics migration so a new content-hashed bundle can
replace the previous bundle safely. Missing `/assets/*` requests return 404 instead of the SPA shell.

## Analytics and Privacy

The calculator uses the existing 8 West Bio GA4 web stream (`G-2L4W1CJC8D`) so storefront and
calculator activity remain in one property. Google Analytics is optional and does not load until a
visitor explicitly allows it. Advertising storage, Google Signals, and ad personalization stay off.

The custom calculator layer records only five coarse interactions: first calculator use, applying a
preset, saving a preset, copying results, and changing the color theme. GA4 can also emit its standard
session and device events. Dosage inputs, syringe selections, calculated results, copied text,
saved-preset contents, query strings, and URL hashes are not sent.

Real `robots.txt` and `sitemap.xml` files are included for the calculator host.

## Formula

```text
Concentration (mg/mL) = peptide amount (mg) / water added (mL)
Desired amount (mg) = desired amount (mcg) / 1000
Draw volume (mL) = desired amount (mg) / concentration (mg/mL)
U-100 syringe units = draw volume (mL) x 100
Approx. full draws per vial = floor(peptide amount (mg) / desired amount (mg))
```

## Available Scripts

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```
