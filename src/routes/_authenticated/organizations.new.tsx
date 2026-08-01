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

function NewOrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requirements = useQuery(requirementsQuery());
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sector: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    login_email: "",
    login_password: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await createOrganization({
        data: {
          name: form.name,
          sector: form.sector || null,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          login_email: form.login_email,
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
      {(requirements.data?.length ?? 0) === 0 && !requirements.isLoading && (
        <div className="mb-5 rounded-lg border border-status-returned/40 bg-status-returned/8 p-4 text-sm">
          Import the requirements master list first — otherwise the new assessment will be empty.
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-6 rounded-lg border border-border bg-card p-6 shadow-panel"
      >
        <div>
          <h2 className="text-sm font-semibold">Organization details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                value={form.contact_email}
                onChange={(e) => update("contact_email", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">Contact phone</Label>
              <Input
                id="contact_phone"
                value={form.contact_phone}
                onChange={(e) => update("contact_phone", e.target.value)}
                className="mt-1.5"
              />
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
                required
                value={form.login_email}
                onChange={(e) => update("login_email", e.target.value)}
                className="mt-1.5"
              />
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
