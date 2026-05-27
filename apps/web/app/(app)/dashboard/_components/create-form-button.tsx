"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { trpc } from "~/trpc/client";

export function CreateFormButton({
  size = "default",
}: {
  size?: "default" | "lg";
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const createForm = trpc.forms.create.useMutation({
    onSuccess: (form) => {
      router.push(`/dashboard/forms/${form.id}/edit`);
    },
    onError: () => setIsCreating(false),
  });

  function handleCreate() {
    setIsCreating(true);
    createForm.mutate({ title: "Untitled Form" });
  }

  return (
    <Button onClick={handleCreate} disabled={isCreating} size={size}>
      {isCreating ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Creating…
        </>
      ) : (
        <>
          <Plus className="size-4" />
          New form
        </>
      )}
    </Button>
  );
}
