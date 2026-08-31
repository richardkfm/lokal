import { z } from "zod";

/**
 * Impressum, Datenschutzerklärung and Barrierefreiheitserklärung, as links.
 *
 * Their absence is the most conspicuous omission on a site whose entire pitch is
 * sovereignty and compliance-consciousness, aimed at people whose first reflex
 * is to check §5 DDG and Art. 13 DSGVO. A Datenschutzbeauftragte looks for them
 * before reading a word of the argument — and lokal does store intake answers
 * server-side, so a privacy notice is not merely formal here.
 *
 * **lokal cannot write them.** They are legal declarations about a specific
 * operator: their name, their address, their data-protection officer, their own
 * assessment of BITV conformance. A placeholder would be worse than an absence,
 * because a placeholder looks discharged — the same reason `LOKAL_EXPERT_*`
 * renders nothing rather than an example contact.
 *
 * So these are URLs, not text. The audience this tool is built for — Kommunen,
 * Landkreise, Stadtwerke, Schulen — already publishes all three somewhere, and
 * pointing at the real ones is both less work for the operator and more honest
 * than a second copy that will drift. An operator with nowhere to point has the
 * same options they have for any other page they must publish.
 *
 * Unset means the link is absent. Nothing is invented and nothing is implied.
 */

const optionalUrl = z.url().optional().catch(undefined);

const schema = z.object({
  imprint: optionalUrl,
  privacy: optionalUrl,
  accessibility: optionalUrl,
});

export type LegalLinks = z.infer<typeof schema>;

type Env = Record<string, string | undefined>;

/**
 * Reads the three links from the environment.
 *
 * Returns `null` when none is configured, so the footer can drop the whole
 * column rather than render an empty heading. `.catch(undefined)` per field for
 * the same reason as the expert contact: a typo in one variable drops that link
 * and must never take down the page someone is printing.
 */
export function legalLinks(env: Env = process.env): LegalLinks | null {
  const parsed = schema.parse({
    imprint: env.LOKAL_LEGAL_IMPRINT_URL,
    privacy: env.LOKAL_LEGAL_PRIVACY_URL,
    accessibility: env.LOKAL_LEGAL_ACCESSIBILITY_URL,
  });

  if (!parsed.imprint && !parsed.privacy && !parsed.accessibility) return null;

  return parsed;
}
