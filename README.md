# Tech Savvy Teens — website

Static HTML rebuild of [techsavvyteens.com](https://techsavvyteens.com/). Tailwind CSS v4, no CDN, no hand-written CSS.

## Getting started

```bash
npm install
npm run build     # one-off CSS build
npm run dev       # rebuild on change
npm run serve     # static server on http://localhost:4321
```

`assets/css/tailwind.css` is generated. **Never edit it by hand** — edit `src/tailwind.css` and rebuild.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home |
| `about.html` | Ka Piko — the origin, co-founder, what teens do/teach, award, press |
| `for-opio.html` | Recruitment: $50/session, 30 hrs → free certification, the crew |
| `for-kupuna.html` | What we help with, 2026 events, book a workshop, video, host-us CTA |
| `blog.html` | News & media |
| `donate.html` | Donate + contact form |
| `privacy-policy.html` | Placeholder (see note below) |
| `terms-and-conditions.html` | Placeholder (see note below) |
| `404.html` | Not found. Uses root-relative asset paths so it survives a miss at any depth. |

## Colour system

**The palette is the logo.** The Tech Savvy Teens mark is two-tone: a **green** figure and main arch (and the "TECHSAVVY" wordmark), plus a **blue** second figure and arch. Green leads, blue is secondary.

| Ramp | Share | Used for |
|---|---|---|
| `--brand-*` (logo green, hue ~116) | ~91% | everything — headings, icons, hero bands, links |
| `--accent-*` (logo blue, hue ~200) | ~9% | conversion CTAs (Support TST, Donate, Apply Now) + accents |

The hues were sampled off the roll-up banner in `IMG_7026` at full resolution — it's a photo of a printed banner under indoor light, so it reads washed out (`#71B26D` / `#63A2C0`); those values sit at the `400` step and the ramps are built around them at the same hues.

> **Note on the logo file.** The live site only ever shipped `WebStatsTSTLogo.png`, a **white monochrome** silhouette — there is no full-colour logo asset on it, which is why the colours had to come off a photo. `tst-logo-dark.png` is that silhouette repainted in the wordmark green (`#3c7d39`); `tst-logo-light.png` is the original white, for the dark theme. The favicon is drawn two-tone. If a proper full-colour vector turns up, drop it in and delete the repaint step.
>
> Do **not** take the palette from the old site's CSS — that stylesheet is all blue (`#185FA5`), which does not match the actual brand mark.

Rules worth keeping if you extend the site:

- **No gradient-filled text.** Headings are solid. Gradient text was tried, was unreadable, and was removed.
- **Page heroes are an always-dark `bg-brand-950` band.** That is what gives the pages depth. Inside a hero, never use the semantic tokens (`text-ink`, `bg-surface`, `border-line`) or a `dark:` variant — they flip with the theme and vanish against the fixed dark band. Use explicit `text-white` / `text-brand-100` / `bg-white`.
- **`text-brand-600` is not safe on white** (3.7:1). Use `text-brand-700` (6.0:1) or darker for anything under 24px.
- **`bg-accent-600` is not safe under white text** (4.2:1). CTAs use `bg-accent-700` (5.9:1).
- Depth comes from the tinted shadow tokens (`shadow-card`, `shadow-lift`, `shadow-hero`, `shadow-glow`), not from Tailwind's neutral greys — a grey shadow on a green-tinted surface reads as dirt.

## Changing the theme colour

Everything visual is driven from **one block** in `src/tailwind.css`, under `THEME COLOR CONTROL`. To re-skin the whole site, change the ramp and run `npm run build` — nothing else needs touching.

```css
:root {
  --brand-700: #185fa5;   /* change this ... */
  --brand-800: #184e85;   /* ... and every heading, button, band and link follows */
}
```

## Home page rhythm

Every home section has a deliberately different shape — the page used to be five card grids in a row, which read as monotonous. Keep it that way when you add to it:

| Section | Shape |
|---|---|
| Hero | dark `bg-brand-950` colour block + photo |
| Sponsors | scrolling logo marquee |
| Video | full-width embed |
| It's what we do | alternating full-width photo rows (text/photo, photo/text, text/photo) |
| Impact by the numbers | editorial — one huge number carries it, a ranked 1-2-3 list beside it |
| What teens teach | sticky heading + rule-separated list |
| This is what it looks like | photo gallery with a 2×2 feature tile |
| Get involved | gradient panels |

Semantic tokens (`bg-surface`, `text-ink`, `text-ink-muted`, `border-line`) flip automatically between light and dark, so pages never need `dark:` variants for ordinary colour work.

## How the theming/dark mode works

- Light is the default. Dark applies via a `.dark` class on `<html>`.
- An inline script in each `<head>` sets the class before first paint (no flash), reading `localStorage.tst-theme` and falling back to the OS preference.
- The site follows the OS until the visitor clicks the toggle; after that their choice wins.

## Conventions

- **Utility classes only.** No `<style>` blocks, no inline `style=`, no custom stylesheet. Custom variants, keyframes and tokens live in `src/tailwind.css` — that file is the config.
- **Scroll reveal** uses the `reveal:` variant, which compiles to `html.js .el:not([data-revealed])`. If JS is off or fails, nothing is hidden — content is visible to readers and crawlers by default.
- **Reduced motion** is honoured globally; the marquee additionally carries `motion-reduce:animate-none` so it can't freeze mid-scroll and hide logos.
- Images carry explicit `width`/`height` to avoid layout shift; below-the-fold images are `loading="lazy"`.

## Content decisions

- **Team portraits on `for-opio.html` are generated, not copied.** The source photos are all group shots — the old site turns them into individual portraits with a **`cr=` crop rectangle in the image URL**, e.g. Gigi and Leah are *the same file* (`IMG_7822`) cropped to two different people. Reading only the filename makes twelve cards look like nine duplicated group photos; the crop rect is the whole point. `assets/images/team/<name>.jpg` are those exact rectangles, baked in (crop to the rect → centre-crop square → 640px), so each card is a real portrait with real alt text. The rects are listed in the git history of this README and can be re-read from the live page's `data-srclazy` URLs.
- Only Jaffer, Vashti and Kanaloa have bios; that's the old site's data, not an omission.
- **`donate.html` uses the page's own two photos** (`IMG_0214`, `IMG_5182`, at their live crops), not a substitute from elsewhere in the library.
- **Venue spelling.** The old site says "Lanikeha" on For ʻŌpio and "Laniakeha" on For Kūpuna. [Lanikeha Community Center](https://www.molokaihfa.com/lanikeha-community-center) (2200 Farrington Ave, Hoʻolehua) is the real DHHL facility, so both pages now say Lanikeha.
- **Copy tweaks**, all deliberate: "Every dollar support a kupuna" → "supports"; "Thank You to Our Sponsors and Partners" → "Mahalo to our sponsors and partners"; headings moved to sentence case. Everything else is verbatim.
- **No cookie banner.** The old site had one because GoDaddy set analytics cookies. This build sets none — the only client storage is `localStorage.tst-theme` for the theme toggle, which is strictly necessary and needs no consent. If analytics are ever added, the banner has to come back.

## Booking (the OLA hand-off)

`for-kupuna.html#book` — "Book a Workshop in Your Community" — lists the two bookable
services and hands off to GoDaddy Online Appointments (OLA) for the actual booking:

| Service | URL |
|---|---|
| One-to-One Tutoring (Senior Living Centers only) | `techsavvyteens.com/for-kupuna/ola/services/in-person-tech-tutoring-4-hours-for-seniors` |
| One-to-One Tutoring (Community Centers & Churches only) | `techsavvyteens.com/for-kupuna/ola/services/one-to-one-tutoring-community-centers` |

Both are 2 hrs, free. They were recovered from **`sitemap.ola.xml`** on the live site —
worth knowing, because the booking section does **not exist in the live page's HTML**.
Like the calendar, the slot picker, the address form and the cart, it is injected at
runtime by GoDaddy's bundle. Fetching `/for-kupuna` and reading the markup shows nothing;
`/for-kupuna/ola`, `/for-kupuna/ola/services` and `/for-kupuna/ola/cart` all return 404 to
a plain request. That is why the section was missed on the first pass — the same trap as
the blog.

Two consequences:

- **The header's cart button is a link to `#book`, not a live cart.** A basket count is
  session state inside GoDaddy's booking engine; a static page has no way to read it. If
  you want a real cart, the booking flow has to move onto this site (or onto a booking
  provider with an API).
- **Those two URLs die the day the site leaves GoDaddy.** They are the only hard
  dependency on the old host anywhere in this build.

## Notes for whoever picks this up

- **If you script a contrast audit over this site, two things will lie to you.** A naive
  auditor reads `getComputedStyle(el).backgroundColor` and walks up until it finds an
  opaque one — but the date chips and CTA panels paint `bg-gradient-*`, whose
  `backgroundColor` is `rgba(0,0,0,0)`. The walker sails past them to the white card
  behind and reports white-on-white. Read `backgroundImage`, pull the colour stops, and
  score against the worst one. Second: toggling `.dark` and reading computed styles in the
  same task gives you dark text on light backgrounds and ~90 phantom failures — let a
  frame pass first. Both of these produced full-page false alarms here.
- **The legal pages are deliberately unwritten.** The live site shows "Privacy Policy coming soon" and an empty terms page, so both are honest placeholders here. No policy text was invented — that needs a human.
- **The contact form on `donate.html` posts via `mailto:`**, since this is a static site. Swap the `action` for a real handler when one exists.
- **The old site's blog was never live.** `sitemap.blog.xml` lists ten `/f/<slug>` posts, but every one of them serves the homepage (the URLs in that sitemap even have an empty host: `https:///f/...`). Nothing was recoverable, so `blog.html` was built from the real, verifiable press items instead of inventing articles.
- Impact figures (2,797 hrs / 3,370 kūpuna / 99 teens, as of June 2026) were read off the old site's stat graphics and are now live text + animated counters — editable in `index.html` rather than trapped in a PNG.

## Credits

Photography and logos: Tech Savvy Teens / Kaulike Academy.

**Type: Google Sans Flex**, self-hosted from `assets/fonts` (no Google Fonts request at runtime). Google released it under the SIL Open Font Licence 1.1 in November 2025, so it is free for commercial use — unlike Product Sans, which is still restricted.

Two things worth knowing if you touch the fonts:

- It's **Flex**, not plain "Google Sans", because the static family stops at weight 700 and the headings here run at 800. Flex is variable across `wght 1–1000` and carries an `opsz` axis, so one file serves both display and body.
- **`@font-face` urls are relative to the BUILT css** at `assets/css/tailwind.css`, not to `src/tailwind.css`. So the path is `../fonts/…`, not `../assets/fonts/…`. The latter looks right in the source file but resolves to `/assets/assets/fonts/` at runtime and 404s silently — the page just falls back to the system font with no error anywhere. If type ever looks "off" for no reason, check `document.fonts` first.
