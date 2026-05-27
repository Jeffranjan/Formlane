import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Reveal, Stagger, StaggerItem } from "~/components/marketing/reveal";

export const metadata = {
  title: "Explore — Formlane",
  description: "Browse public forms created by the Formlane community.",
};

export default async function ExplorePage() {
  let items: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    createdAt: Date | string;
    publishedAt: Date | string | null;
  }> = [];

  try {
    const result = await api.explore.list.query({ page: 1, pageSize: 24 });
    items = result.items;
  } catch {
    items = [];
  }

  return (
    <>
      <section className="px-6 pb-10 pt-12 sm:pt-20">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mx-auto mb-5">
            <Compass className="size-3 text-indigo-300" />
            Explore
          </Badge>
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.06] tracking-tight">
            Public forms,{" "}
            <span className="text-gradient-vivid">curated</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground sm:text-lg">
            Browse forms shared publicly by the Formlane community. Find
            inspiration, templates, and live experiments.
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((form) => (
                <StaggerItem key={form.id}>
                  <FormPreviewCard form={form} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </section>
    </>
  );
}

function EmptyState() {
  return (
    <div className="surface-1 mx-auto max-w-xl rounded-3xl px-8 py-16 text-center">
      <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-gradient-to-br from-indigo-500/10 to-violet-500/10">
        <Compass className="size-5 text-indigo-300" />
      </div>
      <h2 className="font-display text-lg font-semibold tracking-tight">
        No public forms yet
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Be the first to publish a public form for the community.
      </p>
      <Button asChild size="lg" className="mt-7">
        <Link href="/sign-up">
          Create a form <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function FormPreviewCard({
  form,
}: {
  form: {
    slug: string;
    title: string;
    description: string | null;
    publishedAt: Date | string | null;
  };
}) {
  return (
    <Link
      href={`/f/${form.slug}`}
      className="group relative block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
    >
      <div className="surface-1 relative h-full overflow-hidden rounded-2xl p-6 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-white/[0.12] group-hover:bg-white/[0.04]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(420px circle at 30% 0%, rgba(99,102,241,0.12), transparent 60%)",
          }}
        />
        <div className="relative">
          <div className="mb-4 flex items-start justify-between gap-3">
            <Badge variant="success" className="shrink-0">
              public
            </Badge>
            <ArrowRight className="size-4 text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>
          <h3 className="font-display line-clamp-2 text-base font-semibold leading-snug tracking-tight">
            {form.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {form.description ?? "No description provided."}
          </p>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
            /f/{form.slug}
          </p>
        </div>
      </div>
    </Link>
  );
}
