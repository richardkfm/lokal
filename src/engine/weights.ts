/**
 * Scoring weights, gathered in one place so they can be argued with.
 *
 * These numbers are judgements, not measurements. Keeping them here — rather
 * than scattered through the scoring code — means a reviewer can see the whole
 * value system at once, and the golden persona fixtures make any change to them
 * visible in a diff. That is the point of those fixtures.
 *
 * Weights within each group sum to 1 before penalties are applied.
 */

/**
 * How much each property of a candidate contributes to its fit.
 *
 * Sovereignty and German market presence carry the most weight because they are
 * what distinguishes a recommendation lokal can defend from a generic one: a
 * technically excellent product nobody in Germany can support is not a good
 * recommendation for a Landkreis.
 */
export const FIT_WEIGHTS = {
  sovereignty: 0.2,
  maturity: 0.18,
  deMarketPresence: 0.17,
  germanUiQuality: 0.15,
  hostingModeMatch: 0.15,
  supportModel: 0.15,
} as const;

/**
 * Public-sector fit is scored only for public-sector organizations, where it
 * genuinely matters, and folded in alongside the base weights rather than
 * distorting them for everyone else.
 */
export const PUBLIC_SECTOR_FIT_WEIGHT = 0.2;

/**
 * Penalties, subtracted after the weighted score.
 *
 * Operations load is scaled by what the organization can actually absorb: the
 * same product is a fine choice for a capable IT team and a millstone for an
 * authority with half an administrator. Training load is scaled by both the
 * organization's stated sensitivity and its size, because retraining cost grows
 * with the number of people who have to be retrained.
 */
export const PENALTY_WEIGHTS = {
  /** Multiplied by ops load (0..1) and by the inverse of ops capability. */
  opsLoad: 0.3,
  /** Multiplied by training load (0..1), training sensitivity and seat weight. */
  trainingLoad: 0.25,
} as const;

/**
 * Bonus for a candidate belonging to an ecosystem already chosen elsewhere.
 *
 * Deliberately small. Coherence is worth something real — one identity
 * integration, one backup routine, one vendor conversation — but it must never
 * outweigh a genuine mismatch. Capped so it cannot overturn a difference in
 * fundamentals.
 */
export const ECOSYSTEM_COHERENCE_BONUS = 6;

/**
 * How difficulty is assembled. The base comes from the rulepack; these are the
 * adjustments the organization's own situation makes to it.
 */
export const DIFFICULTY_WEIGHTS = {
  criticality: 0.8,
  identityGap: 0.6,
  trainingSensitivity: 0.5,
  /** Subtracted: a capable team genuinely makes migrations easier. */
  opsCapabilityRelief: 0.8,
} as const;

/**
 * Value and cost inputs for sequencing. Value drives what to do first; cost and
 * risk push work later.
 */
export const SEQUENCING_WEIGHTS = {
  pain: 1,
  urgency: 1.2,
  lockInConcern: 0.8,
  difficulty: 1,
  criticality: 0.9,
} as const;
