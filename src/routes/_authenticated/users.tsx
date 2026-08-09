import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPlatformUser,
  deletePlatformUser,
  listPlatformUsers,
  updateUserRole,
} from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "Users & access — Paris Standard Evaluation" },
      {
        name: "description",
        content:
          "Create platform accounts, assign consultant or organization permissions and remove users.",
      },
      { property: "og:title", content: "Users & access — Paris Standard Evaluation" },
      {
        property: "og:description",
        content: "Consultant-only control panel for platform accounts and their permissions.",
      },
    ],
  }),
  component: UsersPage,
});

type Role = "consultant" | "organization";

function UsersPage() {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "organization" as Role,
    organization_id: "",
  });

  const data = useQuery({
    queryKey: ["platform-users"],
    queryFn: () => listPlatformUsers(),
  });

  const users = data.data?.users ?? [];
  const organizations = data.data?.organizations ?? [];

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await createPlatformUser({
        data: {
          email: form.email,
          password: form.password,
          full_name: form.full_name || null,
          role: form.role,
          organization_id: form.role === "organization" ? form.organization_id || null : null,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User created");
      setForm({
        email: "",
        password: "",
        full_name: "",
        role: "organization",
        organization_id: "",
      });
      await data.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create user");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, role: Role, organizationId: string | null) {
    try {
      const result = await updateUserRole({
        data: { userId, role, organization_id: organizationId },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Permissions updated");
      await data.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update permissions");
    }
  }

  async function removeUser(userId: string, email: string | null) {
    if (!window.confirm(`Delete the account ${email ?? userId}? This cannot be undone.`)) return;
    try {
      const result = await deletePlatformUser({ data: { userId } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User deleted");
      await data.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete user");
    }
  }

  return (
    <AppShell
      title="Users & access"
      breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Users" }]}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
      <form
        onSubmit={handleCreate}
        className="mx-auto w-full max-w-3xl space-y-6 rounded-xl border border-border bg-card p-7 shadow-panel md:p-9"
      >
        <div className="border-b border-border pb-5 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold">Add a platform user</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose whether the account works as a consultant (full access) or as an organization
            user (own assessment only).
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="role">Permission</Label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="organization">Organization</option>
              <option value="consultant">Consultant</option>
            </select>
          </div>
          {form.role === "organization" && (
            <div className="sm:col-span-2">
              <Label htmlFor="organization_id">Organization</Label>
              <select
                id="organization_id"
                required
                value={form.organization_id}
                onChange={(e) => update("organization_id", e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select organization…</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create user"}
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-panel">
        {data.isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : users.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">User</th>
                <th className="px-5 py-2.5 font-medium">Organization</th>
                <th className="px-5 py-2.5 font-medium">Permission</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-5 py-3">
                    <div className="font-medium">{user.fullName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {user.organizationName || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={user.role ?? ""}
                      disabled={user.isSelf}
                      onChange={(e) =>
                        changeRole(user.id, e.target.value as Role, user.organizationId)
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
                    >
                      <option value="" disabled>
                        No role
                      </option>
                      <option value="organization">Organization</option>
                      <option value="consultant">Consultant</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={user.isSelf}
                      onClick={() => removeUser(user.id, user.email)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
