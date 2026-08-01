import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registerConsultant } from "@/lib/platform.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Paris Standard Evaluation Platform" },
      {
        name: "description",
        content:
          "Sign in to the Paris Standard evaluation platform as a consultant or as an evaluated organization.",
      },
      { property: "og:title", content: "Sign in — Paris Standard Evaluation Platform" },
      {
        property: "og:description",
        content: "Consultant and organization access to the Paris Declaration assessment workspace.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search['redirect'] === "string" ? (search['redirect'] as string) : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const queryClient = useQueryClient();

  async function routeAfterLogin(userId: string) {
    let { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!roles?.length) {
      try {
        await registerConsultant();
        const refreshed = await supabase.from("user_roles").select("role").eq("user_id", userId);
        roles = refreshed.data ?? [];
      } catch {
        /* organization users always have a role assigned by the consultant */
      }
    }
    // Drop anything cached for the previously signed-in account.
    await queryClient.cancelQueries();
    queryClient.clear();
    const role = roles?.[0]?.role;
    const consultantOnly = ["/dashboard", "/organizations", "/requirements"];
    const orgOnly = ["/assessment", "/results"];
    const allowed =
      !!redirectTo &&
      redirectTo.startsWith("/") &&
      !redirectTo.startsWith("//") &&
      !(role === "organization" && consultantOnly.some((p) => redirectTo.startsWith(p))) &&
      !(role === "consultant" && orgOnly.some((p) => redirectTo.startsWith(p)));
    if (allowed && redirectTo) {
      navigate({ to: redirectTo, replace: true });
      return;
    }
    if (role === "consultant") navigate({ to: "/dashboard", replace: true });
    else if (role === "organization") navigate({ to: "/assessment", replace: true });
    else {
      setNotice(
        "This account has no role yet. Ask your consultant to create your organization account.",
      );
    }
  }


  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await routeAfterLogin(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm the account, then sign in.");
        } else if (data.user) {
          await routeAfterLogin(data.user.id);
        }
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
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create consultant account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Consultants and organization users sign in here."
            : "The consultant account administers organizations and reviews assessments."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          className="mt-5 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setNotice(null);
          }}
        >
          {mode === "signin"
            ? "Setting up the platform? Create the consultant account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
