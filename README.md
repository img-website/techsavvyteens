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
| `book.html` | Booking. Step 1 date + time, step 2 location, then the cart drawer. `?service=senior\|community` |
| `blog.html` | News & media |
| `donate.html` | Donate + contact form |
| `privacy-policy.html` | Placeholder (see note below) |
| `terms-and-conditions.html` | Placeholder (see note below) |
| `404.html` | Not found. Uses root-relative asset paths so it survives a miss at any depth. |

## Brand system

Everything below comes from **Tech Savvy Teens Brand Guidelines 2026** (Kaulike Academy).
It is the source of truth. Where this build previously guessed — the palette was sampled
off a photo of a printed banner, and the logo was a repainted monochrome silhouette —
the guessing has been removed.

### Colour

| Role | Name | Hex |
|---|---|---|
| Primary | White | `#FFFFFF` |
| Primary | Forest Green | `#208339` |
| Primary | Deep Azure Blue | `#185FA5` |
| Secondary | Cerulean | `#01718D` |
| Secondary | Vivid Azure | `#2AC7FB` |
| Secondary | Malachite | `#3ACF5F` |

Mapped onto two ramps, each built at its brand colour's exact hue with the published hex
pinned to a named step so the real value appears literally on the page:

| Ramp | Brand colour | Pinned at | Used for |
|---|---|---|---|
| `--brand-*` | Deep Azure Blue, hue 210 | `700` | structure — hero bands, header, links, primary buttons |
| `--accent-*` | Forest Green, hue 135 | `600` | emphasis — highlighted words, "Free" badges, Support TST / Donate |

Blue leads because it is what the logomark is drawn in, what every band and header in the
brand deck is set in, and what the old site's chrome used. Green is the co-primary: it
sets "TECHSAVVY" in the mark and the section headings in the deck, so it carries emphasis
and conversion here. The three secondary colours are flat tokens (`text-cerulean`,
`bg-azure`, `text-malachite`), not ramps — use them sparingly, as accents.

> **One error in the source document.** The swatch labelled **"Vivid Green"** on the
> palette page carries `#A0522D`, which is a sienna brown — both the printed hex and the
> swatch fill. Every other swatch is self-consistent. It is almost certainly a
> placeholder the designer forgot to replace, so it is **not** implemented; Malachite
> `#3ACF5F` is used wherever a vivid green is called for. Worth confirming with the
> client before any print work goes out.

### Typography

| Face | Role | Weights |
|---|---|---|
| **Anton** | Headlines, all caps | 400 only |
| **Poppins** | H2 and body copy | 400, 700 |

`font-display` is Anton and is applied to `h1`/`h2` only. The class also forces
`font-weight: 400` and `text-transform: uppercase`, because Anton ships a single weight
and the book specifies all caps — a synthesised bold smears the letterforms. Everything
else (h3 and below, eyebrows, buttons, badges, body) is Poppins and needs no class at all.

Both faces are self-hosted from `assets/fonts` in `latin` **and** `latin-ext` subsets.
Both subsets are required: `latin` carries the ʻokina (U+02BB), `latin-ext` carries the
macrons (ā ē ī ō ū). Drop either and "kūpuna" or "Hawaiʻi" breaks.

### Logo

Three approved lockups, extracted from the brand deck and shipped in
`assets/images/logos`: `tst-logo-primary` (stacked), `tst-logo-horizontal` (the secondary
lockup — this is what the header and footer use, because a stacked mark at 44px makes the
wordmark unreadable), and `tst-logomark` (mark only). Each has `-white` and `-black`
variants generated from the same alpha.

The usage rules from the book are **required**, not advisory:

- Full colour on **white backgrounds only**
- White logo on **any coloured or dark background**
- Black logo on white or light backgrounds when a neutral or formal look is needed
- Never rotate, flip, or add effects

`tst-logo-dark.png` / `tst-logo-light.png` keep their old filenames (full colour for the
light theme, white for dark) so the header markup did not have to change everywhere.

### Pattern

`.brand-zigzag` / `.brand-zigzag-bottom` draw the torn navy edge that tops and tails every
page of the deck. Used on the booking-page hero bands.

### Voice

Confident · Approachable · Warm · No tech jargon · Practical · Community-Rooted · Youthful
· Exciting. Tone for the **website** is **Clear & Grounded** — that is the setting to write
in here; the lighter, more youthful register belongs on social.

Rules worth keeping if you extend the site:

- **No gradient-filled text.** Headings are solid. Gradient text was tried, was unreadable, and was removed.
- **Page heroes are an always-dark `bg-brand-950` band.** That is what gives the pages depth. Inside a hero, never use the semantic tokens (`text-ink`, `bg-surface`, `border-line`) or a `dark:` variant — they flip with the theme and vanish against the fixed dark band. Use explicit `text-white` / `text-brand-100` / `bg-white`.
- **`bg-accent-600` under white text is 4.9:1** — fine for buttons and large text. For body-size green text on white use `text-accent-700` (6.5:1).
- Depth comes from the tinted shadow tokens (`shadow-card`, `shadow-lift`, `shadow-hero`, `shadow-glow`), not from Tailwind's neutral greys — a grey shadow on a blue-tinted surface reads as dirt.

## Changing the theme colour

Everything visual is driven from **one block** in `src/tailwind.css`, under `THEME COLOR CONTROL`. To re-skin the whole site, change the ramp and run `npm run build` — nothing else needs touching.

```css
:root {
  --brand-700: #185fa5;   /* Deep Azure Blue — change this ... */
  --accent-600: #208339;  /* Forest Green — ... and this, and everything follows */
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

- **Light is the default for every visitor, regardless of their OS setting.** Dark applies via a `.dark` class on `<html>` and is opt-in only.
- An inline script in each `<head>` sets the class before first paint (no flash). It reads `localStorage.tst-theme` and applies dark **only** when that value is exactly `"dark"` — it does not consult `prefers-color-scheme`.
- The header toggle writes the choice and it is remembered from then on. There is deliberately **no OS-change listener**: following the OS would flip a visitor into dark without them asking for it.
- Each page ships a single `<meta name="theme-color" content="#ffffff">`. `site.js` rewrites it to `#08182a` when dark is on, so the browser chrome tracks the real theme. The old media-keyed pair (`prefers-color-scheme: light`/`dark`) was removed — on an OS in dark mode it painted the chrome navy over a light page.

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

## Booking

The flow now lives on this site instead of handing off to GoDaddy Online Appointments,
and it follows the live flow step for step. `assets/js/booking.js` drives all of it and
holds the catalogue.

```
for-kupuna.html#book  ->  book.html   step 1: date + time  ->  step 2: location  ->  BOOK
                                                                                       |
                          cart drawer: coupon · totals · your details  <----------------+
                                                    |
                                                    v
                          same drawer: Thank you, order ID, Add to Calendar
```

**The cart is a drawer, not a page** — same as live. It slides in from the right, holds
the booking, the coupon field, the totals, the details form and the confirmation, and the
header cart icon (`[data-cart-open]`) opens it from anywhere on the site. `booking.js`
injects it into every page, so no page markup carries it.

Both services are the live ones, with copy taken verbatim from the pages they replace:

| Service | Duration | Price | Staff | Add-on |
|---|---|---|---|---|
| One-to-One Tutoring (Senior Living Centers only) | 2 hrs | Free | Youssef Dakroub | — |
| One-to-One Tutoring (Community Centers & Churches only) | 2 hrs | Free | Youssef Dakroub | Add additional teen — $50.00 |

Only the community service has an add-on. That is not an omission — the live senior
service page has no add-on block either.

### Availability

The live calendar circles only the days the mentors are rostered for; every other future
day stays clickable and answers *"Please choose a highlighted date to see available times.
There are no available times on this day."* That behaviour is reproduced exactly, and the
open days come from rules rather than a feed:

- `OPEN_DAYS` — Friday, Saturday, Sunday, Monday (the roster is weekend-shaped; mentors
  are students)
- `LEAD_DAYS` — 10 days' notice
- `HORIZON_MONTHS` — 6 months out
- `SLOTS` — 10:00 AM and 11:00 AM, under a "Morning" heading, labelled `(GMT-10:00) Hawaii`

Hawaii does not observe DST, so `TZ_OFFSET` is a fixed −10 and the Add to Calendar links
convert to UTC from that directly.

### Two honest departures

Both are stated in the UI rather than papered over:

- **Availability is generated, not fetched.** What the visitor submits is a booking
  **request**; a coordinator confirms within 3 business days.
- **No payment is taken anywhere.** Sessions are free and the one add-on is invoiced by
  Kaulike Academy afterwards, so "Due now" is always `$0.00`. There are no card fields on
  this site, because a static page has nothing that could safely accept them. The coupon
  field is present because the live cart has one; it accepts input and explains that codes
  only apply to add-ons.

Confirm Booking hands the formatted request to the mail client via a generated `mailto:`
anchor — the same mechanism the contact form on `donate.html` uses. It is clicked from a
detached anchor rather than assigned to `location.href` so the page does not unload and
the thank-you panel can still render.

### Notes

- Cart state is `localStorage.tst-cart`; the badge is painted by `paintBadge()`.
- **Which service is being booked survives a stripped query string.** `resolveService()`
  reads `?service=`, then `#hash`, then `sessionStorage.tst-service` — written by a
  delegated click handler on the service cards. Hosts that serve clean URLs (the `serve`
  dev server included) redirect `book.html?service=community` to `/book` and drop the
  query, which would otherwise silently fall back to the senior service.
- **If a real backend arrives**, replace `isBookable()` (availability), the `SERVICES`
  constant (catalogue) and `confirmBooking()` (submission). No markup changes.

> The old OLA URLs (`/for-kupuna/ola/services/…`) still exist on the live GoDaddy site and
> were the source for this copy. Nothing in this build depends on them any more. The old
> `/ols/…` store URLs are still in Google's index but now redirect to the homepage — that
> storefront is retired, so it was not rebuilt.

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
