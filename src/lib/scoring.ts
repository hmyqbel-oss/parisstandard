export const SCORE_LABELS = ["Not Evident", "Initial", "Established", "Mature"] as const;

export type CycleStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "returned";

export function scoreLabel(score: number | null | undefined, applicable = "yes") {
  if (applicable === "no") return "N/A";
  if (score === null || score === undefined) return "Not scored";
  return SCORE_LABELS[score] ?? "Not scored";
}

export const STATUS_META: Record<
  CycleStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-status-draft/12 text-status-draft border-status-draft/30" },
  submitted: {
    label: "Submitted",
    className: "bg-status-submitted/12 text-status-submitted border-status-submitted/30",
  },
  under_review: {
    label: "Under Review",
    className: "bg-status-review/15 text-status-review border-status-review/35",
  },
  approved: {
    label: "Approved",
    className: "bg-status-approved/12 text-status-approved border-status-approved/30",
  },
  returned: {
    label: "Returned",
    className: "bg-status-returned/12 text-status-returned border-status-returned/30",
  },
};

export type Requirement = {
  id: string;
  level: string;
  process_clause: string;
  process_focus: string | null;
  requirement_ref: string;
  principle: string;
  paris_source: string | null;
  requirement_text: string;
  weight: number | null;
  sort_order: number;
};

export type ResponseRow = {
  id: string;
  cycle_id: string;
  requirement_id: string;
  applicable: string;
  score: number | null;
  evidence_reviewed: string | null;
  evaluator_comment: string | null;
  improvement_action: string | null;
};

export function isComplete(r: ResponseRow | undefined) {
  if (!r) return false;
  if (r.applicable === "no") return true;
  return r.score !== null && r.score !== undefined;
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function groupBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}
