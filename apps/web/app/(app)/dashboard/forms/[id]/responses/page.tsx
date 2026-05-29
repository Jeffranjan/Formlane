import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, FileText, Pencil } from "lucide-react";

import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { ResponsesTable } from "./_components/responses-table";
import { ExportCsvButton } from "./_components/export-csv-button";

export const dynamic = "force-dynamic";

interface ResponsesPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResponsesPage({ params }: ResponsesPageProps) {
  const { id } = await params;

  let form: Awaited<ReturnType<typeof api.forms.get.query>>;
  try {
    form = await api.forms.get.query({ id });
  } catch {
    notFound();
  }
  if (!form) notFound();

  let responsesResult: Awaited<ReturnType<typeof api.responses.listForForm.query>>;
  try {
    responsesResult = await api.responses.listForForm.query({
      formId: id,
      pageSize: 25,
    });
  } catch {
    responsesResult = { items: [], page: 1, pageSize: 25, total: 0 };
  }

  const fields: Array<{ id: string; label: string; type: string; config?: Record<string, unknown> }> = (
    form.fields ?? []
  ).map((f: { id?: string; label: string; type: string; config?: unknown }) => ({
    id: f.id ?? "",
    label: f.label,
    type: f.type,
    config: (f.config ?? {}) as Record<string, unknown>,
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-2">
      {/* Top bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="size-3.5" />
            Dashboard
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <ExportCsvButton formId={id} formTitle={form.title} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/forms/${id}/edit`}>
              <Pencil className="size-3.5" />
              Edit form
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/forms/${id}/analytics`}>
              <BarChart3 className="size-3.5" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-start gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-amber-500/15 to-amber-400/15 text-amber-200">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              Responses
            </p>
            <h1 className="mt-1 truncate font-display text-3xl font-semibold tracking-tight">
              {form.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse, filter, and export every submission you've received
            </p>
          </div>
        </div>
      </header>

      <ResponsesTable
        formId={id}
        formTitle={form.title}
        fields={fields}
        initialResponses={
          responsesResult.items as Parameters<
            typeof ResponsesTable
          >[0]["initialResponses"]
        }
        initialTotal={responsesResult.total}
      />
    </div>
  );
}
