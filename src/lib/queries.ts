import { supabase } from "@/integrations/supabase/client";
import type { CycleStatus, Requirement, ResponseRow } from "@/lib/scoring";
import type { EvidenceFile, ReviewNote } from "@/components/AssessmentBoard";

export type Cycle = {
  id: string;
  organization_id: string;
  status: CycleStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
};

export function requirementsQuery() {
  return {
    queryKey: ["requirements"],
    queryFn: async (): Promise<Requirement[]> => {
      const { data, error } = await supabase
        .from("requirements")
        .select(
          "id, level, process_clause, process_focus, requirement_ref, principle, paris_source, requirement_text, weight, sort_order",
        )
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  };
}

export function organizationsQuery() {
  return {
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, sector, contact_name, contact_email, contact_phone, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  };
}

export function cyclesQuery() {
  return {
    queryKey: ["cycles"],
    queryFn: async (): Promise<Cycle[]> => {
      const { data, error } = await supabase
        .from("assessment_cycles")
        .select("id, organization_id, status, submitted_at, reviewed_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Cycle[];
    },
  };
}

export function cycleForOrganizationQuery(organizationId: string | null | undefined) {
  return {
    queryKey: ["cycle", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Cycle | null> => {
      const { data, error } = await supabase
        .from("assessment_cycles")
        .select("id, organization_id, status, submitted_at, reviewed_at, updated_at")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Cycle | null) ?? null;
    },
  };
}

export function cycleDataQuery(cycleId: string | null | undefined) {
  return {
    queryKey: ["cycle-data", cycleId],
    enabled: Boolean(cycleId),
    queryFn: async (): Promise<{
      responses: ResponseRow[];
      notes: ReviewNote[];
      evidence: EvidenceFile[];
    }> => {
      const [responsesResult, notesResult] = await Promise.all([
        supabase
          .from("responses")
          .select(
            "id, cycle_id, requirement_id, applicable, score, evidence_reviewed, evaluator_comment, improvement_action",
          )
          .eq("cycle_id", cycleId!),
        supabase
          .from("review_notes")
          .select("id, requirement_id, note_text, created_at")
          .eq("cycle_id", cycleId!)
          .order("created_at", { ascending: true }),
      ]);
      if (responsesResult.error) throw responsesResult.error;
      if (notesResult.error) throw notesResult.error;

      const responses = (responsesResult.data ?? []) as ResponseRow[];
      let evidence: EvidenceFile[] = [];
      if (responses.length) {
        const { data, error } = await supabase
          .from("evidence_files")
          .select("id, response_id, file_name, file_path")
          .in(
            "response_id",
            responses.map((r) => r.id),
          );
        if (error) throw error;
        evidence = data ?? [];
      }
      return { responses, notes: notesResult.data ?? [], evidence };
    },
  };
}
