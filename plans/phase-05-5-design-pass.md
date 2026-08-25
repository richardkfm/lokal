# Phase 5.5 — Visual identity and landing page

Roadmap row: `5.5 | Visual identity, landing page, design tokens | Landing sells the
concept; axe clean; print chrome still hidden`.

## Why this phase exists

Everything through 5.4 is correct and none of it is persuasive. The engine, the
rulepack, the report and the wizard are tested and complete; what a first-time
visitor sees is a `max-w-3xl` column of flat text under the word "lokal" set in the
system UI font.

That is a product problem, not a cosmetic one. lokal's argument is that open,
self-hosted software is a credible choice for a Kommune or a mid-sized company.
A tool that makes that argument while looking unfinished has lost it before the
report is read. And because lokal is free and AGPL, there is no sales motion behind
it — the landing page _is_ the sales motion.

## Scope

1. Self-hosted fonts, and a `>lokal` wordmark built on them.
2. Design tokens: elevation, radii, focus ring, hero gradient, terminal surface.
3. App shell: sticky header with real navigation, a footer that makes the
   open-source case.
4. The landing page rebuilt as a nine-section narrative.
5. Docs travel with the code.

## Out of scope

- **The report and wizard layouts.** They inherit the tokens and nothing else.
  The report tree carries the ADR-0002 print constraint and the axe gate; changing
  its structure in the same phase as a visual overhaul would make a regression
  impossible to attribute.
- **Dark mode.** The single light palette is what keeps screen and paper
  consistent, and that reasoning is unchanged.
- **A sample-report gallery.** Still deferred. The landing page shows a labelled
  static excerpt instead, which costs no persistence and cannot go stale.

## Decisions

**Stripe's restraint, not Stripe's gloss.** The two separate cleanly. Generous
vertical rhythm, a tight type scale, hairline borders over heavy shadows and one
accent used sparingly are all available without adopting the marketing register
that CLAUDE.md rules out with "institutional, not promotional".

**Sell through proof, not adjectives.** This resolves the apparent tension between
"sells the concept" and "institutional". The most persuasive thing lokal can show
is what a plan actually looks like — a readiness band, phases, a "keep for now"
verdict, a ruled-out candidate with its reason. That is also the clearest possible
restatement of the rule that lokal is not an alternatives finder: the differences
are visible rather than asserted.

The excerpt is labelled `Beispielausschnitt` in visible copy. It is illustrative,
not engine output, and must never be mistakable for a generated plan.

**Self-hosted fonts, not Google Fonts.** `globals.css` committed this project to
offline and air-gapped builds. `next/font/google` fetches at build time and would
break that; `next/font/local` over two committed woff2 files keeps the guarantee
and still gets Next's preloading. Inter for UI, JetBrains Mono for the wordmark and
terminal boxes. 88 KB total. Provenance and licensing in `src/app/fonts/README.md`.

One assumption from the plan was wrong on contact: `latin-ext` is **not** required
for German. `äöüßÄÖÜ` all live in `U+0000-00FF`, inside the `latin` subset.
Shipping `latin-ext` as well would have doubled the payload for glyphs that appear
only in a user-typed foreign name, so it was dropped.

**Terminal boxes for commands.** The `>` in the wordmark and the `>` prompt in a
code block are the same mark; using one everywhere is what makes the identity read
as deliberate rather than decorative. The self-hosting section shows three real
commands, which is the most credible claim on the page — "you can run this
yourself" demonstrated instead of asserted. No copy-to-clipboard button: that is
client state, and the shell's primitives stay server-only.

**A `data-site-chrome` attribute.** `print.css` hid the header with
`header[class*="border-b"]:has(nav)` — a selector coupled to a Tailwind class this
phase changes. It would have failed silently and printed site navigation onto a
report someone forwards to their management. Chrome now marks itself explicitly.

## Verification

- `pnpm check` and `pnpm build` green.
- `pnpm test:e2e` green, including the axe pass over all four surfaces.
- Print preview of `/report/[id]/print` shows no site chrome.
- Both locales driven at desktop and mobile widths. The goal is visual; green tests
  are necessary and not sufficient.

## Outcome

Recorded on completion.
