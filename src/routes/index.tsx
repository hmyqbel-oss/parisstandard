import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paris Standard — Donor Effectiveness Evaluation" },
      {
        name: "description",
        content:
          "Paris Declaration effectiveness evaluation: 62 requirements across 5 principles, reviewed by a consultant.",
      },
      { property: "og:title", content: "Paris Standard — Donor Effectiveness Evaluation" },
      {
        property: "og:description",
        content: "62 requirements · 5 principles · consultant-reviewed maturity profile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="px-6 py-6 md:px-12">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Paris Standard
        </p>
      </header>

      <main className="flex flex-1 items-center px-6 md:px-12">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight">
            Donor Effectiveness Evaluation
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            A simple, evidence-based assessment against the Paris Declaration — 62 requirements,
            five principles, one consultant-reviewed maturity profile.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Enter the platform</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/consultant">Consultant access</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-xs text-muted-foreground md:px-12">
        Scale 0–3 · Evidence-based · Consultant reviewed
      </footer>
    </div>
  );
}
