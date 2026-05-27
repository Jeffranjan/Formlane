import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Reveal, Stagger, StaggerItem } from "~/components/marketing/reveal";
import { cn } from "~/lib/utils";

export const metadata: Metadata = {
  title: "Pricing — Formlane",
  description: "Simple, transparent pricing. Start free, upgrade when ready.",
};

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to start collecting responses.",
    features: [
      "Up to 3 active forms",
      "100 responses / month",
      "All core field types",
      "Public & unlisted forms",
      "Basic analytics",
      "Custom thank-you screen",
      "Spam protection",
      "Shareable public link",
    ],
    cta: "Start free",
    ctaHref: "/sign-up",
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    description: "For creators who need more forms, more responses, more depth.",
    features: [
      "Unlimited forms",
      "Unlimited responses",
      "Time-series analytics",
      "CSV export",
      "Email notifications",
      "Custom slugs",
      "Form expiry & limits",
      "Password-protected forms",
      "Priority support",
    ],
    cta: "Start Pro trial",
    ctaHref: "/sign-up",
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Team",
    price: "$39",
    period: "per month",
    description: "Collaborate with your team. Manage forms at scale.",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Shared form library",
      "Role-based access",
      "Audit log",
      "SSO / Google OAuth",
      "Dedicated onboarding",
      "SLA-backed support",
    ],
    cta: "Contact us",
    ctaHref: "/sign-up",
  },
];

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yep. Cancel from settings whenever. You keep access until the end of your billing period.",
  },
  {
    q: "What happens at the Free limit?",
    a: "New submissions pause until next month, or upgrade to Pro for unlimited.",
  },
  {
    q: "Is the Pro trial really free?",
    a: "14 days, no credit card. Downgrade to Free if it's not for you.",
  },
  {
    q: "Discounts for non-profits?",
    a: "Absolutely. Reach out and we'll sort you out with a discounted plan.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="px-6 pb-12 pt-12 sm:pt-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mx-auto mb-5">
            Pricing
          </Badge>
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.06] tracking-tight">
            Simple, transparent
            <br />
            <span className="text-gradient-vivid">pricing.</span>
          </h1>
          <p className="mt-5 text-muted-foreground sm:text-lg">
            Start free. Upgrade when you need more. No hidden fees, ever.
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-20">
        <Stagger className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <StaggerItem key={plan.name}>
              <PlanCard plan={plan} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="px-6 pb-28">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Questions, answered.
          </h2>
        </Reveal>
        <Stagger className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
          {FAQ.map(({ q, a }) => (
            <StaggerItem key={q}>
              <div className="surface-1 rounded-2xl p-5 transition-colors hover:bg-white/[0.04]">
                <p className="text-sm font-medium">{q}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {a}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn(
        "relative h-full rounded-2xl border bg-[linear-gradient(180deg,rgba(255,255,255,0.025)_0%,rgba(255,255,255,0)_70%),var(--color-card)] p-7 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_18px_44px_-22px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-0.5",
        plan.highlighted
          ? "border-transparent ring-1 ring-indigo-500/40 shadow-[0_0_0_1px_rgba(99,102,241,0.35),0_24px_60px_-20px_rgba(99,102,241,0.45)]"
          : "border-white/[0.06] hover:border-white/[0.12]",
      )}
    >
      {plan.highlighted && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 0%, rgba(99,102,241,0.18), transparent 70%)",
          }}
        />
      )}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="border-indigo-400/40 bg-indigo-500/30 px-3 py-1 text-[11px] text-white">
            {plan.badge}
          </Badge>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          {plan.name}
        </p>
        <div className="flex items-end gap-1">
          <span className="font-display text-4xl font-semibold tabular-nums sm:text-5xl">
            {plan.price}
          </span>
          <span className="mb-1.5 text-sm text-muted-foreground">
            /{plan.period}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {plan.description}
        </p>
      </div>

      <ul className="my-7 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 className="mt-[2px] size-4 shrink-0 text-indigo-300/90" />
            <span className="text-foreground/90">{f}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        size="lg"
        variant={plan.highlighted ? "default" : "outline"}
        className="w-full"
      >
        <Link href={plan.ctaHref}>
          {plan.cta}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
