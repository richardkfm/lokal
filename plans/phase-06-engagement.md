# Phase 6 — Engagement: motion, numbers, Euro-Office, expert contact

## Why this phase exists

Phase 5.5 gave lokal a visual identity and a landing page that sells the concept.
What it did not do — deliberately, and it says so — is touch the wizard or the
report. The result is a product whose front door is designed and whose two
working surfaces are a form and a document.

Three gaps close here.

**The plan is unquantified.** lokal knows a Kommune has 180 seats on Microsoft
365 and says "moderate savings outlook". That is not an argument anyone can take
into a budget meeting, and it left the most persuasive fact lokal possesses —
what the current subscriptions cost — unstated. See ADR-0003.

**Euro-Office did not exist when the rulepack was written.** It shipped 1.0 on
9 June 2026: an AGPL fork of the ONLYOFFICE codebase governed by a European
consortium including Nextcloud and IONOS. For a tool arguing for European
digital sovereignty to a German audience, omitting it is a content gap.

**There is no way to reach a human.** lokal produces a plan and then stops. The
organizations it targets frequently conclude, correctly, that they need help
executing it — and lokal's own capacity section is often what tells them so.

Plus motion and copy: the three surfaces are calm to the point of flat, and the
copy is long enough that the wizard reads as work before it reads as help.

## Scope

1. Rulepack `v2026-09`: Euro-Office, published list prices, migration edges.
2. Engine stage 7 extended with subscription exposure.
3. The report renders figures — money and counts — with their basis.
4. Motion: travelling path dots along step connectors, a rotating seal, a
   cycling hero word.
5. Shorter German and English copy across all three surfaces.
6. An operator-configured expert contact block.

## Out of scope

- **An admin UI for the contact data.** Contact comes from `LOKAL_EXPERT_*`
  environment variables. An in-browser editor needs auth, which the roadmap
  defers, and a settings table — a lot of machinery for six strings that change
  once a year. The operator already edits `.env` to set `DATABASE_URL`.
- **A contact form.** Storing enquiries means storing personal data, which for a
  tool aimed at public bodies is a GDPR duty, and sending mail means SMTP
  configuration. `mailto:` and `tel:` cost nothing and store nothing.
- **Net savings, ROI, payback.** Forbidden by ADR-0003, permanently.
- **Editing rulepack `v2026-08`.** Packs are immutable once released.
- **Dark mode**, still. Unchanged reasoning.

## Decisions

**Prices belong in the rulepack, not in the engine.** The rulepack is already
the place where lokal makes checkable claims about real products, with a source
and a review date on every one. A price is exactly that kind of claim, and it
inherits the whole apparatus — versioning, integrity validation, the draft
marker — for free. Putting prices in the engine would have created a second,
weaker vocabulary for the same thing.

**`observedOn` is separate from `lastReviewed`.** Prices go stale faster than
ratings do. A pack reviewed in September whose Microsoft prices were read in
August should say so, and the reader should see both dates rather than infer
one from the other.

**Straight rails, not `offset-path`.** Every connector in this product is a
straight line, and a dot travelling one needs only `transform: translate` inside
an `overflow: hidden` rail. That is compositor-only, needs no `@supports` guard,
and degrades to a plain line where it does not run. `offset-path` would have
bought a curve nobody asked for at the price of a fourth feature-detection
branch.

**The cycling hero word is `aria-hidden` over a visually-hidden canonical
phrase.** A headline whose accessible name changes every three seconds is a
screen-reader defect, not an animation.

## The four guards every animation carries

Phase 5.5 recorded two expensive misses on exactly this ground: an infinite
animation broke the axe helper, and `animation-timeline: view()` printed the
landing page nearly blank. Both were guard failures, not design failures.

1. `prefers-reduced-motion: reduce` — the global block zeroes durations but does
   **not** rescue a stacked-span group whose start state is `opacity: 0`. Each
   effect needs an explicitly legible resting state.
2. `@media print` — freeze to that same resting state. The roadmap dot puts this
   on the printed brief, where the `.reveal` bug already bit once.
3. The axe helper pauses infinite animations at `currentTime = 0`, and that frame
   is what axe measures for contrast.
4. `transform` and `opacity` only. No `filter: blur()`.

## Verification

- `pnpm check` and `pnpm build` green.
- `pnpm test:e2e` green, including the axe pass over all four surfaces.
- Print preview of `/report/[id]/print`: nothing frozen at opacity 0, every euro
  figure carries its basis, no site chrome.
- Reduced motion on, both locales, desktop and 390px.
- Contact block absent with no env set, present with it, and non-fatal when a
  variable is malformed.
- A stored `v2026-08` assessment still renders against `v2026-08`.
