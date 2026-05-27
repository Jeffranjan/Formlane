"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontalIcon,
  PencilIcon,
  BarChart2Icon,
  LineChartIcon,
  LinkIcon,
  QrCodeIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { trpc } from "~/trpc/client";

interface FormRowActionsProps {
  formId: string;
  formSlug: string;
  formTitle: string;
  formStatus?: string;
}

export function FormRowActions({ formId, formSlug, formTitle, formStatus }: FormRowActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const deleteForm = trpc.forms.delete.useMutation({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      utils.forms.listMine.invalidate();
    },
  });

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/f/${formSlug}`
    : `/f/${formSlug}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`;

  function handleCopyLink() {
    const url = `${window.location.origin}/f/${formSlug}`;
    navigator.clipboard.writeText(url);
  }

  const isPublished = formStatus === "published";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Row actions"
            className="size-8 shrink-0 rounded-lg border border-transparent text-muted-foreground hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-foreground"
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/dashboard/forms/${formId}/edit`)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/dashboard/forms/${formId}/responses`)}>
            <BarChart2Icon />
            View responses
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/dashboard/forms/${formId}/analytics`)}>
            <LineChartIcon />
            View analytics
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <LinkIcon />
            Copy public link
          </DropdownMenuItem>
          {isPublished && (
            <DropdownMenuItem onClick={() => setQrDialogOpen(true)}>
              <QrCodeIcon />
              QR code
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* QR Code Dialog — only rendered for published forms */}
      {isPublished && (
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>QR code</DialogTitle>
              <DialogDescription>
                Scan to open &ldquo;{formTitle}&rdquo;
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt={`QR code for ${formTitle}`}
                width={200}
                height={200}
                className="rounded-lg border"
              />
              <p className="text-muted-foreground max-w-[240px] break-all text-center text-xs">
                {publicUrl}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={handleCopyLink}>
                <LinkIcon className="mr-1.5 h-4 w-4" />
                Copy link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{formTitle}&rdquo;? This will permanently
              remove the form and all its responses. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteForm.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteForm.mutate({ id: formId })}
              disabled={deleteForm.isPending}
            >
              {deleteForm.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
