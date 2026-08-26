import { Fragment } from "react";

/**
 * A terminal block.
 *
 * Commands are shown on a dark surface rather than in a light code box because
 * the `>` in the wordmark and the `>` at a shell prompt are the same mark —
 * using one everywhere is what makes the identity read as deliberate rather
 * than decorative.
 *
 * Server component, no client state. That is deliberate: a copy-to-clipboard
 * button would need a hook, and the shell's primitives stay server-only so
 * nothing in this layer can drift into the print route's tree (ADR-0002).
 * Selecting the text works, which is what the button would have automated.
 *
 * `data-terminal` is what print.css keys off to swap the dark surface for the
 * ink-safe palette — a full-bleed black rectangle wastes toner and makes a
 * filed document look like a misprint.
 */
export function Terminal({
  label,
  lines,
  className = "",
}: {
  label: string;
  lines: string[];
  className?: string;
}) {
  return (
    <div
      data-terminal
      className={`bg-terminal shadow-raised overflow-hidden rounded-xl ${className}`}
    >
      <div className="border-terminal-raised flex items-center gap-2 border-b px-4 py-2.5">
        <span className="text-terminal-muted font-mono text-xs tracking-wide">
          {label}
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-sm leading-relaxed">
        <code className="text-terminal-ink font-mono">
          {/* A real newline between lines, not just `display: block`. Inside a
              <pre> the newline is preserved, so the commands stay one per line
              even if the stylesheet never arrives — and a copied selection
              carries the breaks with it. */}
          {lines.map((line, index) => (
            <Fragment key={line}>
              {index > 0 ? "\n" : null}
              <span className="terminal-line">{line}</span>
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
}
