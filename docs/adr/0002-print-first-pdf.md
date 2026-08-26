# ADR-0002: Print-optimized HTML before server-side PDF

- Status: accepted
- Date: 2026-08-12

## Context

The shareable report is a core feature, not an export convenience. It has to look
credible in front of an IT lead, a department head, a procurement officer or a
mayor. That argues for a real PDF.

Two ways to get one:

- **Print-optimized HTML** plus the browser's "Save as PDF".
- **Server-side rendering** with headless Chromium (Playwright/Puppeteer).

## Decision

v0.1.0 ships a print-optimized HTML route (`/report/[id]/print`) with proper print
CSS. Server-side PDF generation waits until v0.3.0.

## Rationale

1. **Self-hosting weight.** Headless Chromium roughly triples the container image
   and adds a fragile runtime dependency. lokal targets organizations that will run
   it on a small VM; a heavy image works against the product's own argument.
2. **Fonts.** Server-side rendering requires embedding and licensing fonts
   properly. The browser path uses fonts already resolved on the user's machine.

   Phase 5.5 changed this in lokal's favour rather than against it. The site now
   self-hosts two OFL-1.1 families (`src/app/fonts/`), which browsers embed when
   printing to PDF — so print fidelity no longer depends on what happens to be
   installed on the reader's machine, and the licensing question a server-side
   renderer would raise is already answered.

3. **The work is not throwaway.** Server-side rendering needs the same print CSS.
   Doing print CSS well now is a prerequisite for v0.3.0 either way.
4. **Scope.** It removes a job runner, a queue and a file-storage decision from the
   MVP.
5. **The quality gap is small** when print CSS is done carefully — page breaks,
   running headers, ink-safe token values, `break-inside: avoid` on cards.

## The constraint that keeps v0.3.0 cheap

**The print route must render fully server-side, with zero client components in its
content tree.** Report content already comes from a typed `PlanningReport`
document, so adding server-side PDF later is: install Playwright, add a render
endpoint pointed at the existing print route, embed fonts, ship an optional Docker
variant.

This constraint costs nothing today and is recorded in `CLAUDE.md` as a standing
rule. Breaking it — by reaching for a client-side chart, a hook or an interactive
widget inside the print tree — turns a bolt-on into a rewrite.

## Consequences

**Good.** No heavy dependency in the MVP. A polished artifact ships in v0.1.0. The
upgrade path is short and known.

**Costs.** Users must take one manual step (browser print dialog → save as PDF),
and output fidelity depends somewhat on the browser. Chromium and Firefox are the
verified targets; the README states the recommended path.

**Related.** No charting library, for the same reason: canvas-rendered charts do
not print reliably. Indicators are CSS-only.
