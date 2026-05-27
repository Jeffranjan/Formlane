"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { trpc } from "~/trpc/client";

interface ExportCsvButtonProps {
  formId: string;
  formTitle: string;
}

export function ExportCsvButton({ formId, formTitle }: ExportCsvButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = trpc.responses.exportCsv.useQuery(
    { formId },
    { enabled: false },
  );

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await exportCsv.refetch();
      if (!result.data?.csv) return;
      const blob = new Blob([result.data.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${formTitle
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()}-responses.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Download className="size-3.5" />
      )}
      {isExporting ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
