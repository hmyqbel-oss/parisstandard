import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganization } from "@/lib/platform.functions";
import { requirementsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/organizations/new")({
  head: () => ({
    meta: [
      { title: "New organization — Paris Standard Evaluation" },
      {
        name: "description",
        content:
          "Create an evaluated organization, its login credentials and its first assessment cycle.",
      },
      { property: "og:title", content: "New organization — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Set up an organization account and pre-populate all Paris requirements.",
      },
    ],
  }),
  component: NewOrganizationPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE_RE = /^05\d{8}$/;

function NewOrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requirements = useQuery(requirementsQuery());
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    sector: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    login_email: "",
    login_password: "",
  });

  function fieldError(key: keyof typeof form, value: string): string | null {
    const v = value.trim();
    if (key === "contact_email") {
      if (v && !EMAIL_RE.test(v)) return "Enter a valid email address (e.g. name@example.com)";
    }
    if (key === "login_email") {
      if (!v) return "Login email is required";
      if (!EMAIL_RE.test(v)) return "Enter a valid email address (e.g. name@example.com)";
    }
    if (key === "contact_phone") {
      if (v && !PHONE_RE.test(v)) return "Phone must be 10 digits starting with 05";
    }
    return null;
  }

  function update(key: keyof typeof form, value: string) {
    const next = key === "contact_phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setForm((prev) => ({ ...prev, [key]: next }));
    setErrors((prev) => {
      const rest = { ...prev };
      const message = fieldError(key, next);
      if (message) rest[key] = message;
      else delete rest[key];
      return rest;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    (["contact_email", "login_email", "contact_phone"] as const).forEach((key) => {
      const message = fieldError(key, form[key]);
      if (message) nextErrors[key] = message;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please correct the highlighted fields");
      return;
    }
    setBusy(true);
    try {
      const result = await createOrganization({
        data: {
          name: form.name.trim(),
          sector: form.sector || null,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email.trim() || null,
          contact_phone: form.contact_phone.trim() || null,
          login_email: form.login_email.trim(),
          login_password: form.login_password,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await queryClient.invalidateQueries();
      toast.success(`Organization created with ${result.requirementCount} requirements`);
      navigate({ to: "/organizations/$id", params: { id: result.organizationId } });

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create organization");
    } finally {
      setBusy(false);
    }
  }


  return (
    <AppShell
      title="New organization"
      breadcrumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Organizations", to: "/organizations" },
        { label: "New" },
      ]}
    >
      <div className="mx-auto w-full max-w-3xl">
      {(requirements.data?.length ?? 0) === 0 && !requirements.isLoading && (
        <div className="mb-5 rounded-lg border border-status-returned/40 bg-status-returned/8 p-4 text-sm">
          Import the requirements master list first — otherwise the new assessment will be empty.
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-xl border border-border bg-card p-7 shadow-panel md:p-9"
      >
        <div className="border-b border-border pb-5 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold">Organization details</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Basic profile of the evaluated organization.
          </p>
        </div>
        <div>
          <div className="grid gap-5 sm:grid-cols-2">

            <div className="sm:col-span-2">
              <Label htmlFor="name">Organization name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="sector">Sector</Label>
              <Input
                id="sector"
                value={form.sector}
                onChange={(e) => update("sector", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contact_name">Contact person</Label>
              <Input
                id="contact_name"
                value={form.contact_name}
                onChange={(e) => update("contact_name", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contact_email">Contact email</Label>
              <Input
                id="contact_email"
                type="email"
                inputMode="email"
                aria-invalid={Boolean(errors['contact_email'])}
                value={form.contact_email}
                onChange={(e) => update("contact_email", e.target.value)}
                className="mt-1.5"
              />
              {errors['contact_email'] && (
                <p className="mt-1 text-xs text-destructive">{errors['contact_email']}</p>
              )}
            </div>
            <div>
              <Label htmlFor="contact_phone">Contact phone</Label>
              <Input
                id="contact_phone"
                inputMode="numeric"
                placeholder="05XXXXXXXX"
                aria-invalid={Boolean(errors['contact_phone'])}
                value={form.contact_phone}
                onChange={(e) => update("contact_phone", e.target.value)}
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Saudi mobile format: 10 digits starting with 05.
              </p>
              {errors['contact_phone'] && (
                <p className="mt-1 text-xs text-destructive">{errors['contact_phone']}</p>
              )}
            </div>

          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="text-sm font-semibold">Login credentials</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Share these with the organization. They can complete the assessment immediately.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="login_email">Login email</Label>
              <Input
                id="login_email"
                type="email"
                inputMode="email"
                required
                aria-invalid={Boolean(errors['login_email'])}
                value={form.login_email}
                onChange={(e) => update("login_email", e.target.value)}
                className="mt-1.5"
              />
              {errors['login_email'] && (
                <p className="mt-1 text-xs text-destructive">{errors['login_email']}</p>
              )}
            </div>

            <div>
              <Label htmlFor="login_password">Temporary password</Label>
              <Input
                id="login_password"
                required
                minLength={8}
                value={form.login_password}
                onChange={(e) => update("login_password", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/organizations" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create organization"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
