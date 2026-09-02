import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { expertContact } from "@/lib/expert-contact";

/**
 * A named human to call about the plan.
 *
 * Server component with no client code, so it can appear inside the print tree
 * without breaking ADR-0002 — which is also where it is worth most, because the
 * printed brief is the copy that gets forwarded to people who were not in the
 * room when the plan was made.
 *
 * `connection()` is what makes the environment variables work in a container.
 * The landing page is statically prerendered, so reading `process.env` during
 * the build would bake in whatever was set on the build machine — for a Docker
 * deployment, where the operator sets these at `docker run` time, that means
 * their contact details would silently never appear. This waits for a request
 * instead. Callers wrap it in `<Suspense>` so only this block waits.
 *
 * Renders nothing when unconfigured, so a default install is unchanged.
 */
export async function ExpertContactBlock({
  variant = "card",
}: {
  variant?: "card" | "print" | "rail";
}) {
  await connection();

  const contact = expertContact();
  if (!contact) return null;

  const t = await getTranslations("shell.expert");

  const links: Array<{ href: string; label: string }> = [];
  if (contact.email)
    links.push({ href: `mailto:${contact.email}`, label: contact.email });
  if (contact.phone)
    links.push({
      href: `tel:${contact.phone.replace(/[^+\d]/g, "")}`,
      label: contact.phone,
    });
  if (contact.url) links.push({ href: contact.url, label: t("website") });

  return (
    <aside
      aria-labelledby="expert-contact-title"
      className={
        variant === "print"
          ? "border-line mt-8 break-inside-avoid rounded-lg border p-4"
          : variant === "rail"
            ? // Beside the document on screen, never in the print tree. The
              // disclaimer below is not trimmed to fit: a reader deciding
              // whether to call deserves it at whatever width.
              "border-line bg-surface rounded-lg border p-4 print:hidden"
            : "border-line bg-surface shadow-card rounded-xl border p-6"
      }
    >
      <p className="text-faint text-xs tracking-wide uppercase">{t("eyebrow")}</p>
      <h2 id="expert-contact-title" className="text-ink mt-2 text-base font-semibold">
        {t("title")}
      </h2>
      <p className="text-muted mt-2 text-sm leading-relaxed">{t("lead")}</p>

      <p className="text-ink mt-4 text-sm font-medium">
        {contact.name}
        {contact.org ? (
          <span className="text-muted font-normal"> · {contact.org}</span>
        ) : null}
      </p>

      {contact.note ? (
        <p className="text-muted mt-1 text-sm leading-relaxed">{contact.note}</p>
      ) : null}

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-brand underline underline-offset-2"
              // An external site is the operator's, not lokal's.
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Said plainly: lokal does not vet or endorse whoever is configured here,
          and a reader deciding whether to call deserves to know that. */}
      <p className="text-faint mt-4 text-xs leading-relaxed">{t("disclaimer")}</p>
    </aside>
  );
}
