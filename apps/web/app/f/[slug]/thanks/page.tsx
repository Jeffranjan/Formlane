import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { api } from "~/trpc/server";
import { AmbientBackground } from "~/components/chrome/ambient-background";
import { Button } from "~/components/ui/button";

interface ThanksPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ThanksPage({ params }: ThanksPageProps) {
  const { slug } = await params;

  let form;
  try {
    form = await api.forms.getPublicBySlug.query({ slug });
  } catch {
    notFound();
  }
  if (!form) notFound();

  const message =
    form.confirmationMessage ?? "Thanks! Your response has been recorded.";

  return (
    <div className="relative min-h-screen">
      <AmbientBackground variant="marketing" />
      <main className="relative flex min-h-screen items-center justify-center px-4">
        <div className="border-gradient relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.06] bg-[rgba(17,18,20,0.78)] p-10 text-center backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(16,185,129,0.18), transparent 70%)",
            }}
          />

          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_-6px_rgba(16,185,129,0.5)]">
            <CheckCircle2 className="size-6 text-emerald-300" />
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {form.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {message}
          </p>

          <div className="mt-8">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Back to Formlane</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
