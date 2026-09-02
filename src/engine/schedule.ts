import { levelToUnit, type PhaseId } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import type { NormalizedAssessment } from "./normalize";
import type { CapacityAssessment } from "./capacity";
import type { Sequencing } from "./sequencing";

/**
 * Administrator-days are not a timeframe.
 *
 * "Phase 0: 6–12 Tage" answers a budgeting question and leaves the first
 * question a Bürgermeister or a Geschäftsführung actually asks — *wie lange
 * dauert das?* — unanswered. Twelve pages of plan and no month anywhere in it.
 *
 * This stage converts effort into elapsed time against the capacity the
 * organization declared, and then refuses to let capacity alone decide the
 * answer. That refusal is the substance of the module: 180 people cannot be
 * retrained in a week however many administrator-days exist, and a schedule that
 * says otherwise is the one that slips and takes the plan's credibility with it.
 */

/**
 * Working weeks in a year, after holidays, illness and the weeks where nothing
 * moves. Not 52, because a schedule built on 52 is already late in January.
 */
const WORKING_WEEKS_PER_YEAR = 46;

/** Weeks per month, for turning a week count into something a committee reads. */
const WEEKS_PER_MONTH = 4.345;

export type PhaseSchedule = {
  phase: PhaseId;
  /**
   * Whole months from the start of the plan, on the middle of the estimate.
   *
   * `startMonth`/`endMonth` are one timeline, for drawing a phase as a bar;
   * `months` is the range for that phase. The two do not reconcile, and cannot:
   * a bar chart needs a single line and an estimate has width. Renderers draw
   * from the timeline and quote from the range — never the other way round.
   */
  startMonth: number;
  endMonth: number;
  months: { min: number; max: number };
  /**
   * True when the elapsed time is set by how many people have to be carried
   * rather than by how much administrator time is available. Worth surfacing:
   * it means adding admin capacity will not make this phase shorter.
   */
  floorBinds: boolean;
  notes: RationaleItem[];
};

export type Schedule = {
  phases: PhaseSchedule[];
  /** The whole plan, end to end, in months. */
  horizonMonths: { min: number; max: number };
  /**
   * True when the plan needs more effort than the organization has in a year,
   * so the horizon is a restatement of the capacity gap rather than a schedule.
   * The report leads with the gap in that case, not with the month figure.
   */
  exceedsCapacity: boolean;
  notes: RationaleItem[];
};

/**
 * The minimum elapsed time a phase needs regardless of administrator capacity.
 *
 * Driven by the people, not the machines. Training, communication, and the fact
 * that an organization can only absorb so much change at once are real
 * constraints that more admin hours do not relieve. Stepped rather than
 * continuous, because the jump is between "a team" and "everyone", which is
 * where change management actually changes character.
 */
function changeManagementWeeks(seats: number, trainingLoad: number): number {
  // Elapsed weeks, not effort. The question these answer is "how long until this
  // many people are actually working in the new system", and for a whole
  // workforce the honest answer is months — announcement, scheduling around the
  // work that still has to happen, training in groups, the stragglers, and the
  // second pass for everyone who was on leave the first time.
  const base =
    seats <= 25 ? 2 : seats <= 100 ? 6 : seats <= 500 ? 12 : seats <= 2000 ? 20 : 32;
  return Math.round(base * (1 + 0.5 * trainingLoad));
}

export function buildSchedule(
  sequencing: Sequencing,
  capacity: CapacityAssessment,
  assessment: NormalizedAssessment,
): Schedule {
  const notes: RationaleItem[] = [];

  /**
   * Capacity is a range of uncertainty about the same organization, not two
   * different organizations.
   *
   * Pairing "the most days this could take" with "the least time they might
   * have" multiplies two worst cases and produced a ten-year plan for a
   * fourteen-person association. Both ends of the elapsed range are computed
   * against the middle of the declared capacity, so the spread the reader sees
   * is the spread in the effort estimate and nothing else.
   */
  const weeklyCapacity =
    (capacity.availablePerYear.min + capacity.availablePerYear.max) /
    2 /
    WORKING_WEEKS_PER_YEAR;

  const weeksFor = (days: number) => (weeklyCapacity > 0 ? days / weeklyCapacity : 0);

  let cursorMin = 0;
  let cursorMax = 0;
  /** The single timeline the phase bars are drawn on: the middle of the range. */
  let cursorMid = 0;

  const phases: PhaseSchedule[] = capacity.perPhase.map((phaseCapacity) => {
    const planned = sequencing.phases.find((phase) => phase.id === phaseCapacity.phase);
    const phaseNotes: RationaleItem[] = [];

    // An empty phase takes no time. Saying "1 Monat" for a phase with nothing in
    // it would pad the horizon with work nobody is doing.
    const empty =
      (planned?.migrations.length ?? 0) === 0 &&
      (planned?.prerequisites.length ?? 0) === 0;

    if (empty) {
      const start = Math.round(cursorMid / WEEKS_PER_MONTH);
      return {
        phase: phaseCapacity.phase,
        startMonth: start,
        endMonth: start,
        months: { min: 0, max: 0 },
        floorBinds: false,
        notes: phaseNotes,
      };
    }

    const capacityWeeks = {
      min: weeksFor(phaseCapacity.days.min),
      max: weeksFor(phaseCapacity.days.max),
    };

    // The floor is the largest single migration's change-management need, not
    // the sum: migrations inside one phase run alongside each other, and it is
    // the biggest one that sets how long the phase takes to absorb.
    const seatsInPhase = (planned?.migrations ?? []).map(
      (migration) => migration.seats,
    );
    const floorWeeks = Math.max(
      0,
      ...(planned?.migrations ?? []).map((migration) =>
        changeManagementWeeks(
          migration.seats,
          levelToUnit(migration.recommendation.entry.trainingSensitivity),
        ),
      ),
    );

    const floorBinds = floorWeeks > capacityWeeks.max;

    if (floorBinds) {
      phaseNotes.push(
        rationale({
          code: "schedule.paced_by_people_not_capacity",
          severity: "note",
          params: {
            weeks: floorWeeks,
            seats: Math.max(0, ...seatsInPhase),
          },
          evidence: [
            {
              field: "operating.adminCapacity",
              value: assessment.input.operating.adminCapacity,
            },
          ],
        }),
      );
    } else if (capacityWeeks.max > 0) {
      phaseNotes.push(
        rationale({
          code: "schedule.paced_by_available_admin_time",
          params: {
            days: phaseCapacity.days.max,
            availableDays: Math.round(weeklyCapacity * WORKING_WEEKS_PER_YEAR),
          },
          evidence: [
            {
              field: "operating.adminCapacity",
              value: assessment.input.operating.adminCapacity,
            },
          ],
        }),
      );
    }

    const weeks = {
      min: Math.max(capacityWeeks.min, floorWeeks),
      max: Math.max(capacityWeeks.max, floorWeeks),
    };

    const startMonth = Math.round(cursorMid / WEEKS_PER_MONTH);
    cursorMin += weeks.min;
    cursorMax += weeks.max;
    cursorMid += (weeks.min + weeks.max) / 2;

    return {
      phase: phaseCapacity.phase,
      startMonth,
      endMonth: Math.max(startMonth + 1, Math.ceil(cursorMid / WEEKS_PER_MONTH)),
      months: {
        min: Math.max(1, Math.ceil(weeks.min / WEEKS_PER_MONTH)),
        max: Math.max(1, Math.ceil(weeks.max / WEEKS_PER_MONTH)),
      },
      floorBinds,
      notes: phaseNotes,
    };
  });

  const horizonMonths = {
    min: Math.max(1, Math.ceil(cursorMin / WEEKS_PER_MONTH)),
    max: Math.max(1, Math.ceil(cursorMax / WEEKS_PER_MONTH)),
  };

  /**
   * Whether this is a schedule at all.
   *
   * When the plan needs more days than the organization has in a year, the
   * elapsed figure stops being a timeframe and becomes a restatement of the
   * capacity gap in months. The report has to lead with that rather than with a
   * number, because "37 Monate" reads as a plan and "mehr als Sie in einem Jahr
   * leisten können" reads as the decision it actually is.
   */
  const exceedsCapacity = capacity.total.min > capacity.availablePerYear.max;

  // Said once, at the top, because a horizon is the figure most likely to be
  // quoted back and the least likely to be read with its caveat attached.
  notes.push(
    rationale({
      code: "schedule.phases_run_in_sequence",
      params: { min: horizonMonths.min, max: horizonMonths.max },
    }),
  );

  if (exceedsCapacity) {
    notes.push(
      rationale({
        code: "schedule.horizon_reflects_a_capacity_gap",
        severity: "caution",
        params: {
          months: horizonMonths.max,
          days: capacity.total.min,
          availableDays: capacity.availablePerYear.max,
        },
        evidence: [
          {
            field: "operating.adminCapacity",
            value: assessment.input.operating.adminCapacity,
          },
        ],
      }),
    );
  }

  if (phases.some((phase) => phase.floorBinds)) {
    notes.push(
      rationale({
        code: "schedule.more_admin_time_would_not_shorten_this",
        severity: "note",
      }),
    );
  }

  return { phases, horizonMonths, exceedsCapacity, notes };
}
