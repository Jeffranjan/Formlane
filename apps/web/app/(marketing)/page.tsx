import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe,
  Layers,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { HeroPreview } from "~/components/marketing/hero-preview";
import { Reveal, Stagger, StaggerItem } from "~/components/marketing/reveal";

const FEATURES = [
  {
    icon: Layers,
    title: "Drag & drop builder",
    description:
      "Text, email, number, select, rating, date — drop fields in, reorder with a flick. No friction, no fuss.",
  },
  {
    icon: Globe,
    title: "Public or unlisted",
    description:
      "Share with the world on Explore, or keep it link-only. You decide who sees what.",
  },
  {
    icon: BarChart3,
    title: "Analytics built in",
    description:
      "Counts, distributions, time-series — the moment a response lands, you see the shape of your data.",
  },
  {
    icon: Zap,
    title: "Ship instantly",
    description:
      "Draft to live in one click. Unpublish just as fast when you need to pause.",
  },
  {
    icon: Lock,
    title: "Spam-resistant",
    description:
      "Honeypots and per-IP rate limiting keep noise out without nagging real respondents.",
  },
  {
    icon: CheckCircle2,
    title: "Custom thank-you",
    description:
      "Greet every respondent with a message that sounds like you — not a generic confirmation.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Build it visually",
    body: "Add fields with one tap. Reorder, configure, preview — everything stays out of your way.",
  },
  {
    n: "02",
    title: "Ship in seconds",
    body: "Click publish. Get a clean public URL. Share by link or QR. Embed where you want.",
  },
  {
    n: "03",
    title: "Read the room",
    body: "Watch responses arrive in real time. Filter, export, dive into per-field charts.",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "Felt like Linear had a baby with Typeform. Builds are fast, and the dashboard finally respects my eyes.",
    name: "Amelia Hart",
    role: "Founder, Studio Hart",
  },
  {
    quote:
      "We replaced two tools. The analytics view is the cleanest I've seen — every chart actually tells me something.",
    name: "Rohan Mehta",
    role: "Head of Growth, Craft.co",
  },
  {
    quote:
      "Honestly the hover states alone made me switch. Sounds silly but the craft is in the details.",
    name: "June Park",
    role: "Designer, Labs.app",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-20 pt-12 sm:pb-28 sm:pt-20">
        <div className="mx-auto max-w-5xl text-center">
          <Reveal>
            <Badge variant="secondary" className="mx-auto mb-7">
              <Sparkles className="size-3 text-violet-300" />
              <span>Now in public beta — free during preview</span>
            </Badge>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="font-display text-[clamp(2.5rem,6vw,4.75rem)] font-semibold leading-[1.04] tracking-tight">
              <span className="text-gradient-brand">Forms that feel</span>
              <br />
              <span className="text-gradient-vivid">premium by default.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Formlane is a Typeform-grade builder for creators who care about
              craft. Design fluid forms, ship in seconds, and read responses in
              calm, analytical detail.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button size="xl" asChild>
                <Link href="/sign-up">
                  Start building free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="/explore">Browse public forms</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <p className="mt-5 text-xs text-muted-foreground/70">
              No credit card. 14-day Pro trial. Cancel any time.
            </p>
          </Reveal>
        </div>

        {/* Floating product preview */}
        <HeroPreview />
      </section>

      {/* ── Logos / proof strip ─────────────────────────────────────── */}
      <section className="border-y border-white/[0.05] bg-white/[0.015] px-6 py-9 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            Loved by teams collecting research, feedback, signups, and more
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium text-muted-foreground/60">
            {["Surveys", "Feedback", "Quizzes", "Registration", "Research", "Onboarding"].map(
              (label) => (
                <span key={label} className="tracking-wide">
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mx-auto mb-5">
              Features
            </Badge>
            <h2 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-tight">
              Everything you need.
              <br />
              <span className="text-muted-foreground">Nothing you don't.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              No bloat. Just the features that make collecting responses feel
              effortless.
            </p>
          </Reveal>

          <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <StaggerItem key={f.title}>
                  <FeatureCard
                    icon={<Icon className="size-5" />}
                    title={f.title}
                    body={f.description}
                  />
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mx-auto mb-5">
              How it works
            </Badge>
            <h2 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-tight">
              From idea to insights
              <br />
              <span className="text-muted-foreground">in minutes.</span>
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="surface-1 group relative h-full overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                      Step {s.n}
                    </span>
                    <span className="size-2 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.6)]" />
                  </div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mx-auto mb-5">
              Loved
            </Badge>
            <h2 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-tight">
              Words from the
              <span className="text-gradient-vivid"> craft-obsessed</span>.
            </h2>
          </Reveal>

          <Stagger className="mt-14 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <StaggerItem key={t.name}>
                <div className="surface-1 group relative h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5">
                  <p className="text-[15px] leading-relaxed text-foreground/90">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3 border-t border-white/[0.05] pt-4">
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/70 to-violet-500/70 text-[11px] font-semibold text-white">
                      {t.name[0]}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="relative px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <div className="border-gradient relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[rgba(17,18,20,0.6)] p-10 text-center backdrop-blur-xl sm:p-14">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(99,102,241,0.18), transparent 65%)",
                }}
              />
              <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight">
                Ready to brew your{" "}
                <span className="text-gradient-vivid">first form</span>?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Sign up free, no credit card. Upgrade when you outgrow it.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="xl" asChild>
                  <Link href="/sign-up">
                    Create your free account
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="xl" variant="ghost" asChild>
                  <Link href="/pricing">See pricing</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="surface-1 group relative h-full overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04]">
      {/* Hover glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(450px circle at var(--mx,50%) var(--my,50%), rgba(99,102,241,0.10), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="mb-5 inline-flex size-10 items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-200">
          {icon}
        </div>
        <h3 className="font-display text-base font-semibold tracking-tight">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}
