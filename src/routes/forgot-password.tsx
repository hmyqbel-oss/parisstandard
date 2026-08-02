import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Paris Standard Evaluation" },
      {
        name: "description",
        content: "Request a password reset link for your Paris Standard evaluation account.",
      },
      { property: "og:title", content: "Reset your password — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Send yourself a secure link to set a new password.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reset link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-card">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your account email and we will send you a link to set a new password.
        </p>

        {sent ? (
          <p className="mt-6 rounded-md border border-border bg-muted px-3 py-3 text-sm text-muted-foreground">
            If an account exists for {email}, a reset link is on its way. Check your inbox and spam
            folder.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
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
