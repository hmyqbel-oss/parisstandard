import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "consultant" | "organization";

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppRole | null;
  fullName: string | null;
  organizationId: string | null;
};

export function currentUserQuery() {
  return {
    queryKey: ["current-user"],
    queryFn: async (): Promise<CurrentUser | null> => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;

      const [rolesResult, profileResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("full_name, organization_id, email")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      return {
        id: user.id,
        email: user.email ?? profileResult.data?.email ?? null,
        role: (rolesResult.data?.[0]?.role as AppRole | undefined) ?? null,
        fullName: profileResult.data?.full_name ?? null,
        organizationId: profileResult.data?.organization_id ?? null,
      };
    },
  };
}

export function useCurrentUser() {
  return useQuery(currentUserQuery());
}
