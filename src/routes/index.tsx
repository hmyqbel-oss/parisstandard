import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paris Standard — Donor Effectiveness Evaluation" },
      {
        name: "description",
        content:
          "Paris Declaration effectiveness evaluation: 62 requirements, 5 principles, 7 process clauses, 2 maturity levels.",
      },
      { property: "og:title", content: "Paris Standard — Donor Effectiveness Evaluation" },
      {
        property: "og:description",
        content: "62 requirements · 5 principles · 7 process clauses · 2 levels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const stats = [
  { value: "62", label: "Requirements" },
  { value: "05", label: "Principles" },
  { value: "07", label: "Process clauses" },
  { value: "02", label: "Maturity levels" },
];

function Landing() {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[38rem] w-[38rem] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--sidebar-primary), transparent 65%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--sidebar-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--sidebar-foreground) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-14">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sidebar-primary">
          Paris Standard
        </p>
        <Button asChild size="sm" variant="secondary">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col justify-center px-6 md:px-14">
        <h1 className="max-w-4xl text-[clamp(2.2rem,6vw,4.6rem)] font-semibold leading-[1.02] tracking-tight">
          Donor Effectiveness
          <br />
          <span className="text-sidebar-primary">Evaluation</span>
        </h1>
        <p className="mt-5 text-sm uppercase tracking-[0.22em] text-sidebar-foreground/60">
          Paris Declaration maturity standard
        </p>

        <div className="mt-10 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-sidebar-border bg-sidebar-border md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-sidebar-accent px-5 py-6">
              <p className="text-3xl font-semibold tracking-tight text-sidebar-primary md:text-4xl">
                {s.value}
              </p>
              <p className="mt-1 text-[0.7rem] uppercase tracking-[0.16em] text-sidebar-foreground/70">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">
              Enter the platform <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="text-sidebar-foreground/80">
            <Link to="/consultant">Consultant access</Link>
          </Button>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-5 text-[0.7rem] uppercase tracking-[0.18em] text-sidebar-foreground/40 md:px-14">
        Scale 0–3 · Evidence-based · Consultant reviewed
      </footer>
    </div>
  );
}
