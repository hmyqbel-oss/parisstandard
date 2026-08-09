import { average, scoreLabel, type Requirement, type ResponseRow } from "@/lib/scoring";

function escapeCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildReportCsv({
  organizationName,
  requirements,
  responses,
}: {
  organizationName: string;
  requirements: Requirement[];
  responses: ResponseRow[];
}) {
  const byRequirement = new Map(responses.map((r) => [r.requirement_id, r]));
  const scored = requirements
    .map((req) => byRequirement.get(req.id))
    .filter((res) => res && res.applicable !== "no" && res.score !== null) as ResponseRow[];
  const overall = average(scored.map((r) => r.score as number));

  const rows: unknown[][] = [
    ["Paris Standard — Assessment Report"],
    ["Organization", organizationName],
    ["Generated", new Date().toLocaleString()],
    ["Overall maturity (0-3)", overall.toFixed(2)],
    ["Requirements scored", scored.length],
    ["Marked not applicable", requirements.length - scored.length],
    [],
    [
      "Ref",
      "Level",
      "Process clause",
      "Process focus",
      "Principle",
      "Requirement",
      "Applicable",
      "Score",
      "Score label",
      "Evidence reviewed",
      "Evaluator comment",
      "Improvement action",
    ],
  ];

  for (const req of requirements) {
    const res = byRequirement.get(req.id);
    rows.push([
      req.requirement_ref,
      req.level,
      req.process_clause,
      req.process_focus ?? "",
      req.principle,
      req.requirement_text,
      res?.applicable === "no" ? "No" : "Yes",
      res?.applicable === "no" ? "" : (res?.score ?? ""),
      scoreLabel(res?.score, res?.applicable ?? "yes"),
      res?.evidence_reviewed ?? "",
      res?.evaluator_comment ?? "",
      res?.improvement_action ?? "",
    ]);
  }

  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function downloadCsv(fileName: string, csv: string) {
  // BOM keeps Arabic text readable when opened in Excel
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function slugify(value: string) {
  return (
    value
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "report"
  );
}
