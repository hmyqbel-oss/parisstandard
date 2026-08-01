import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // On a hard refresh the Supabase client restores the session from storage
    // asynchronously; retry briefly instead of bouncing the user to sign-in.
    let session = (await supabase.auth.getSession()).data.session;
    for (let attempt = 0; attempt < 10 && !session; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      session = (await supabase.auth.getSession()).data.session;
    }

    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }

    return { user: session.user };
  },
  component: () => <Outlet />,
});
