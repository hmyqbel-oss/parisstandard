import { MoveRight, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function CTA() {
  return (
    <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-6 backdrop-blur md:p-8">
      <div className="flex flex-col items-start gap-5">
        <Badge variant="secondary">Get started</Badge>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Start your effectiveness assessment
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-sidebar-foreground/70">
            Answer 62 requirements on a 0–3 scale, attach evidence, and get a consultant-reviewed
            maturity profile across the five Paris principles.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/auth">
              Enter the platform <MoveRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-sidebar-border bg-transparent">
            <Link to="/consultant">
              Consultant access <ShieldCheck className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export { CTA };
