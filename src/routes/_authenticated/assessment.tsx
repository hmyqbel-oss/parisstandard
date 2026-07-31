import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AssessmentBoard } from "@/components/AssessmentBoard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cycleDataQuery, cycleForOrganizationQuery, requirementsQuery } from "@/lib/queries";
import { isComplete, type ResponseRow } from "@/lib/scoring";

export const Route = createFileRoute("/_authenticated/assessment")({
  head: () => ({
    meta: [
      { title: "My assessment — Paris Standard Evaluation" },
      {
        name: "description",
        content: "Complete the Paris Declaration self-assessment, attach evidence and submit for review.",
      },
      { property: "og:title", content: "My assessment — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Score each requirement, upload evidence and track consultant feedback.",
      },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const requirements = useQuery(requirementsQuery());
  const cycle = useQuery(cycleForOrganizationQuery(me?.organizationId));
  const cycleId = cycle.data?.id ?? null;
  const cycleData = useQuery(cycleDataQuery(cycleId));

  const status = cycle.data?.status;
  const editable = status === "draft" || status === "returned";
  const responses = cycleData.data?.responses ?? [];
  const reqs = requirements.data ?? [];
  const byRequirement = new Map(responses.map((r) => [r.requirement_id, r]));
  const completed = reqs.filter((r) => isComplete(byRequirement.get(r.id))).length;

  async function saveResponse(responseId: string, patch: Partial<ResponseRow>) {
    const { error } = await supabase.from("responses").update(patch).eq("id", responseId);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["cycle-data", cycleId] });
  }

  async function submit() {
    if (!cycleId) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("assessment_cycles")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", cycleId);
      if (error) throw error;
      await queryClient.invalidateQueries();
      toast.success("Assessment submitted for review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="My assessment"
      actions={
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {editable && (
            <Button size="sm" disabled={busy || completed < reqs.length || !reqs.length} onClick={submit}>
              {completed < reqs.length
                ? `${reqs.length - completed} left to complete`
                : busy
                  ? "Submitting…"
                  : "Submit for review"}
            </Button>
          )}
        </div>
      }
    >
      {requirements.isLoading || cycle.isLoading || cycleData.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading assessment…</p>
      ) : !cycle.data ? (
        <p className="text-sm text-muted-foreground">
          No assessment cycle has been created for your organization yet.
        </p>
      ) : (
        <AssessmentBoard
          mode={editable ? "edit" : "readonly"}
          requirements={reqs}
          responses={responses}
          notes={cycleData.data?.notes ?? []}
          evidence={cycleData.data?.evidence ?? []}
          organizationId={me?.organizationId ?? ""}
          onSaveResponse={saveResponse}
          onEvidenceChanged={() =>
            queryClient.invalidateQueries({ queryKey: ["cycle-data", cycleId] })
          }
        />
      )}
    </AppShell>
  );
}
