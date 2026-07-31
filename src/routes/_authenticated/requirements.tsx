import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { importRequirements } from "@/lib/platform.functions";
import { requirementsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/requirements")({
  head: () => ({
    meta: [
      { title: "Requirements master list — Paris Standard Evaluation" },
      {
        name: "description",
        content: "Import and review the Paris Declaration requirements master list used in assessments.",
      },
      { property: "og:title", content: "Requirements master list — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Upload the requirements CSV that drives every organization assessment.",
      },
    ],
  }),
  component: RequirementsPage,
});

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function RequirementsPage() {
  const queryClient = useQueryClient();
  const requirements = useQuery(requirementsQuery());
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const index = (name: string) => header.indexOf(name);
      const payload = rows.map((cells) => {
        const get = (name: string) => {
          const i = index(name);
          return i >= 0 ? (cells[i] ?? "").trim() : "";
        };
        const weight = get("weight");
        return {
          level: get("level") || "Level 1",
          process_clause: get("process_clause") || get("clause") || "General",
          process_focus: get("process_focus") || null,
          requirement_ref: get("requirement_ref") || get("ref"),
          principle: get("principle") || "General",
          paris_source: get("paris_source") || null,
          requirement_text: get("requirement_text") || get("requirement"),
          weight: weight ? Number(weight) : null,
        };
      });
      const result = await importRequirements({ data: { rows: payload } });
      await queryClient.invalidateQueries();
      toast.success(`Imported ${result.imported} requirements`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Requirements"
      breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Requirements" }]}
    >
      <div className="rounded-lg border border-border bg-card p-6 shadow-panel">
        <h2 className="text-sm font-semibold">Import master list (CSV)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Columns: level, process_clause, process_focus, requirement_ref, principle, paris_source,
          requirement_text, weight.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          className="mt-4 block w-full max-w-md cursor-pointer rounded-md border border-border bg-background p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          {busy ? "Importing…" : `${requirements.data?.length ?? 0} requirements currently loaded.`}
        </p>
      </div>

      {(requirements.data?.length ?? 0) > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-panel">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Ref</th>
                <th className="px-4 py-2.5 font-medium">Level</th>
                <th className="px-4 py-2.5 font-medium">Principle</th>
                <th className="px-4 py-2.5 font-medium">Process clause</th>
                <th className="px-4 py-2.5 font-medium">Requirement</th>
              </tr>
            </thead>
            <tbody>
              {(requirements.data ?? []).map((req) => (
                <tr key={req.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium text-primary">
                    {req.requirement_ref}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{req.level}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{req.principle}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{req.process_clause}</td>
                  <td className="px-4 py-2.5">{req.requirement_text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
