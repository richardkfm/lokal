import { Link } from "@/i18n/navigation";

/**
 * The lokal wordmark: `>lokal`.
 *
 * The prompt glyph is the whole idea. lokal is a tool for people who run their
 * own infrastructure, and a shell prompt says that faster than any adjective on
 * the landing page can. The same mark opens every terminal block on the site
 * (src/components/ui/terminal.tsx), which is what makes it read as an identity
 * rather than as decoration.
 *
 * The `>` is aria-hidden on purpose. Without it every screen reader announces
 * "greater-than lokal" on every page of the site, and the e2e suite navigates by
 * accessible name — so the link's name stays exactly "lokal".
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-baseline font-mono tracking-tight ${className}`}
    >
      <span
        aria-hidden="true"
        className="text-brand group-hover:text-brand-strong font-medium transition-colors"
      >
        &gt;
      </span>
      <span className="text-ink font-semibold">lokal</span>
    </Link>
  );
}
