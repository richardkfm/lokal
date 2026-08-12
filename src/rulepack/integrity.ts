import { CATEGORY_IDS } from "@/domain/enums";
import { type Rulepack, rulepackSchema } from "./schema";

/**
 * Structural validation is not enough for rule data.
 *
 * A migration edge pointing at a target that no longer exists, or a category
 * declared but never populated, parses cleanly and then produces a report with a
 * silent hole in it. These checks turn that class of mistake into a build failure.
 */

export type IntegrityProblem = {
  /** Where the problem sits, e.g. `migrationEdges[3].to`. */
  path: string;
  message: string;
};

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated];
}

/**
 * Checks cross-references within an already-parsed rulepack.
 * Returns every problem found rather than throwing on the first.
 */
export function findIntegrityProblems(pack: Rulepack): IntegrityProblem[] {
  const problems: IntegrityProblem[] = [];
  const add = (path: string, message: string) => problems.push({ path, message });

  const categoryIds = new Set(pack.categories.map((c) => c.id));
  const targetIds = new Set(pack.targetTools.map((t) => t.id));
  const sourceIds = new Set(pack.sourceTools.map((s) => s.id));
  const prerequisiteIds = new Set(pack.prerequisites.map((p) => p.id));

  // --- Uniqueness -----------------------------------------------------------

  for (const [label, ids] of [
    ["categories", pack.categories.map((c) => c.id)],
    ["sourceTools", pack.sourceTools.map((s) => s.id)],
    ["targetTools", pack.targetTools.map((t) => t.id)],
    ["prerequisites", pack.prerequisites.map((p) => p.id)],
    ["aiUseCases", pack.aiUseCases.map((u) => u.id)],
    ["aiDeployments", pack.aiDeployments.map((d) => d.id)],
    ["blockerRules", pack.blockerRules.map((r) => r.id)],
  ] as const) {
    for (const id of duplicates(ids)) {
      add(label, `Duplicate id "${id}".`);
    }
  }

  for (const id of duplicates(
    pack.migrationEdges.map((edge) => `${edge.from}->${edge.to}`),
  )) {
    add("migrationEdges", `Duplicate edge "${id}".`);
  }

  // --- Category coverage ----------------------------------------------------

  for (const id of CATEGORY_IDS) {
    if (!categoryIds.has(id)) {
      add(
        "categories",
        `Category "${id}" is in the domain vocabulary but not declared.`,
      );
    }
  }

  for (const [index, category] of pack.categories.entries()) {
    const targets = pack.targetTools.filter((t) => t.category === category.id);
    if (targets.length === 0) {
      add(
        `categories[${index}]`,
        `Category "${category.id}" has no target tools, so the report would show an empty recommendation.`,
      );
    }
  }

  // --- Cross-references -----------------------------------------------------

  for (const [index, tool] of pack.sourceTools.entries()) {
    if (!categoryIds.has(tool.category)) {
      add(`sourceTools[${index}].category`, `Unknown category "${tool.category}".`);
    }
  }

  for (const [index, tool] of pack.targetTools.entries()) {
    if (!categoryIds.has(tool.category)) {
      add(`targetTools[${index}].category`, `Unknown category "${tool.category}".`);
    }
    for (const prerequisite of tool.prerequisites) {
      if (!prerequisiteIds.has(prerequisite)) {
        add(
          `targetTools[${index}].prerequisites`,
          `Unknown prerequisite "${prerequisite}".`,
        );
      }
    }
  }

  for (const [index, edge] of pack.migrationEdges.entries()) {
    if (!targetIds.has(edge.to)) {
      add(`migrationEdges[${index}].to`, `Unknown target tool "${edge.to}".`);
    }
    if (edge.from !== "*" && !sourceIds.has(edge.from)) {
      add(`migrationEdges[${index}].from`, `Unknown source tool "${edge.from}".`);
    }

    const target = pack.targetTools.find((t) => t.id === edge.to);
    const source = pack.sourceTools.find((s) => s.id === edge.from);
    if (target && source && target.category !== source.category) {
      add(
        `migrationEdges[${index}]`,
        `"${edge.from}" (${source.category}) and "${edge.to}" (${target.category}) are in different categories.`,
      );
    }
  }

  // --- Plausibility ---------------------------------------------------------

  for (const [index, tool] of pack.targetTools.entries()) {
    // Full sovereignty requires that the data can stay under the organization's
    // own control — either on its own servers or on its own devices. A tool
    // available only as a hosted service cannot claim it, and saying otherwise
    // reads as an overstated promise to precisely the readers who check.
    const staysUnderOwnControl =
      tool.hostingModes.includes("self_hosted") ||
      tool.hostingModes.includes("local_device");
    if (tool.sovereignty === 5 && !staysUnderOwnControl) {
      add(
        `targetTools[${index}].sovereignty`,
        `"${tool.id}" claims top sovereignty but can only run as a hosted service.`,
      );
    }
    if (tool.supportModel === "community" && tool.publicSectorFit === 5) {
      add(
        `targetTools[${index}].publicSectorFit`,
        `"${tool.id}" claims top public-sector fit with community-only support, which public bodies rarely accept.`,
      );
    }
  }

  for (const [index, useCase] of pack.aiUseCases.entries()) {
    if (useCase.minHardware === "none") {
      add(
        `aiUseCases[${index}].minHardware`,
        `"${useCase.id}" cannot require no hardware at all.`,
      );
    }
  }

  return problems;
}

/**
 * How much of a pack has been through human verification. The report shows this
 * so a reader can weigh the recommendations accordingly.
 */
export function reviewCoverage(pack: Rulepack): {
  total: number;
  verified: number;
  allVerified: boolean;
} {
  const entries = [
    ...pack.sourceTools,
    ...pack.targetTools,
    ...pack.migrationEdges,
    ...pack.aiUseCases,
    ...pack.aiDeployments,
  ];
  const verified = entries.filter((e) => e.reviewStatus === "verified").length;

  return { total: entries.length, verified, allVerified: verified === entries.length };
}

/**
 * Parses and cross-checks a rulepack. Throws with every problem listed, because
 * fixing rule data one error per run is miserable.
 */
export function validateRulepack(value: unknown): Rulepack {
  const pack = rulepackSchema.parse(value);
  const problems = findIntegrityProblems(pack);

  if (problems.length > 0) {
    const detail = problems.map((p) => `  - ${p.path}: ${p.message}`).join("\n");
    throw new Error(`Rulepack "${pack.version}" failed integrity checks:\n${detail}`);
  }

  return pack;
}
