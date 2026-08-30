import { z } from "zod";

/**
 * The expert contact block, configured by whoever runs the instance.
 *
 * lokal produces a plan and then stops, and its own capacity section is often
 * what tells an organization they will need help carrying it out. This is the
 * one place the tool can point at a human — and since lokal is self-hosted, the
 * human differs per installation.
 *
 * Environment variables rather than an admin screen. An in-browser editor would
 * need authentication, which the roadmap defers deliberately, plus a settings
 * table and a login flow — a lot of machinery for six strings that change once a
 * year, on a tool whose landing page promises no accounts. The operator already
 * edits `.env` to set `DATABASE_URL`.
 *
 * Nothing here is stored, sent or tracked: the block renders a `mailto:`, a
 * `tel:` and a link. No form, so no enquiry data, so no GDPR duty added to a
 * product used by public bodies.
 */

const optionalText = z.string().trim().min(1).max(200).optional().catch(undefined);

const schema = z.object({
  name: optionalText,
  org: optionalText,
  email: z.string().trim().email().optional().catch(undefined),
  phone: optionalText,
  url: z.url().optional().catch(undefined),
  note: z.string().trim().min(1).max(400).optional().catch(undefined),
});

export type ExpertContact = z.infer<typeof schema>;

/**
 * Reads the contact from the environment, or returns `null` when it is not
 * configured.
 *
 * `.catch(undefined)` on every field is deliberate: a typo in one variable drops
 * that field rather than throwing. A malformed phone number must never be able
 * to take down the report page someone is in the middle of printing.
 */
type Env = Record<string, string | undefined>;

export function expertContact(env: Env = process.env): ExpertContact | null {
  const parsed = schema.parse({
    name: env.LOKAL_EXPERT_NAME,
    org: env.LOKAL_EXPERT_ORG,
    email: env.LOKAL_EXPERT_EMAIL,
    phone: env.LOKAL_EXPERT_PHONE,
    url: env.LOKAL_EXPERT_URL,
    note: env.LOKAL_EXPERT_NOTE,
  });

  // A name alone is not a contact. Without a way to actually reach someone the
  // block would be decoration, so it stays hidden.
  const reachable = parsed.email ?? parsed.phone ?? parsed.url;
  if (!reachable || !parsed.name) return null;

  return parsed;
}
