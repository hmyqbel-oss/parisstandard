import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const orgSchema = z.object({
  name: z.string().min(2).max(200),
  sector: z.string().max(120).optional().nullable(),
  contact_name: z.string().max(120).optional().nullable(),
  contact_email: z.string().email().max(200).optional().nullable(),
  contact_phone: z.string().max(60).optional().nullable(),
  login_email: z.string().email().max(200),
  login_password: z.string().min(8).max(128),
});

const requirementsSchema = z.object({
  rows: z
    .array(
      z.object({
        level: z.string().min(1).max(40),
        process_clause: z.string().min(1).max(200),
        process_focus: z.string().max(300).optional().nullable(),
        requirement_ref: z.string().min(1).max(60),
        principle: z.string().min(1).max(200),
        paris_source: z.string().max(500).optional().nullable(),
        requirement_text: z.string().min(1).max(4000),
        weight: z.number().nullable().optional(),
      }),
    )
    .min(1)
    .max(500),
});

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orgSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isConsultant } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "consultant",
    });
    if (!isConsultant) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.login_email,
      password: data.login_password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (authError || !created.user) {
      const raw = authError?.message ?? "Could not create login";
      const friendly = /already been registered|already exists/i.test(raw)
        ? "This login email is already in use. Use a different email address."
        : raw;
      return { ok: false as const, error: friendly };
    }


    const userId = created.user.id;

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: data.name,
        sector: data.sector ?? null,
        contact_name: data.contact_name ?? null,
        contact_email: data.contact_email ?? null,
        contact_phone: data.contact_phone ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (orgError || !org) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(orgError?.message ?? "Could not create organization");
    }

    await supabaseAdmin.from("profiles").insert({
      id: userId,
      email: data.login_email,
      full_name: data.contact_name ?? data.name,
      organization_id: org.id,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "organization" });

    const { data: cycle, error: cycleError } = await supabaseAdmin
      .from("assessment_cycles")
      .insert({ organization_id: org.id, status: "draft" })
      .select("id")
      .single();
    if (cycleError || !cycle) throw new Error(cycleError?.message ?? "Could not start cycle");

    const { data: requirements } = await supabaseAdmin.from("requirements").select("id");
    if (requirements?.length) {
      await supabaseAdmin.from("responses").insert(
        requirements.map((r) => ({ cycle_id: cycle.id, requirement_id: r.id })),
      );
    }

    return { organizationId: org.id, cycleId: cycle.id, requirementCount: requirements?.length ?? 0 };
  });

export const registerConsultant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true });

    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (existing?.length) return { role: existing[0]!.role };

    // The very first account to sign up becomes the consultant/admin.
    if ((count ?? 0) > 0) throw new Error("Accounts are created by the consultant");

    const email = (context.claims["email"] as string | undefined) ?? null;
    await supabaseAdmin.from("profiles").insert({ id: context.userId, email });
    await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "consultant" });
    return { role: "consultant" as const };
  });

export const importRequirements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => requirementsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isConsultant } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "consultant",
    });
    if (!isConsultant) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rows = data.rows.map((row, index) => ({
      level: row.level,
      process_clause: row.process_clause,
      process_focus: row.process_focus ?? null,
      requirement_ref: row.requirement_ref,
      principle: row.principle,
      paris_source: row.paris_source ?? null,
      requirement_text: row.requirement_text,
      weight: row.weight ?? null,
      sort_order: index,
    }));

    const { error } = await supabaseAdmin
      .from("requirements")
      .upsert(rows, { onConflict: "requirement_ref" });
    if (error) throw new Error(error.message);

    // Backfill response rows for every open cycle so new requirements appear.
    const { data: cycles } = await supabaseAdmin
      .from("assessment_cycles")
      .select("id")
      .neq("status", "approved");
    const { data: allRequirements } = await supabaseAdmin.from("requirements").select("id");
    if (cycles?.length && allRequirements?.length) {
      const pending = cycles.flatMap((c) =>
        allRequirements.map((r) => ({ cycle_id: c.id, requirement_id: r.id })),
      );
      await supabaseAdmin
        .from("responses")
        .upsert(pending, { onConflict: "cycle_id,requirement_id", ignoreDuplicates: true });
    }

    return { imported: rows.length };
  });
