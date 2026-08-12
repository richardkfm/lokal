import { NextResponse } from "next/server";
import { assessmentInputSchema } from "@/domain/intake";
import { saveAssessment } from "@/lib/assessments";

/**
 * Accepts a completed assessment and returns the id its report lives under.
 *
 * The wizard runs entirely in the browser; this is the only point at which
 * anything is sent to the server. There is no account, no session and no
 * partial-save endpoint.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = assessmentInputSchema.safeParse(body);
  if (!parsed.success) {
    // Field-level issues go back so the wizard can point at the step that needs
    // attention rather than showing a generic failure.
    return NextResponse.json(
      {
        error: "invalid_assessment",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  const id = await saveAssessment(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}
