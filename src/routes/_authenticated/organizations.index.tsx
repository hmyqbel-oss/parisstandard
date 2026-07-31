import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cyclesQuery, organizationsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/organizations/")({
  head: () => ({
    meta: [
      { title: "Organizations — Paris Standard Evaluation" },
      {
        name: "description",
        content: "Manage evaluated organizations, their contacts and their assessment cycles.",
      },
      { property: "og:title", content: "Organizations — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Create organization accounts and open their Paris Declaration assessments.",
      },
    ],
  }),
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const orgs = useQuery(organizationsQuery());
  const cycles = useQuery(cyclesQuery());
  const latestByOrg = new Map((cycles.data ?? []).map((c) => [c.organization_id, c]));

  return (
    <AppShell
      title="Organizations"
      breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Organizations" }]}
      actions={
        <Button asChild size="sm">
          <Link to="/organizations/new">New organization</Link>
        </Button>
      }
    >
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-panel">
        {orgs.isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (orgs.data?.length ?? 0) === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No organizations yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Organization</th>
                <th className="px-5 py-2.5 font-medium">Sector</th>
                <th className="px-5 py-2.5 font-medium">Contact</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {(orgs.data ?? []).map((org) => (
                <tr key={org.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{org.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{org.sector || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <div>{org.contact_name || "—"}</div>
                    <div className="text-xs">{org.contact_email || ""}</div>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={latestByOrg.get(org.id)?.status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/organizations/$id" params={{ id: org.id }}>
                        Open
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
