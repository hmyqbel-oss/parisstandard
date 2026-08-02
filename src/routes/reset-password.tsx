import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — Paris Standard Evaluation" },
      {
        name: "description",
        content: "Choose a new password for your Paris Standard evaluation account.",
      },
      { property: "og:title", content: "Set a new password — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Complete your password reset and return to the assessment workspace.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — you can sign in now");
      navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-card">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Open this page from the reset link in your email to continue.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="np">New password</Label>
              <Input
                id="np"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="np2">Confirm new password</Label>
              <Input
                id="np2"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Update password"}
            </Button>
          </form>
        )}
        <div className="mt-5 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="underline-offset-4 hover:text-foreground hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
