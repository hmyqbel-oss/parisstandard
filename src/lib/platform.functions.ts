import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const emailField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/, "Invalid email address");

const orgSchema = z.object({
  name: z.string().min(2).max(200),
  sector: z.string().max(120).optional().nullable(),
  contact_name: z.string().max(120).optional().nullable(),
  contact_email: emailField(200).optional().nullable(),
  contact_phone: z
    .string()
    .trim()
    .regex(/^05\d{8}$/, "Phone must be 10 digits starting with 05")
    .optional()
    .nullable(),
  login_email: emailField(200),
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
      return { ok: false as const, error: orgError?.message ?? "Could not create organization" };
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
    if (cycleError || !cycle) {
      return { ok: false as const, error: cycleError?.message ?? "Could not start cycle" };
    }

    const { data: requirements } = await supabaseAdmin.from("requirements").select("id");
    if (requirements?.length) {
      await supabaseAdmin.from("responses").insert(
        requirements.map((r) => ({ cycle_id: cycle.id, requirement_id: r.id })),
      );
    }

    return {
      ok: true as const,
      organizationId: org.id,
      cycleId: cycle.id,
      requirementCount: requirements?.length ?? 0,
    };

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

export const deleteAssessmentCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ cycleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isConsultant } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "consultant",
    });
    if (!isConsultant) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: responses } = await supabaseAdmin
      .from("responses")
      .select("id")
      .eq("cycle_id", data.cycleId);
    const responseIds = (responses ?? []).map((r) => r.id);

    if (responseIds.length) {
      const { data: files } = await supabaseAdmin
        .from("evidence_files")
        .select("file_path")
        .in("response_id", responseIds);
      const paths = (files ?? []).map((f) => f.file_path);
      if (paths.length) await supabaseAdmin.storage.from("evidence").remove(paths);
      await supabaseAdmin.from("evidence_files").delete().in("response_id", responseIds);
    }

    await supabaseAdmin.from("review_notes").delete().eq("cycle_id", data.cycleId);
    await supabaseAdmin.from("responses").delete().eq("cycle_id", data.cycleId);
    const { error } = await supabaseAdmin
      .from("assessment_cycles")
      .delete()
      .eq("id", data.cycleId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const createAssessmentCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ organizationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isConsultant } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "consultant",
    });
    if (!isConsultant) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cycle, error: cycleError } = await supabaseAdmin
      .from("assessment_cycles")
      .insert({ organization_id: data.organizationId })
      .select("id")
      .single();
    if (cycleError || !cycle) {
      return { ok: false as const, error: cycleError?.message ?? "Could not start assessment" };
    }

    const { data: requirements } = await supabaseAdmin.from("requirements").select("id");
    if (requirements?.length) {
      const { error } = await supabaseAdmin
        .from("responses")
        .insert(requirements.map((r) => ({ cycle_id: cycle.id, requirement_id: r.id })));
      if (error) return { ok: false as const, error: error.message };
    }

    return { ok: true as const, cycleId: cycle.id };
  });

export const deleteOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ organizationId: z.string().uuid(), deleteUsers: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isConsultant } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "consultant",
    });
    if (!isConsultant) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cycles } = await supabaseAdmin
      .from("assessment_cycles")
      .select("id")
      .eq("organization_id", data.organizationId);
    const cycleIds = (cycles ?? []).map((c) => c.id);

    if (cycleIds.length) {
      const { data: responses } = await supabaseAdmin
        .from("responses")
        .select("id")
        .in("cycle_id", cycleIds);
      const responseIds = (responses ?? []).map((r) => r.id);
      if (responseIds.length) {
        const { data: files } = await supabaseAdmin
          .from("evidence_files")
          .select("file_path")
          .in("response_id", responseIds);
        const paths = (files ?? []).map((f) => f.file_path);
        if (paths.length) await supabaseAdmin.storage.from("evidence").remove(paths);
        await supabaseAdmin.from("evidence_files").delete().in("response_id", responseIds);
      }
      await supabaseAdmin.from("review_notes").delete().in("cycle_id", cycleIds);
      await supabaseAdmin.from("responses").delete().in("cycle_id", cycleIds);
      await supabaseAdmin.from("assessment_cycles").delete().in("id", cycleIds);
    }

    const { data: members } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("organization_id", data.organizationId);
    const memberIds = (members ?? []).map((m) => m.id).filter((id) => id !== context.userId);

    if (data.deleteUsers !== false) {
      for (const memberId of memberIds) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", memberId);
        await supabaseAdmin.from("profiles").delete().eq("id", memberId);
        await supabaseAdmin.auth.admin.deleteUser(memberId);
      }
    } else {
      await supabaseAdmin
        .from("profiles")
        .update({ organization_id: null })
        .eq("organization_id", data.organizationId);
    }

    const { error } = await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", data.organizationId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const listPlatformUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isConsultant } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "consultant",
    });
    if (!isConsultant) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles }, { data: roles }, { data: orgs }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, organization_id, created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("organizations").select("id, name"),
    ]);
    const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    const orgById = new Map((orgs ?? []).map((o) => [o.id, o.name]));
    return {
      users: (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        role: roleByUser.get(p.id) ?? null,
        organizationId: p.organization_id,
        organizationName: p.organization_id ? (orgById.get(p.organization_id) ?? null) : null,
        createdAt: p.created_at,
        isSelf: p.id === context.userId,
      })),
      organizations: (orgs ?? []).map((o) => ({ id: o.id, name: o.name })),
    };
  });

export const createPlatformUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email().max(200),
        password: z.string().min(8).max(128),
        full_name: z.string().max(160).optional().nullable(),
        role: z.enum(["consultant", "organization"]),
        organization_id: z.string().uuid().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isConsultant } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "consultant",
    });
    if (!isConsultant) throw new Error("Forbidden");

    if (data.role === "organization" && !data.organization_id) {
      return { ok: false as const, error: "Select an organization for this user." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name ?? null },
    });
    if (authError || !created.user) {
      const raw = authError?.message ?? "Could not create user";
      return {
        ok: false as const,
        error: /already been registered|already exists/i.test(raw)
          ? "This email is already in use."
          : raw,
      };
    }

    const userId = created.user.id;
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      email: data.email,
      full_name: data.full_name ?? null,
      organization_id: data.role === "organization" ? (data.organization_id ?? null) : null,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });
    return { ok: true as const, userId };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["consultant", "organization"]),
        organization_id: z.string().uuid().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isConsultant } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "consultant",
    });
    if (!isConsultant) throw new Error("Forbidden");
    if (data.userId === context.userId) {
      return { ok: false as const, error: "You cannot change your own role." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) return { ok: false as const, error: error.message };
    await supabaseAdmin
      .from("profiles")
      .update({
        organization_id: data.role === "organization" ? (data.organization_id ?? null) : null,
      })
      .eq("id", data.userId);
    return { ok: true as const };
  });

export const deletePlatformUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isConsultant } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "consultant",
    });
    if (!isConsultant) throw new Error("Forbidden");
    if (data.userId === context.userId) {
      return { ok: false as const, error: "You cannot delete your own account." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
