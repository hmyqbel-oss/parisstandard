import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cyclesQuery, organizationsQuery, requirementsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Consultant dashboard — Paris Standard Evaluation" },
      {
        name: "description",
        content: "Overview of every evaluated organization, assessment status and review queue.",
      },
      { property: "og:title", content: "Consultant dashboard — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Track submissions, reviews and approvals across all grantee organizations.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const orgs = useQuery(organizationsQuery());
  const cycles = useQuery(cyclesQuery());
  const requirements = useQuery(requirementsQuery());

  const latestByOrg = new Map((cycles.data ?? []).map((c) => [c.organization_id, c]));
  const list = orgs.data ?? [];
  const awaiting = list.filter((o) => {
    const s = latestByOrg.get(o.id)?.status;
    return s === "submitted" || s === "under_review";
  }).length;
  const approved = list.filter((o) => latestByOrg.get(o.id)?.status === "approved").length;

  const stats = [
    { label: "Organizations", value: list.length, icon: Building2 },
    { label: "Awaiting review", value: awaiting, icon: Clock },
    { label: "Approved", value: approved, icon: CheckCircle2 },
    { label: "Requirements loaded", value: requirements.data?.length ?? 0, icon: ClipboardList },
  ];

  return (
    <AppShell
      title="Dashboard"
      actions={
        <Button asChild size="sm">
          <Link to="/organizations/new">New organization</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {!requirements.isLoading && (requirements.data?.length ?? 0) === 0 && (
        <div className="mt-6 rounded-lg border border-status-returned/40 bg-status-returned/8 p-5">
          <p className="text-sm font-semibold">No requirements imported yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Import the Paris requirements master list before creating organizations, so each new
            assessment is populated with all requirement rows.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link to="/requirements">Import requirements</Link>
          </Button>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-panel">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Assessment status</h2>
        </div>
        {list.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No organizations yet. Create the first organization account to begin.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Organization</th>
                <th className="px-5 py-2.5 font-medium">Sector</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Submitted</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {list.map((org) => {
                const cycle = latestByOrg.get(org.id);
                return (
                  <tr key={org.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium">{org.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{org.sector || "—"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={cycle?.status} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {cycle?.submitted_at
                        ? new Date(cycle.submitted_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/organizations/$id" params={{ id: org.id }}>
                          Open
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
