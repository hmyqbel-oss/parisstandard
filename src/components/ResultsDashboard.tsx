import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Download, Printer } from "lucide-react";
import { buildReportCsv, downloadCsv, slugify } from "@/lib/report-export";

import {
  SCORE_LABELS,
  average,
  groupBy,
  scoreLabel,
  type Requirement,
  type ResponseRow,
} from "@/lib/scoring";
import { Button } from "@/components/ui/button";

export function ResultsDashboard({
  organizationName,
  requirements,
  responses,
}: {
  organizationName: string;
  requirements: Requirement[];
  responses: ResponseRow[];
}) {
  const byRequirement = useMemo(
    () => new Map(responses.map((r) => [r.requirement_id, r])),
    [responses],
  );

  const scored = useMemo(
    () =>
      requirements
        .map((req) => ({ req, res: byRequirement.get(req.id) }))
        .filter((row) => row.res && row.res.applicable !== "no" && row.res.score !== null) as {
        req: Requirement;
        res: ResponseRow;
      }[],
    [requirements, byRequirement],
  );

  const overall = average(scored.map((s) => s.res.score as number));

  const principleData = useMemo(
    () =>
      [...groupBy(scored, (s) => s.req.principle).entries()].map(([principle, rows]) => ({
        name: principle,
        score: Number(average(rows.map((r) => r.res.score as number)).toFixed(2)),
      })),
    [scored],
  );

  const clauseData = useMemo(
    () =>
      [...groupBy(scored, (s) => s.req.process_clause).entries()].map(([clause, rows]) => ({
        name: clause,
        score: Number(average(rows.map((r) => r.res.score as number)).toFixed(2)),
      })),
    [scored],
  );

  const levelData = useMemo(
    () =>
      [...groupBy(scored, (s) => s.req.level).entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([level, rows]) => ({
          name: level,
          score: Number(average(rows.map((r) => r.res.score as number)).toFixed(2)),
        })),
    [scored],
  );

  const distribution = SCORE_LABELS.map((label, value) => ({
    label,
    value,
    count: scored.filter((s) => s.res.score === value).length,
  }));
  const notApplicable = requirements.length - scored.length;

  return (
    <div className="space-y-6">
      <div className="print-only hidden border-b border-border pb-4">
        <h1 className="text-xl font-semibold">Paris Standard — Assessment Report</h1>
        <p className="text-sm text-muted-foreground">
          {organizationName} · Generated {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="rounded-lg border border-border bg-card p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Overall maturity
          </p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-6xl font-semibold tabular-nums tracking-tight text-primary">
              {overall.toFixed(2)}
            </span>
            <span className="pb-2 text-lg text-muted-foreground">/ 3</span>
          </div>
          <p className="mt-1 text-sm font-medium">
            {scoreLabel(Math.round(overall))} overall
          </p>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${(overall / 3) * 100}%` }}
            />
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Requirements scored</dt>
              <dd className="font-medium tabular-nums">{scored.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Marked not applicable</dt>
              <dd className="font-medium tabular-nums">{notApplicable}</dd>
            </div>
          </dl>
          <div className="no-print mt-5 grid gap-2">
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Download PDF report
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  `paris-assessment-${slugify(organizationName)}.csv`,
                  buildReportCsv({ organizationName, requirements, responses }),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Download data (CSV / Excel)
            </Button>
          </div>

        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
          <h3 className="text-sm font-semibold">Maturity by principle</h3>
          <p className="text-xs text-muted-foreground">Average score per Paris principle (0–3)</p>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={principleData} outerRadius="72%">
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <PolarRadiusAxis domain={[0, 3]} tick={{ fontSize: 10 }} stroke="var(--color-border)" />
                <Radar
                  name="Average score"
                  dataKey="score"
                  stroke="var(--color-chart-1)"
                  fill="var(--color-chart-1)"
                  fillOpacity={0.35}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
          <h3 className="text-sm font-semibold">Maturity by process clause</h3>
          <div className="mt-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clauseData} layout="vertical" margin={{ left: 24, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" domain={[0, 3]} tick={{ fontSize: 11 }} label={{ value: "Average score", position: "insideBottom", offset: -2, fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="score" name="Average score" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
            <h3 className="text-sm font-semibold">Level 1 vs Level 2</h3>
            <div className="mt-3 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelData}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 3]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="score" name="Average score" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
            <h3 className="text-sm font-semibold">Score level distribution</h3>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 font-medium">Level</th>
                  <th className="py-2 text-right font-medium">Requirements</th>
                </tr>
              </thead>
              <tbody>
                {distribution.map((row) => (
                  <tr key={row.label} className="border-b border-border/60 last:border-0">
                    <td className="py-2">
                      {row.value} · {row.label}
                    </td>
                    <td className="py-2 text-right tabular-nums">{row.count}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 text-muted-foreground">Not applicable</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {notApplicable}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-panel">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Detailed results — {organizationName}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Ref</th>
                <th className="px-4 py-2.5 font-medium">Requirement</th>
                <th className="px-4 py-2.5 font-medium">Score</th>
                <th className="px-4 py-2.5 font-medium">Evidence</th>
                <th className="px-4 py-2.5 font-medium">Improvement action</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => {
                const res = byRequirement.get(req.id);
                return (
                  <tr key={req.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">
                      {req.requirement_ref}
                    </td>
                    <td className="px-4 py-3 leading-relaxed">{req.requirement_text}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {scoreLabel(res?.score, res?.applicable ?? "yes")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {res?.evidence_reviewed || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {res?.improvement_action || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
