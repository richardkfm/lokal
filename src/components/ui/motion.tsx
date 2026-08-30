import type { ReactNode } from "react";

/**
 * Motion primitives.
 *
 * Server components with no state and no effects, because the shell they belong
 * to is shared with the print route and that tree has to stay free of client
 * components (ADR-0002). Everything animated here is CSS; these components only
 * emit the markup and the custom properties the stylesheet reads.
 *
 * See the "Motion" block in `globals.css` for the four guards each effect
 * carries and why a paused frame has to be the readable one.
 */

/**
 * A connector between steps, with a dot travelling it.
 *
 * The rail draws its own static line, so the connection is visible with no
 * animation at all. The dot is an accent and never carries meaning — nothing in
 * the page depends on a reader seeing it move.
 *
 * `className` is required and must size the long axis — `w-10` here, `h-full`
 * for a vertical rail. The stylesheet sets only the 1px axis, because it is
 * unlayered and would otherwise beat the utility that was meant to size it. A
 * rail with no length still animates and still passes every check; it simply
 * paints nothing. Requiring the prop is the cheapest place to make that a
 * decision rather than an omission.
 */
export function PathRail({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  className: string;
}) {
  const horizontal = orientation === "horizontal";

  return (
    <div
      aria-hidden="true"
      className={[
        "path-rail",
        horizontal ? "path-rail-h" : "path-rail-v",
        className,
      ].join(" ")}
    >
      <span className="path-dot" />
    </div>
  );
}

/**
 * A word that cycles through alternatives inside a heading.
 *
 * `words` is decorative: the group is `aria-hidden` and `spoken` carries the
 * phrase a screen reader actually gets, so the accessible name stays one stable
 * string. Without that, the heading would rename itself every few seconds.
 *
 * The lead word is `words[0]`, and it is what shows with no animation running —
 * in print, under reduced motion, and in any tool that samples a fixed frame.
 * Pick it accordingly: it should be the one that makes the sentence read best.
 */
export function WordCycle({
  words,
  spoken,
  className = "",
  seconds,
}: {
  words: readonly string[];
  spoken: string;
  className?: string;
  seconds?: number;
}) {
  const duration = seconds ?? words.length * 3;

  return (
    <>
      <span className="sr-only">{spoken}</span>
      <span
        aria-hidden="true"
        className={`word-cycle ${className}`}
        style={
          {
            "--word-count": words.length,
            "--cycle-duration": `${duration}s`,
          } as React.CSSProperties
        }
      >
        {words.map((word, index) => (
          <span key={word} style={{ "--i": index } as React.CSSProperties}>
            {word}
          </span>
        ))}
      </span>
    </>
  );
}

/**
 * Text set on a circle, turning slowly.
 *
 * The one piece of ornament on the page. It earns its place by being made of
 * words the product actually stands behind rather than of decoration — and it
 * is `aria-hidden`, because circular text read aloud starts mid-phrase.
 *
 * `id` is explicit rather than generated: `useId` is a hook, and this component
 * has to stay renderable inside the print tree.
 */
export function SpinSeal({
  id,
  text,
  children,
  className = "",
}: {
  id: string;
  text: string;
  children?: ReactNode;
  className?: string;
}) {
  // A trailing separator so the phrase meets its own start around the circle.
  //
  // One pass, not two. The path is a 46-unit radius, so roughly 289 units of
  // circumference at this size — a second repeat runs past the start and
  // overlaps the first, which is what shipped in the first draft of this
  // component. A short phrase leaves a gap; a long one is the caller's problem
  // and these strings are ours.
  const ring = `${text} · `;

  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <defs>
          <path id={id} d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
        </defs>
        <g className="spin-seal">
          <text
            fill="currentColor"
            style={{ fontSize: "10.5px", letterSpacing: "0.18em" }}
          >
            <textPath href={`#${id}`}>{ring}</textPath>
          </text>
        </g>
      </svg>
      {children ? (
        <span className="absolute inset-0 flex items-center justify-center">
          {children}
        </span>
      ) : null}
    </span>
  );
}
