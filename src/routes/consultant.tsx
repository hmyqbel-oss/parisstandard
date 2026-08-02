import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registerConsultant } from "@/lib/platform.functions";
import { useRouteAfterLogin } from "@/lib/auth-routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/consultant")({
  head: () => ({
    meta: [
      { title: "Consultant sign in — Paris Standard Evaluation" },
      {
        name: "description",
        content:
          "Consultant access to administer organizations and review Paris Declaration assessments.",
      },
      { property: "og:title", content: "Consultant sign in — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Restricted consultant workspace for managing evaluated organizations.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search['redirect'] === "string" ? (search['redirect'] as string) : undefined,
  }),
  component: ConsultantAuthPage;
});

function ConsultantAuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { redirect: redirectTo } = Route.useSearch();
  const routeAfterLogin = useRouteAfterLogin();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        // First-ever account bootstraps the consultant role; no-op afterwards.
        try {
          await registerConsultant();
        } catch {
          /* role already assigned */
        }
        await routeAfterLogin(data.user.id, redirectTo, setNotice);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Paris Standard
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Consultant sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Restricted access for the evaluating consultant.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="c-password">Password</Label>
            <Input
              id="c-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
            />
          </div>
          {notice && (
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {notice}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-5 flex flex-col gap-2 text-center text-xs text-muted-foreground">
          <Link to="/forgot-password" className="underline-offset-4 hover:text-foreground hover:underline">
            Forgot your password?
          </Link>
          <Link to="/auth" className="underline-offset-4 hover:text-foreground hover:underline">
            Organization sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
