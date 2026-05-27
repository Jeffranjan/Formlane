import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { AmbientBackground } from "~/components/chrome/ambient-background";
import { FormRunner } from "./_components/form-runner";

interface PublicFormPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { slug } = await params;

  let form;
  try {
    form = await api.forms.getPublicBySlug.query({ slug });
  } catch {
    notFound();
  }
  if (!form) notFound();

  return (
    <div className="relative min-h-screen">
      <AmbientBackground variant="marketing" />
      <main className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-2xl">
          <FormRunner form={form} slug={slug} />
        </div>
      </main>
    </div>
  );
}
