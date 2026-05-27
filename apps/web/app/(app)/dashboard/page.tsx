import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  FileText,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { CreateFormButton } from "./_components/create-form-button";
import { FormRowActions } from "./_components/form-row-actions";
import { cn } from "~/lib/utils";

export const dynamic = "force-dynamic";

interface Form {
  id: string;
  slug: string;
  title: string;
  status: string;
  visibility: string;
  responseCount?: number;
  updatedAt?: string | null;
  createdAt?: string | null;
}

function statusStyle(status: string) {
  switch (status) {
    case "published":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
    case "draft":
      return "border-white/[0.08] bg-white/[0.05] text-foreground/80";
    case "unpublished":
      return "border-amber-500/25 bg-amber-500/10 text-amber-300";
    default:
      return "border-white/[0.08] bg-white/[0.05] text-foreground/80";
  }
}

export default async function DashboardPage() {
  const result = await api.forms.listMine.query({ pageSize: 100 });
  const forms: Form[] = (result?.items ?? result ?? []) as Form[];

  // ── Aggregates ──────────────────────────────────────────────────────
  const totalForms = forms.length;
  const publishedCount = forms.filter((f) => f.status === "published").length;
  const totalResponses = forms.reduce(
    (acc, f) => acc + (f.responseCount ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-2 sm:px-8">
      {/* ── Greeting / Header ─────────────────────────────────────── */}
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              Dashboard
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Your forms,{" "}
              <span className="text-gradient-vivid">in motion.</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {totalForms === 0
                ? "Spin up your first form — takes less than a minute."
                : `${totalForms} form${totalForms === 1 ? "" : "s"} · ${totalResponses} total response${totalResponses === 1 ? "" : "s"}`}
            </p>
          </div>
          <CreateFormButton />
        </div>
      </header>

      {/* ── Metric strip ──────────────────────────────────────────── */}
      <section className="mb-10 grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<FileText className="size-4" />}
          label="Total forms"
          value={totalForms}
          tint="amber"
        />
        <Metric
          icon={<Sparkles className="size-4" />}
          label="Published"
          value={publishedCount}
          tint="emerald"
        />
        <Metric
          icon={<TrendingUp className="size-4" />}
          label="Total responses"
          value={totalResponses}
          tint="gold"
        />
      </section>

      {/* ── Forms list ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            All forms
          </h2>
          {totalForms > 0 && (
            <p className="text-xs text-muted-foreground">
              Sorted by recently updated
            </p>
          )}
        </div>

        {forms.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="surface-1 overflow-hidden rounded-2xl">
            <ul className="divide-y divide-white/[0.05]">
              {forms.map((form) => {
                const updatedAt = form.updatedAt ?? form.createdAt;
                return (
                  <li
                    key={form.id}
                    className="group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                  >
                    {/* Status dot */}
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        form.status === "published"
                          ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]"
                          : form.status === "unpublished"
                            ? "bg-amber-400"
                            : "bg-white/30",
                      )}
                    />

                    {/* Title + slug */}
                    <Link
                      href={`/dashboard/forms/${form.id}/edit`}
                      className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                    >
                      <p className="truncate text-[15px] font-medium tracking-tight">
                        {form.title}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                        /f/{form.slug}
                      </p>
                    </Link>

                    {/* Status + visibility */}
                    <div className="hidden items-center gap-2 sm:flex">
                      <Badge className={cn("px-2 py-0.5", statusStyle(form.status))}>
                        {form.status}
                      </Badge>
                      <Badge variant="outline" className="px-2 py-0.5">
                        {form.visibility}
                      </Badge>
                    </div>

                    {/* Responses */}
                    <div className="hidden min-w-[80px] flex-col items-end sm:flex">
                      <span className="font-display text-base font-semibold tabular-nums">
                        {form.responseCount ?? 0}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                        Responses
                      </span>
                    </div>

                    {/* Updated */}
                    <span className="hidden min-w-[120px] text-right text-xs text-muted-foreground md:inline">
                      {updatedAt
                        ? formatDistanceToNow(new Date(updatedAt), {
                            addSuffix: true,
                          })
                        : "—"}
                    </span>

                    {/* Quick analytics */}
                    <Link
                      href={`/dashboard/forms/${form.id}/analytics`}
                      aria-label="View analytics"
                      className="hidden size-8 items-center justify-center rounded-lg border border-white/[0.06] text-muted-foreground transition-all hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-foreground sm:inline-flex"
                    >
                      <BarChart3 className="size-3.5" />
                    </Link>

                    {/* Row actions */}
                    <FormRowActions
                      formId={form.id}
                      formSlug={form.slug}
                      formTitle={form.title}
                      formStatus={form.status}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────

function Metric({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint: "amber" | "gold" | "emerald";
}) {
  const tints = {
    amber:
      "border-amber-500/15 from-amber-500/15 to-amber-500/0 text-amber-200",
    gold:
      "border-amber-400/15 from-amber-400/15 to-amber-400/0 text-amber-200",
    emerald:
      "border-emerald-500/15 from-emerald-500/15 to-emerald-500/0 text-emerald-200",
  } as const;

  return (
    <div className="surface-1 group relative overflow-hidden rounded-2xl p-5 transition-colors hover:bg-white/[0.04]">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-lg border bg-gradient-to-br",
            tints[tint],
          )}
        >
          {icon}
        </span>
        <ArrowUpRight className="size-4 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground/80" />
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="surface-1 mx-auto flex max-w-xl flex-col items-center justify-center gap-4 rounded-3xl px-8 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-gradient-to-br from-amber-500/15 to-amber-400/15 text-amber-200">
        <Plus className="size-5" />
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold tracking-tight">
          Your canvas is empty
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Spin up your first form. We'll have you collecting responses in
          under a minute.
        </p>
      </div>
      <CreateFormButton />
    </div>
  );
}
