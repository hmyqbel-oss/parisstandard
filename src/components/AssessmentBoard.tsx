import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Paperclip, Trash2, Upload, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  SCORE_LABELS,
  groupBy,
  isComplete,
  scoreLabel,
  type Requirement,
  type ResponseRow,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export type ReviewNote = {
  id: string;
  requirement_id: string | null;
  note_text: string;
  created_at: string;
};

export type EvidenceFile = {
  id: string;
  response_id: string;
  file_name: string;
  file_path: string;
};

type Mode = "edit" | "review" | "readonly";

const ACCEPTED = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png";

export function AssessmentBoard({
  mode,
  requirements,
  responses,
  notes,
  evidence,
  organizationId,
  noteDrafts,
  onNoteDraftChange,
  onSaveResponse,
  onEvidenceChanged,
}: {
  mode: Mode;
  requirements: Requirement[];
  responses: ResponseRow[];
  notes: ReviewNote[];
  evidence: EvidenceFile[];
  organizationId: string;
  noteDrafts?: Record<string, string> | undefined;
  onNoteDraftChange?: ((requirementId: string, value: string) => void) | undefined;
  onSaveResponse?: ((responseId: string, patch: Partial<ResponseRow>) => void) | undefined;
  onEvidenceChanged?: (() => void) | undefined;
}) {
  const [groupMode, setGroupMode] = useState<"principle" | "clause" | "level">("principle");
  const responseByRequirement = useMemo(
    () => new Map(responses.map((r) => [r.requirement_id, r])),
    [responses],
  );
  const notesByRequirement = useMemo(
    () => groupBy(notes.filter((n) => n.requirement_id), (n) => n.requirement_id as string),
    [notes],
  );

  const completed = requirements.filter((req) =>
    isComplete(responseByRequirement.get(req.id)),
  ).length;
  const total = requirements.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  const groups = useMemo(() => {
    const map = groupBy(requirements, (r) =>
      groupMode === "principle" ? r.principle : groupMode === "clause" ? r.process_clause : r.level,
    );
    return [...map.entries()];
  }, [requirements, groupMode]);

  return (
    <div className="space-y-4">
      <div className="no-print sticky top-[73px] z-10 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card/95 px-4 py-3 shadow-panel backdrop-blur">
        <div className="min-w-45 flex-1">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground">Completion</span>
            <span className="tabular-nums">
              {completed}/{total} completed
            </span>
          </div>
          <Progress value={percent} className="h-2 transition-all duration-500" />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5">
          {(["principle", "clause", "level"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setGroupMode(value)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-semibold transition-colors",
                groupMode === value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value === "principle"
                ? "By Principle"
                : value === "clause"
                  ? "By Process Clause"
                  : "By Level"}
            </button>
          ))}
        </div>
      </div>

      {groups.map(([groupName, items]) => (
        <GroupSection
          key={groupName}
          name={groupName}
          items={items}
          responseByRequirement={responseByRequirement}
          notesByRequirement={notesByRequirement}
          evidence={evidence}
          mode={mode}
          organizationId={organizationId}
          noteDrafts={noteDrafts}
          onNoteDraftChange={onNoteDraftChange}
          onSaveResponse={onSaveResponse}
          onEvidenceChanged={onEvidenceChanged}
        />
      ))}
    </div>
  );
}

function GroupSection({
  name,
  items,
  responseByRequirement,
  notesByRequirement,
  evidence,
  mode,
  organizationId,
  noteDrafts,
  onNoteDraftChange,
  onSaveResponse,
  onEvidenceChanged,
}: {
  name: string;
  items: Requirement[];
  responseByRequirement: Map<string, ResponseRow>;
  notesByRequirement: Map<string, ReviewNote[]>;
  evidence: EvidenceFile[];
  mode: Mode;
  organizationId: string;
  noteDrafts?: Record<string, string> | undefined;
  onNoteDraftChange?: ((requirementId: string, value: string) => void) | undefined;
  onSaveResponse?: ((responseId: string, patch: Partial<ResponseRow>) => void) | undefined;
  onEvidenceChanged?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(true);
  const done = items.filter((i) => isComplete(responseByRequirement.get(i.id))).length;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-panel">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/60"
      >
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", !open && "-rotate-90")}
        />
        <span className="flex-1 text-sm font-semibold">{name}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {done}/{items.length}
        </span>
      </button>
      {open && (
        <div className="divide-y divide-border border-t border-border">
          {items.map((req) => (
            <RequirementItem
              key={req.id}
              requirement={req}
              response={responseByRequirement.get(req.id)}
              notes={notesByRequirement.get(req.id) ?? []}
              evidence={evidence.filter(
                (e) => e.response_id === responseByRequirement.get(req.id)?.id,
              )}
              mode={mode}
              organizationId={organizationId}
              noteDraft={noteDrafts?.[req.id] ?? ""}
              onNoteDraftChange={onNoteDraftChange}
              onSaveResponse={onSaveResponse}
              onEvidenceChanged={onEvidenceChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RequirementItem({
  requirement,
  response,
  notes,
  evidence,
  mode,
  organizationId,
  noteDraft,
  onNoteDraftChange,
  onSaveResponse,
  onEvidenceChanged,
}: {
  requirement: Requirement;
  response: ResponseRow | undefined;
  notes: ReviewNote[];
  evidence: EvidenceFile[];
  mode: Mode;
  organizationId: string;
  noteDraft: string;
  onNoteDraftChange?: ((requirementId: string, value: string) => void) | undefined;
  onSaveResponse?: ((responseId: string, patch: Partial<ResponseRow>) => void) | undefined;
  onEvidenceChanged?: (() => void) | undefined;
}) {
  const editable = mode === "edit" && !!response;
  const complete = isComplete(response);
  const hasFeedback = notes.length > 0;
  const [uploading, setUploading] = useState(false);

  const stateBorder = hasFeedback
    ? "border-l-status-returned"
    : complete
      ? "border-l-status-approved"
      : "border-l-border";

  function save(patch: Partial<ResponseRow>) {
    if (response && onSaveResponse) onSaveResponse(response.id, patch);
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !response) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10MB`);
          continue;
        }
        // Storage keys only accept a safe ASCII subset; keep the real name in the DB row.
        const dot = file.name.lastIndexOf(".");
        const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
        const base = (dot > 0 ? file.name.slice(0, dot) : file.name)
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60);
        const safeName = `${base || "file"}${ext ? `.${ext}` : ""}`;
        const path = `${organizationId}/${response.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("evidence")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { error: rowError } = await supabase
          .from("evidence_files")
          .insert({ response_id: response.id, file_path: path, file_name: file.name });
        if (rowError) throw rowError;
      }
      onEvidenceChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(file: EvidenceFile) {
    await supabase.storage.from("evidence").remove([file.file_path]);
    await supabase.from("evidence_files").delete().eq("id", file.id);
    onEvidenceChanged?.();
  }

  async function openFile(file: EvidenceFile) {
    const { data, error } = await supabase.storage
      .from("evidence")
      .createSignedUrl(file.file_path, 120);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <article className={cn("border-l-4 px-5 py-5 transition-colors", stateBorder)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <span>{requirement.requirement_ref}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
              {requirement.level}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            {requirement.requirement_text}
          </p>
          {requirement.paris_source && (
            <p className="mt-1 text-xs text-muted-foreground">
              Paris source: {requirement.paris_source}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {scoreLabel(response?.score, response?.applicable ?? "yes")}
          </span>
        </div>
      </div>

      {hasFeedback && (
        <div className="mt-4 rounded-md border border-status-returned/40 bg-status-returned/8 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-status-returned">
            <MessageSquareWarning className="h-3.5 w-3.5" />
            Consultant feedback
          </p>
          <ul className="mt-2 space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="text-sm leading-relaxed">
                {note.note_text}
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Applicable</p>
            <div className="flex rounded-md border border-border bg-muted p-0.5">
              {["yes", "no"].map((value) => (
                <button
                  key={value}
                  disabled={!editable}
                  onClick={() => save({ applicable: value, ...(value === "no" ? { score: null } : {}) })}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs font-semibold capitalize transition-colors disabled:opacity-70",
                    (response?.applicable ?? "yes") === value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {(response?.applicable ?? "yes") === "yes" && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Maturity score</p>
              <div className="flex flex-wrap gap-1 rounded-md border border-border bg-muted p-0.5">
                {SCORE_LABELS.map((label, value) => (
                  <button
                    key={label}
                    disabled={!editable}
                    onClick={() => save({ score: value })}
                    className={cn(
                      "rounded px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-70",
                      response?.score === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value} · {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Evidence reviewed"
            value={response?.evidence_reviewed ?? ""}
            disabled={!editable}
            onCommit={(v) => save({ evidence_reviewed: v })}
          />
          <Field
            label="Improvement action"
            value={response?.improvement_action ?? ""}
            disabled={!editable}
            onCommit={(v) => save({ improvement_action: v })}
          />
          <Field
            label="Comment"
            value={response?.evaluator_comment ?? ""}
            disabled={!editable}
            onCommit={(v) => save({ evaluator_comment: v })}
            className="md:col-span-2"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Evidence source files</p>
          <div className="flex flex-wrap items-center gap-2">
            {evidence.map((file) => (
              <span
                key={file.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs"
              >
                <Paperclip className="h-3 w-3 text-muted-foreground" />
                <button onClick={() => openFile(file)} className="max-w-45 truncate hover:underline">
                  {file.file_name}
                </button>
                {editable && (
                  <button onClick={() => removeFile(file)} aria-label={`Remove ${file.file_name}`}>
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </span>
            ))}
            {!evidence.length && (
              <span className="text-xs text-muted-foreground">No files uploaded</span>
            )}
            {editable && (
              <label className="no-print inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <Upload className="h-3 w-3" />
                {uploading ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </label>
            )}
          </div>
        </div>

        {mode === "review" && (
          <div className="rounded-md border border-border bg-surface p-3">
            <p className="mb-1.5 text-xs font-semibold text-foreground">Add review note</p>
            <Textarea
              rows={2}
              value={noteDraft}
              placeholder="Explain what needs to change for this requirement…"
              onChange={(e) => onNoteDraftChange?.(requirement.id, e.target.value)}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  disabled,
  onCommit,
  className,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onCommit: (value: string) => void;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  const [lastExternal, setLastExternal] = useState(value);
  if (value !== lastExternal) {
    setLastExternal(value);
    setLocal(value);
  }

  // Autosave so a page refresh never loses typed text.
  useEffect(() => {
    if (disabled || local === value) return;
    const timer = setTimeout(() => onCommit(local), 900);
    return () => clearTimeout(timer);
  }, [local, value, disabled, onCommit]);

  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <Textarea
        rows={2}
        value={local}
        disabled={disabled}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onCommit(local);
        }}
      />
    </label>
  );
}

