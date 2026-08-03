import { useMemo, useState } from "react";
import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AssessmentBoard } from "@/components/AssessmentBoard";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  cycleDataQuery,
  cycleForOrganizationQuery,
  organizationsQuery,
  requirementsQuery,
} from "@/lib/queries";
import {
  createAssessmentCycle,
  deleteAssessmentCycle,
  deleteOrganization,
} from "@/lib/platform.functions";
import type { ResponseRow } from "@/lib/scoring";


export const Route = createFileRoute("/_authenticated/organizations/$id")({
  head: () => ({
    meta: [
      { title: "Organization review — Paris Standard Evaluation" },
      {
        name: "description",
        content: "Review a submitted Paris Declaration assessment, add notes, approve or return it.",
      },
      { property: "og:title", content: "Organization review — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Consultant review workspace for a single organization's assessment cycle.",
      },
    ],
  }),
  component: OrganizationDetailPage,
});

function OrganizationDetailPage() {
  const { id } = useParams({ from: "/_authenticated/organizations/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"assessment" | "results">("assessment");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [generalNote, setGeneralNote] = useState("");

  const orgs = useQuery(organizationsQuery());
  const requirements = useQuery(requirementsQuery());
  const cycle = useQuery(cycleForOrganizationQuery(id));
  const cycleId = cycle.data?.id ?? null;
  const cycleData = useQuery(cycleDataQuery(cycleId));

  const organization = useMemo(() => orgs.data?.find((o) => o.id === id), [orgs.data, id]);
  const status = cycle.data?.status;

  async function saveResponse(responseId: string, patch: Partial<ResponseRow>) {
    const { error } = await supabase.from("responses").update(patch).eq("id", responseId);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["cycle-data", cycleId] });
  }

  async function saveNotes() {
    if (!cycleId) return;
    const rows = [
      ...Object.entries(noteDrafts)
        .filter(([, text]) => text.trim())
        .map(([requirementId, text]) => ({
          cycle_id: cycleId,
          requirement_id: requirementId,
          note_text: text.trim(),
        })),
      ...(generalNote.trim()
        ? [{ cycle_id: cycleId, requirement_id: null, note_text: generalNote.trim() }]
        : []),
    ];
    if (!rows.length) return;
    const { error } = await supabase.from("review_notes").insert(rows);
    if (error) throw error;
    setNoteDrafts({});
    setGeneralNote("");
  }

  async function setStatus(next: "under_review" | "approved" | "returned") {
    if (!cycleId) return;
    try {
      await saveNotes();
      const { error } = await supabase
        .from("assessment_cycles")
        .update({
          status: next,
          reviewed_at: next === "under_review" ? null : new Date().toISOString(),
        })
        .eq("id", cycleId);
      if (error) throw error;
      await queryClient.invalidateQueries();
      toast.success(
        next === "approved"
          ? "Assessment approved"
          : next === "returned"
            ? "Returned to the organization"
            : "Marked as under review",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the cycle");
    }
  }

  async function removeCycle() {
    if (!cycleId) return;
    if (!window.confirm("Delete this assessment with all answers and evidence?")) return;
    try {
      const result = await deleteAssessmentCycle({ data: { cycleId } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await queryClient.invalidateQueries();
      toast.success("Assessment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the assessment");
    }
  }

  async function startNewCycle() {
    try {
      const result = await createAssessmentCycle({ data: { organizationId: id } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await queryClient.invalidateQueries();
      toast.success("New assessment assigned to this organization");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start a new assessment");
    }
  }


  async function removeOrganization() {
    if (
      !window.confirm(
        `Delete "${organization?.name ?? "this organization"}" with its assessments, evidence and user accounts?`,
      )
    )
      return;
    try {
      const result = await deleteOrganization({ data: { organizationId: id } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await queryClient.invalidateQueries();
      toast.success("Organization deleted");
      navigate({ to: "/organizations", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the organization");
    }
  }


  const loading = requirements.isLoading || cycle.isLoading || cycleData.isLoading;

  return (
    <AppShell
      title={organization?.name ?? "Organization"}
      breadcrumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Organizations", to: "/organizations" },
        { label: organization?.name ?? "Organization" },
      ]}
      actions={<StatusBadge status={status} />}
    >
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border bg-card p-1">
          {(["assessment", "results"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {status === "submitted" && (
            <Button size="sm" variant="outline" onClick={() => setStatus("under_review")}>
              Start review
            </Button>
          )}
          {(status === "submitted" || status === "under_review") && (
            <>
              <Button size="sm" variant="outline" onClick={() => setStatus("returned")}>
                Return for revision
              </Button>
              <Button size="sm" onClick={() => setStatus("approved")}>
                Approve
              </Button>
            </>
          )}
          {cycleId ? (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={removeCycle}
            >
              Delete assessment
            </Button>
          ) : (
            !cycle.isLoading && (
              <Button size="sm" onClick={startNewCycle}>
                Assign new assessment
              </Button>
            )
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={removeOrganization}
          >
            Delete organization
          </Button>
        </div>

      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading assessment…</p>
      ) : !cycle.data ? (
        <p className="text-sm text-muted-foreground">This organization has no assessment cycle.</p>
      ) : tab === "assessment" ? (
        <div className="space-y-5">
          <AssessmentBoard
            mode={status === "submitted" || status === "under_review" ? "review" : "readonly"}
            requirements={requirements.data ?? []}
            responses={cycleData.data?.responses ?? []}
            notes={cycleData.data?.notes ?? []}
            evidence={cycleData.data?.evidence ?? []}
            organizationId={id}
            noteDrafts={noteDrafts}
            onNoteDraftChange={(requirementId, value) =>
              setNoteDrafts((prev) => ({ ...prev, [requirementId]: value }))
            }
            onSaveResponse={saveResponse}
          />
          {(status === "submitted" || status === "under_review") && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
              <h3 className="text-sm font-semibold">General feedback</h3>
              <Textarea
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                placeholder="Overall observations shared with the organization when you approve or return this cycle."
                className="mt-3"
                rows={4}
              />
            </div>
          )}
        </div>
      ) : (
        <ResultsDashboard
          organizationName={organization?.name ?? "Organization"}
          requirements={requirements.data ?? []}
          responses={cycleData.data?.responses ?? []}
        />
      )}
    </AppShell>
  );
}
