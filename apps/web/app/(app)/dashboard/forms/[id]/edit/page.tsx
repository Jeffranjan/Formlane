import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { FormEditor } from "./_components/form-editor";

export const dynamic = "force-dynamic";

interface EditFormPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFormPage({ params }: EditFormPageProps) {
  const { id } = await params;

  let form: Awaited<ReturnType<typeof api.forms.get.query>>;
  try {
    form = await api.forms.get.query({ id });
  } catch {
    notFound();
  }

  if (!form) {
    notFound();
  }

  return <FormEditor initialForm={form} />;
}
