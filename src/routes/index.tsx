import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, BarChart3, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paris Standard Donor Effectiveness Evaluation Platform" },
      {
        name: "description",
        content:
          "A governance-grade platform for consultants and civil society organizations to evaluate grant effectiveness against the Paris Declaration standard.",
      },
      { property: "og:title", content: "Paris Standard Donor Effectiveness Evaluation Platform" },
      {
        property: "og:description",
        content:
          "Assess 62 Paris Declaration requirements, review evidence, and publish maturity dashboards.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ClipboardCheck,
    title: "Structured assessment",
    body: "Every requirement grouped by principle or process clause, with a 0–3 maturity scale, evidence uploads and improvement actions.",
  },
  {
    icon: ShieldCheck,
    title: "Consultant review loop",
    body: "Submit, review, approve or return with inline notes. Full feedback history is preserved across resubmissions.",
  },
  {
    icon: BarChart3,
    title: "Executive dashboards",
    body: "Overall maturity, principle radar, process-clause comparison and Level 1 vs Level 2 breakdown — print-ready.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Paris Standard
            </p>
            <p className="text-sm font-semibold">Donor Effectiveness Evaluation</p>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Governance &amp; audit tool
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Evaluate grantee organizations against the Paris Declaration effectiveness standard.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Consultants create organization accounts, organizations complete a structured
            maturity assessment with evidence, and approved cycles become a shareable results
            dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Enter the platform</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-border bg-card p-6 shadow-panel">
                <feature.icon className="h-5 w-5 text-primary" />
                <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          Paris Standard Donor Effectiveness Evaluation Platform
        </div>
      </footer>
    </div>
  );
}
