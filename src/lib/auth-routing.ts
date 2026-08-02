import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const consultantOnly = ["/dashboard", "/organizations", "/requirements"];
const orgOnly = ["/assessment", "/results"];

export function useRouteAfterLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return async function routeAfterLogin(
    userId: string,
    redirectTo: string | undefined,
    onNoRole: (message: string) => void,
  ) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    // Drop anything cached for the previously signed-in account.
    await queryClient.cancelQueries();
    queryClient.clear();

    const role = roles?.[0]?.role;
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
    else onNoRole("This account has no role yet. Ask your consultant to create your account.");
  };
}
