import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Clock,
  Sparkles,
} from "lucide-react";
import { api } from "~/trpc/server";
import { AnalyticsCharts } from "./_components/analytics-charts";
import { Button } from "~/components/ui/button";

export const dynamic = "force-dynamic";

interface AnalyticsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { id } = await params;

  let form: Awaited<ReturnType<typeof api.forms.get.query>>;
  try {
    form = await api.forms.get.query({ id });
  } catch {
    notFound();
  }
  if (!form) notFound();

  let analytics: Awaited<ReturnType<typeof api.analytics.getForForm.query>>;
  try {
    analytics = await api.analytics.getForForm.query({ formId: id });
  } catch {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields = (form.fields ?? []).map((f: any) => ({
    id: (f.id as string) ?? "",
    label: f.label as string,
    type: f.type as string,
    config: (f.config ?? {}) as Record<string, unknown>,
  }));

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-2">
      {/* Top bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="size-3.5" />
            Dashboard
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/forms/${id}/responses`}>
              View responses <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/forms/${id}/edit`}>Edit form</Link>
          </Button>
        </div>
      </div>

      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-start gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-amber-500/15 to-amber-400/15 text-amber-200">
            <BarChart3 className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              Analytics
            </p>
            <h1 className="mt-1 truncate font-display text-3xl font-semibold tracking-tight">
              {form.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Response analytics & per-field distributions
            </p>
          </div>
        </div>
      </header>

      {/* KPI strip */}
      <section className="mb-10 grid gap-3 sm:grid-cols-2">
        <KpiCard
          icon={<Sparkles className="size-4" />}
          label="Total responses"
          value={analytics.totalCount}
          tint="amber"
        />
        <KpiCard
          icon={<Clock className="size-4" />}
          label="Last 7 days"
          value={analytics.last7DaysCount}
          tint="gold"
        />
      </section>

      {/* Field breakdown */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Field breakdown
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Distribution of answers per field
          </p>
        </div>

        {analytics.totalCount === 0 ? (
          <div className="surface-1 rounded-2xl px-8 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No responses yet. Share your form to start collecting data.
            </p>
          </div>
        ) : (
          <AnalyticsCharts
            fields={fields}
            perFieldDistribution={analytics.perFieldDistribution}
          />
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint: "amber" | "gold";
}) {
  const tints = {
    amber:
      "border-amber-500/15 from-amber-500/15 to-amber-500/0 text-amber-200",
    gold:
      "border-amber-400/15 from-amber-400/15 to-amber-400/0 text-amber-200",
  } as const;

  return (
    <div className="surface-1 relative overflow-hidden rounded-2xl p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            tint === "amber"
              ? "radial-gradient(280px circle at 100% 0%, rgba(245,158,11,0.10), transparent 60%)"
              : "radial-gradient(280px circle at 100% 0%, rgba(217,119,6,0.10), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex size-8 items-center justify-center rounded-lg border bg-gradient-to-br ${tints[tint]}`}
          >
            {icon}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
            {label}
          </span>
        </div>
        <p className="mt-5 font-display text-4xl font-semibold tabular-nums tracking-tight">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
