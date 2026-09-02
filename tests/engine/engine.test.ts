import { describe, expect, it } from "vitest";
import { runEngine } from "@/engine";
import { currentRulepack } from "@/rulepack";
import { assessment, type AssessmentOverrides } from "../fixtures/build";

const pack = currentRulepack();
const run = (overrides: AssessmentOverrides = {}) =>
  runEngine(assessment(overrides), pack);

/** Every rationale code the engine emitted, flattened. */
function allCodes(result: ReturnType<typeof run>): string[] {
  return (
    JSON.stringify(result)
      .match(/"code":"[^"]+"/g)
      ?.map((match) => match.slice(8, -1)) ?? []
  );
}

describe("capacity", () => {
  it("confronts the plan with the time actually available", () => {
    const result = run({
      categories: ["file_sharing", "chat_video", "helpdesk", "intranet_wiki"],
      adminCapacity: "low",
      totalSeats: 900,
      categorySeats: 900,
      supportExpectation: "community_tolerant",
    });

    expect(result.capacity.total.max).toBeGreaterThan(0);
    expect(result.capacity.availablePerYear.max).toBe(20);
    expect(result.capacity.gaps.map((g) => g.code)).toContain(
      "capacity.plan_exceeds_annual_capacity",
    );
  });

  it("does not cry wolf when capacity is ample", () => {
    const result = run({
      categories: ["forms_surveys"],
      adminCapacity: "high",
      totalSeats: 40,
      categorySeats: 40,
    });

    expect(result.capacity.gaps.map((g) => g.code)).not.toContain(
      "capacity.plan_exceeds_annual_capacity",
    );
  });

  it("recommends a pilot where a rollout would be risky", () => {
    const result = run({
      categories: ["office_docs"],
      totalSeats: 600,
      categorySeats: 600,
      trainingSensitivity: "high",
    });

    expect(result.capacity.pilotsRecommended).toContain("office_docs");
  });

  it("expresses effort as ranges, never single figures", () => {
    const result = run({ categories: ["file_sharing", "helpdesk"] });
    for (const phase of result.capacity.perPhase) {
      expect(phase.days.max).toBeGreaterThanOrEqual(phase.days.min);
      for (const effort of phase.efforts) {
        expect(effort.days.max).toBeGreaterThan(effort.days.min);
      }
    }
  });

  it("counts groundwork in phase 0 as real work", () => {
    const result = run({ categories: ["file_sharing", "chat_video"] });
    const phaseZero = result.capacity.perPhase.find((p) => p.phase === 0)!;
    expect(phaseZero.days.min).toBeGreaterThan(0);
  });
});

describe("work packages", () => {
  const efforts = (result: ReturnType<typeof run>) =>
    result.capacity.perPhase.flatMap((phase) => phase.efforts);

  it("explains the range without changing it", () => {
    // The invariant this whole module lives or dies by. A breakdown that does
    // not add up to its own total is the first thing a sceptical reader checks,
    // and a total that moved would make this a scoring change wearing the
    // clothes of a rendering improvement.
    for (const effort of efforts(
      run({
        categories: ["file_sharing", "office_docs", "helpdesk", "chat_video"],
        totalSeats: 600,
        categorySeats: 600,
      }),
    )) {
      const summed = effort.items.reduce(
        (acc, item) => ({
          min: acc.min + item.days.min,
          max: acc.max + item.days.max,
        }),
        { min: 0, max: 0 },
      );

      expect(summed).toEqual(effort.days);
    }
  });

  it("holds the sum for every persona, at every size", () => {
    for (const size of [14, 45, 180, 600, 2400]) {
      for (const effort of efforts(run({ totalSeats: size, categorySeats: size }))) {
        const min = effort.items.reduce((acc, item) => acc + item.days.min, 0);
        expect(min).toBe(effort.days.min);
      }
    }
  });

  it("emits no package for work the plan does not contain", () => {
    // A training line reading zero days is padding, and padding is what makes
    // an estimate untrustworthy. Absent is the honest rendering.
    const result = run({
      trainingSensitivity: "low",
      totalSeats: 30,
      categorySeats: 30,
    });

    for (const effort of efforts(result)) {
      expect(effort.items.map((item) => item.package)).not.toContain("training");
      for (const item of effort.items) {
        expect(item.days.max).toBeGreaterThan(0);
      }
    }
  });

  it("orders the packages as the work happens, not by size", () => {
    // Sorted by size it reads as a cost table; sorted by sequence it reads as a
    // plan, which is what the reader is being asked to approve.
    const order = [
      "preparation",
      "data_migration",
      "pilot",
      "rollout",
      "training",
      "parallel_run",
      "aftercare",
    ];

    for (const effort of efforts(run({ totalSeats: 400, categorySeats: 400 }))) {
      const positions = effort.items.map((item) => order.indexOf(item.package));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it("says which band it chose and what raised it", () => {
    // The direct answer to "yes there are days, but why". bandFor used to
    // return a band and emit nothing at all.
    const small = allCodes(run({ totalSeats: 40, categorySeats: 40 }));
    const large = allCodes(run({ totalSeats: 900, categorySeats: 900 }));

    expect(small).toContain("effort.band_from_difficulty");
    expect(small).not.toContain("effort.band_raised_by_seat_count");
    expect(large).toContain("effort.band_raised_by_seat_count");
  });

  it("keeps every package traceable to an intake field", () => {
    for (const effort of efforts(run({ totalSeats: 300, categorySeats: 300 }))) {
      for (const item of effort.items) {
        expect(item.reasons.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("calendar duration", () => {
  it("answers the question the day figures never could", () => {
    // Twelve pages of plan and no month anywhere in it was the defect. The
    // horizon is the first thing a Buergermeister asks for.
    const result = run({ categories: ["file_sharing", "office_docs", "helpdesk"] });

    expect(result.schedule.horizonMonths.min).toBeGreaterThan(0);
    expect(result.schedule.horizonMonths.max).toBeGreaterThanOrEqual(
      result.schedule.horizonMonths.min,
    );
  });

  it("takes longer when there is more to do", () => {
    const small = run({ categories: ["file_sharing"] });
    const large = run({
      categories: ["file_sharing", "office_docs", "helpdesk", "chat_video", "crm"],
    });

    expect(large.schedule.horizonMonths.max).toBeGreaterThanOrEqual(
      small.schedule.horizonMonths.max,
    );
  });

  it("takes longer when there is less time to do it in", () => {
    const shape: AssessmentOverrides = {
      categories: ["file_sharing", "office_docs"],
    };
    const stretched = run({ ...shape, adminCapacity: "low" });
    const resourced = run({ ...shape, adminCapacity: "high" });

    expect(stretched.schedule.horizonMonths.max).toBeGreaterThanOrEqual(
      resourced.schedule.horizonMonths.max,
    );
  });

  it("will not let capacity alone shorten a change many people have to absorb", () => {
    // The substance of the module. 900 people cannot be retrained in a week
    // however many administrator-days exist, and a schedule that says otherwise
    // is the one that slips and takes the plan's credibility with it.
    const result = run({
      categories: ["office_docs"],
      totalSeats: 900,
      categorySeats: 900,
      trainingSensitivity: "high",
      adminCapacity: "high",
    });

    expect(result.schedule.phases.some((phase) => phase.floorBinds)).toBe(true);
    expect(allCodes(result)).toContain("schedule.paced_by_people_not_capacity");
    expect(allCodes(result)).toContain(
      "schedule.more_admin_time_would_not_shorten_this",
    );
  });

  it("does not multiply two uncertainty ranges together", () => {
    // Pairing "the most days this could take" with "the least time they might
    // have" produced a ten-year plan for a fourteen-person association. Both
    // ends are computed against the middle of the declared capacity, so the
    // spread the reader sees is the spread in the effort estimate and nothing
    // else. The ratio of the two effort figures bounds the ratio of the months.
    const result = run({
      categories: ["file_sharing", "office_docs"],
      totalSeats: 14,
      categorySeats: 14,
      adminCapacity: "low",
    });

    const effortRatio = result.capacity.total.max / result.capacity.total.min;
    const horizonRatio =
      result.schedule.horizonMonths.max / result.schedule.horizonMonths.min;

    expect(horizonRatio).toBeLessThanOrEqual(effortRatio + 0.5);
  });

  it("says when the horizon is a capacity gap rather than a schedule", () => {
    // "37 Monate" reads as a plan; "mehr als Sie in einem Jahr leisten koennen"
    // reads as the decision it actually is. The report has to lead with the
    // second.
    const stretched = run({
      categories: ["file_sharing", "office_docs", "helpdesk", "chat_video"],
      adminCapacity: "low",
      totalSeats: 400,
      categorySeats: 400,
    });
    const comfortable = run({ categories: ["file_sharing"], adminCapacity: "high" });

    expect(stretched.schedule.exceedsCapacity).toBe(true);
    expect(allCodes(stretched)).toContain("schedule.horizon_reflects_a_capacity_gap");
    expect(comfortable.schedule.exceedsCapacity).toBe(false);
  });

  it("gives an empty phase no elapsed time", () => {
    // Padding the horizon with work nobody is doing would be the easiest way to
    // make the whole figure untrustworthy.
    const result = run({ categories: ["file_sharing"] });
    const empty = result.schedule.phases.filter((phase) => {
      const planned = result.sequencing.phases.find((p) => p.id === phase.phase);
      return planned?.migrations.length === 0 && planned?.prerequisites.length === 0;
    });

    for (const phase of empty) {
      expect(phase.months).toEqual({ min: 0, max: 0 });
    }
  });

  it("runs the phases in sequence, which is what a phase is", () => {
    const result = run({
      categories: ["file_sharing", "office_docs", "helpdesk", "chat_video"],
    });
    const starts = result.schedule.phases.map((phase) => phase.startMonth);

    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});

describe("the client operating system", () => {
  it("never names a distribution", () => {
    // The boundary of what lokal claims. Which Linux to use depends on
    // procurement, support contracts and the skills already in the building, and
    // answering it from five intake answers would be exactly the
    // alternatives-finder output lokal exists not to produce.
    const serialized = JSON.stringify(
      run({ clientOs: "windows", windowsOnlyApps: "none" }).clientOs,
    ).toLowerCase();

    for (const name of ["ubuntu", "debian", "fedora", "suse", "mint", "redhat"]) {
      expect(serialized).not.toContain(name);
    }
  });

  it("blocks where the decision rests with someone else's vendor", () => {
    const result = run({ windowsOnlyApps: "many", peripheralDependency: "low" });

    expect(result.clientOs.verdict).toBe("blocked");
    expect(result.clientOs.blockers.length).toBeGreaterThan(0);
    expect(allCodes(result)).toContain(
      "client_os.blocked_by_windows_only_applications",
    );
  });

  it("says a mixed estate is a legitimate outcome, not a failure", () => {
    // An organization told "blockiert" without this concludes the whole idea is
    // dead, when what is actually true is that some desks stay on Windows.
    const result = run({ windowsOnlyApps: "several", peripheralDependency: "low" });

    expect(result.clientOs.verdict).toBe("blocked");
    expect(allCodes(result)).toContain("client_os.mixed_estate_is_a_valid_outcome");
  });

  it("puts the swap after every application migration, never before", () => {
    // The doctrine the whole lane exists to encode. Swapping the operating
    // system first means migrating applications and workstations at once, and
    // unwinding both together whenever something goes wrong.
    const result = run({
      categories: ["file_sharing", "office_docs", "helpdesk"],
      windowsOnlyApps: "none",
      peripheralDependency: "low",
      deviceManagement: "mdm",
    });

    const lastWithMigrations = Math.max(
      ...result.sequencing.phases
        .filter((phase) => phase.migrations.length > 0)
        .map((phase) => phase.id),
    );

    expect(result.clientOs.verdict).toBe("after_apps");
    expect(result.clientOs.phase).toBeGreaterThan(lastWithMigrations);
    expect(allCodes(result)).toContain("client_os.doctrine_os_moves_last");
  });

  it("scales the estimate with devices and says where the number came from", () => {
    const declared = run({
      windowsOnlyApps: "none",
      peripheralDependency: "low",
      deviceManagement: "mdm",
      totalSeats: 100,
      categorySeats: 100,
      deviceCount: 400,
    });
    const fallback = run({
      windowsOnlyApps: "none",
      peripheralDependency: "low",
      deviceManagement: "mdm",
      totalSeats: 100,
      categorySeats: 100,
    });

    expect(declared.clientOs.devices).toEqual({ count: 400, source: "declared" });
    expect(fallback.clientOs.devices).toEqual({ count: 100, source: "seats" });
    // Four times the machines is more work, whatever the seat count says.
    expect(declared.clientOs.effortDays!.max).toBeGreaterThan(
      fallback.clientOs.effortDays!.max,
    );
    // And the fallback is disclosed rather than passed off as a device count.
    expect(allCodes(fallback)).toContain("client_os.device_count_fell_back_to_seats");
  });

  it("asserts nothing when nothing was asked", () => {
    // The branch an assessment stored before the workplace block existed lands
    // in. Naming the unanswered question beats inventing an estate.
    const result = run({ clientOs: "unknown" });

    expect(result.clientOs.verdict).toBe("not_assessed");
    expect(result.clientOs.effortDays).toBeNull();
    expect(allCodes(result)).toContain("client_os.verdict_not_assessed");
  });

  it("says what an estate already on Linux removes from the plan", () => {
    const result = run({ clientOs: "linux" });

    expect(result.clientOs.verdict).toBe("already_open");
    expect(allCodes(result)).toContain("client_os.verdict_already_open");
  });

  it("shows the gates lokal cannot decide as outstanding", () => {
    // A checklist that completes itself is not a checklist.
    const result = run({
      windowsOnlyApps: "none",
      peripheralDependency: "low",
      deviceManagement: "mdm",
    });
    const manual = result.clientOs.gates.filter((gate) => gate.status === "manual");

    expect(manual.length).toBeGreaterThan(0);
    expect(manual.map((gate) => gate.gate.id)).toContain("pilot-through-a-full-cycle");
  });
});

describe("savings outlook", () => {
  it("returns a qualitative band with drivers and offsets", () => {
    const result = run({ categories: ["file_sharing", "office_docs"] });

    expect(["low", "moderate", "strong"]).toContain(result.savings.band);
    expect(result.savings.drivers.length).toBeGreaterThan(0);
    expect(result.savings.offsets.length).toBeGreaterThan(0);
  });

  it("always states what the model does not account for", () => {
    const result = run({});
    expect(result.savings.modelLimitations.map((l) => l.code)).toContain(
      "savings.model_is_qualitative",
    );
  });

  it("rates displacing heavily locked-in seats higher than lightly locked-in ones", () => {
    const lockedIn = run({
      categories: ["file_sharing"],
      supportExpectation: "community_tolerant",
    });
    // A plain file server carries far less recurring exposure than SharePoint.
    const loose = runEngine(
      {
        ...assessment({
          categories: ["file_sharing"],
          supportExpectation: "community_tolerant",
        }),
        stack: [
          {
            ...assessment({ categories: ["file_sharing"] }).stack[0]!,
            currentTool: { kind: "known", id: "windows-file-server" },
          },
        ],
      },
      pack,
    );

    const rank = { low: 0, moderate: 1, strong: 2 };
    expect(rank[lockedIn.savings.band]).toBeGreaterThanOrEqual(
      rank[loose.savings.band],
    );
  });

  it("names the parallel-running cost when the plan spans several phases", () => {
    const result = run({
      categories: ["file_sharing", "chat_video", "helpdesk", "dms_archive"],
      supportExpectation: "community_tolerant",
    });

    if (result.savings.parallelRunPhases > 1) {
      expect(result.savings.offsets.map((o) => o.code)).toContain(
        "savings.parallel_running_costs",
      );
    }
  });
});

describe("local-AI lane", () => {
  it("defers a use case the hardware cannot support, with a reason", () => {
    const result = run({
      aiInterest: "active",
      hardwareProfile: "office_pcs",
      aiUseCases: ["knowledge_assistant"],
    });

    const assistant = result.aiLane.recommendations[0]!;
    expect(assistant.timing).toBe("later");
    expect(assistant.reasons.map((r) => r.code)).toContain(
      "ai.hardware_below_requirement",
    );
  });

  it("defers document questions when no document store is planned first", () => {
    // Only a helpdesk migration: nothing to ask questions of.
    const result = run({
      categories: ["helpdesk"],
      aiInterest: "active",
      hardwareProfile: "gpu_capable",
      dataSensitivity: "low",
      aiUseCases: ["document_qa"],
    });

    const docQa = result.aiLane.recommendations[0]!;
    expect(docQa.timing).toBe("later");
    expect(docQa.reasons.map((r) => r.code)).toContain(
      "ai.needs_a_document_store_first",
    );
  });

  it("allows document questions once a document store is on the roadmap", () => {
    const result = run({
      categories: ["file_sharing"],
      aiInterest: "active",
      hardwareProfile: "gpu_capable",
      dataSensitivity: "low",
      aiUseCases: ["document_qa"],
      supportExpectation: "community_tolerant",
    });

    const docQa = result.aiLane.recommendations[0]!;
    expect(docQa.reasons.map((r) => r.code)).not.toContain(
      "ai.needs_a_document_store_first",
    );
  });

  it("picks the most sovereign posture that can carry the data", () => {
    const result = run({
      aiInterest: "active",
      hardwareProfile: "server",
      dataSensitivity: "high",
      aiUseCases: ["summarization"],
    });

    const summary = result.aiLane.recommendations[0]!;
    expect(summary.deployment).not.toBeNull();
    expect(summary.deployment!.posture).not.toBe("eu_hosted");
  });

  it("attaches a human-review expectation to every use case", () => {
    const result = run({
      aiInterest: "active",
      hardwareProfile: "gpu_capable",
      aiUseCases: ["summarization", "drafting", "ticket_triage"],
    });

    for (const recommendation of result.aiLane.recommendations) {
      expect(recommendation.risks.map((r) => r.code).join(" ")).toMatch(/^ai\.review_/);
    }
  });

  it("says nothing rather than inventing a lane when there is no interest", () => {
    const result = run({ aiInterest: "none", aiUseCases: [] });
    expect(result.aiLane.recommendations).toHaveLength(0);
    expect(result.aiLane.posture).toBe("not_now");
  });
});

describe("runEngine", () => {
  it("produces byte-identical output across runs", () => {
    const once = JSON.stringify(run({ categories: ["file_sharing", "helpdesk"] }));
    const twice = JSON.stringify(run({ categories: ["file_sharing", "helpdesk"] }));
    expect(once).toBe(twice);
  });

  it("records both the engine and the rulepack version", () => {
    const result = run({});
    expect(result.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(result.rulepackVersion).toBe(pack.version);
  });

  // ADR-0003 lets the engine compute money. It does not let the engine render
  // it: a hand-formatted amount is one that has escaped its plan name, source
  // and observation date, which are the only things making the figure checkable.
  it("carries money as data, never as formatted text", () => {
    const result = run({
      categories: ["file_sharing", "office_docs", "chat_video", "helpdesk"],
      aiInterest: "active",
      hardwareProfile: "gpu_capable",
      aiUseCases: ["summarization", "document_qa"],
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/€/);
    expect(serialized).not.toMatch(/\d[\d.,]*\s*(?:€|EUR)\b/);
  });

  it("attaches at least one rationale to every recommendation", () => {
    const result = run({ categories: ["file_sharing", "helpdesk", "chat_video"] });

    for (const recommendation of result.recommendations) {
      if (!recommendation.primary) continue;
      expect(recommendation.primary.fitReasons.length).toBeGreaterThan(0);
    }
    for (const phase of result.sequencing.phases) {
      for (const migration of phase.migrations) {
        expect(migration.reasons.length).toBeGreaterThan(0);
      }
    }
  });

  it("uses only structured codes, never prose", () => {
    // Every code must look like a key, not a sentence. This is the guarantee
    // that keeps the engine translatable and free of embedded English.
    for (const code of allCodes(
      run({ aiInterest: "active", aiUseCases: ["summarization"] }),
    )) {
      expect(code).toMatch(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/);
    }
  });

  it("handles the smallest plausible organization", () => {
    const result = run({
      orgType: "association",
      publicSector: false,
      totalSeats: 4,
      categorySeats: 4,
      categories: ["file_sharing"],
      departments: [],
      supportExpectation: "community_tolerant",
    });

    expect(result.sequencing.phases).toHaveLength(5);
    expect(result.readiness.overall.score).toBeGreaterThanOrEqual(0);
  });

  it("handles every category at once", () => {
    const result = run({
      categories: [
        "office_docs",
        "file_sharing",
        "chat_video",
        "intranet_wiki",
        "project_management",
        "helpdesk",
        "forms_surveys",
        "crm",
        "dms_archive",
      ],
      supportExpectation: "community_tolerant",
    });

    expect(result.recommendations).toHaveLength(9);
    const planned = result.sequencing.phases.flatMap((p) => p.migrations).length;
    expect(planned + result.sequencing.keepForNow.length).toBe(9);
  });
});

/**
 * Priced subscription exposure (ADR-0003).
 *
 * The arithmetic is trivial on purpose — seats times published price times
 * twelve — so these tests are mostly about the two ways it can be wrong in a way
 * that discredits the report: counting one subscription several times, and
 * presenting a partial figure as a total.
 */
describe("subscription exposure", () => {
  it("prices declared seats at the vendor's published list price", () => {
    const exposure = run({
      categories: ["office_docs"],
      totalSeats: 180,
      categorySeats: 180,
    }).savings.subscriptionExposure;

    // Microsoft 365 Apps for Business, 11,00 € net per seat per month.
    expect(exposure?.annualCents).toBe(180 * 1100 * 12);
    expect(exposure?.currency).toBe("EUR");
    expect(exposure?.basis).toHaveLength(1);
    expect(exposure?.basis[0]?.planName).toBe("Microsoft 365 Apps for Business");
    expect(exposure?.basis[0]?.source).toMatch(/^https:\/\/www\.microsoft\.com\//);
    expect(exposure?.basis[0]?.observedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  /**
   * The error worth an entire test on its own.
   *
   * Office, files and chat here are all Microsoft 365. If the engine summed them
   * it would report three times one invoice, and a reader who knows their real
   * contract would stop reading at that line — taking the rest of the plan with
   * it.
   */
  it("counts one subscription once, however many categories it covers", () => {
    const spread = run({
      categories: ["office_docs", "file_sharing", "chat_video"],
      totalSeats: 180,
      categorySeats: 180,
    }).savings.subscriptionExposure;

    expect(spread?.basis).toHaveLength(1);
    expect(spread?.annualCents).toBe(180 * 1100 * 12);
    expect(spread?.categoriesPriced).toBe(3);
    // The dearest plan in the bundle sets the line, not the cheapest.
    expect(spread?.basis[0]?.amountCents).toBe(1100);
    expect(spread?.basis[0]?.categories).toEqual([
      "chat_video",
      "file_sharing",
      "office_docs",
    ]);
  });

  it("reports coverage so a partial figure is never read as a total", () => {
    const exposure = run({
      // helpdesk is a shared mailbox and crm a spreadsheet: no vendor publishes
      // a per-seat price for either, so neither can be priced.
      categories: ["office_docs", "helpdesk", "crm"],
    }).savings.subscriptionExposure;

    expect(exposure?.categoriesPriced).toBe(1);
    expect(exposure?.categoriesAssessed).toBe(3);
    expect(exposure?.notes.map((n) => n.code)).toContain(
      "savings.priced_exposure_partial",
    );
  });

  it("prices nothing when no incumbent has a citable published price", () => {
    const exposure = run({ categories: ["helpdesk", "crm"] }).savings
      .subscriptionExposure;
    expect(exposure).toBeNull();
  });

  /**
   * A subscription ends when the last service on it is replaced, not when the
   * first one is. Saying otherwise would overstate the case for migrating, and
   * this is also the more useful planning statement: it names what is standing
   * between the organization and a cancelled contract.
   */
  it("counts a subscription as avoided only once nothing is left on it", () => {
    // Office moves; file sharing is low-pain and not urgent, so the sequencer
    // parks it under "keep for now". Both sit on the same Microsoft 365
    // subscription, so the invoice does not end — and reporting a saving here
    // would be the most tempting way to overstate the whole section.
    const base = assessment({
      categories: ["office_docs", "file_sharing"],
      totalSeats: 180,
      categorySeats: 180,
    });
    const result = runEngine(
      {
        ...base,
        stack: base.stack.map((entry) =>
          entry.category === "file_sharing"
            ? {
                ...entry,
                pain: "low" as const,
                urgency: "later" as const,
                criticality: "low" as const,
              }
            : entry,
        ),
      },
      pack,
    );

    expect(result.sequencing.keepForNow.map((k) => k.category)).toEqual([
      "file_sharing",
    ]);

    const exposure = result.savings.subscriptionExposure;
    const line = exposure?.basis[0];

    expect(line?.remainingCategories).toEqual(["file_sharing"]);
    expect(line?.fallsAway).toBe(false);
    expect(exposure?.annualCents).toBe(180 * 1100 * 12);
    expect(exposure?.avoidedAnnualCents).toBe(0);
    expect(exposure?.notes.map((n) => n.code)).toContain(
      "savings.subscription_not_fully_replaced",
    );
  });

  it("counts a subscription as avoided once the roadmap replaces all of it", () => {
    const exposure = run({
      categories: ["office_docs", "file_sharing", "chat_video"],
      totalSeats: 180,
      categorySeats: 180,
    }).savings.subscriptionExposure;

    expect(exposure?.basis[0]?.remainingCategories).toEqual([]);
    expect(exposure?.basis[0]?.fallsAway).toBe(true);
    expect(exposure?.avoidedAnnualCents).toBe(exposure?.annualCents);
  });

  it("never lowers exposure as seats rise", () => {
    const at = (seats: number) =>
      run({
        categories: ["office_docs"],
        totalSeats: seats,
        categorySeats: seats,
      }).savings.subscriptionExposure?.annualCents ?? 0;

    const points = [20, 60, 180, 400, 900].map(at);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]).toBeGreaterThanOrEqual(points[i - 1]!);
    }
  });

  it("always states that these are list prices, not the real contract", () => {
    const exposure = run({ categories: ["office_docs"] }).savings.subscriptionExposure;
    expect(exposure?.notes.map((n) => n.code)).toContain(
      "savings.prices_are_list_prices",
    );
  });

  it("leaves the qualitative band untouched", () => {
    const result = run({ categories: ["office_docs", "file_sharing"] });
    expect(["low", "moderate", "strong"]).toContain(result.savings.band);
  });
});
