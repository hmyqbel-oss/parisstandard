import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { StatusBadge } from "@/components/StatusBadge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cycleDataQuery, cycleForOrganizationQuery, requirementsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/results")({
  head: () => ({
    meta: [
      { title: "Results — Paris Standard Evaluation" },
      {
        name: "description",
        content: "Maturity dashboard for the approved Paris Declaration assessment cycle.",
      },
      { property: "og:title", content: "Results — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Overall maturity, principle radar and process clause breakdown.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { data: me } = useCurrentUser();
  const requirements = useQuery(requirementsQuery());
  const cycle = useQuery(cycleForOrganizationQuery(me?.organizationId));
  const cycleData = useQuery(cycleDataQuery(cycle.data?.id ?? null));

  return (
    <AppShell title="Results" actions={<StatusBadge status={cycle.data?.status} />}>
      {cycle.isLoading || requirements.isLoading || cycleData.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading results…</p>
      ) : cycle.data?.status !== "approved" ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-panel">
          <p className="text-sm font-semibold">Results are published after approval</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Once your consultant approves the submitted assessment, your maturity dashboard appears
            here.
          </p>
        </div>
      ) : (
        <ResultsDashboard
          organizationName={me?.fullName ?? "Your organization"}
          requirements={requirements.data ?? []}
          responses={cycleData.data?.responses ?? []}
        />
      )}
    </AppShell>
  );
}
