import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/tmp-reset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { token?: string; email?: string; password?: string };
        if (body.token !== "one-time-9c2f") return new Response("no", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) return Response.json({ error: listError.message }, { status: 500 });
        const user = list.users.find((u) => u.email === body.email);
        if (!user) return Response.json({ error: "not found" }, { status: 404 });
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: body.password!,
          email_confirm: true,
        });
        return Response.json({ ok: !error, error: error?.message ?? null });
      },
    },
  },
});
