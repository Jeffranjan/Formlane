"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarRange,
  Filter,
  Loader2,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { trpc } from "~/trpc/client";
import { cn } from "~/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

interface FormField {
  id: string;
  label: string;
  type: string;
}

interface Answer {
  id: string;
  responseId: string;
  fieldId: string;
  value?: unknown;
}

interface Response {
  id: string;
  formId: string;
  createdAt: string | Date | null;
  ipHash: string | null;
  userAgent: string | null;
  answers: Answer[];
}

interface ResponsesTableProps {
  formId: string;
  formTitle: string;
  fields: FormField[];
  initialResponses: Response[];
  initialTotal: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ResponsesTable({
  formId,
  formTitle,
  fields,
  initialResponses,
  initialTotal,
}: ResponsesTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterFieldId, setFilterFieldId] = useState<string>("__all__");
  const [filterFieldValue, setFilterFieldValue] = useState("");
  const [filtersApplied, setFiltersApplied] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const buildFilter = () => {
    const filter: {
      dateFrom?: Date;
      dateTo?: Date;
      fieldAnswers?: { fieldId: string; value: unknown }[];
    } = {};
    if (dateFrom) filter.dateFrom = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      filter.dateTo = end;
    }
    if (filterFieldId !== "__all__" && filterFieldValue.trim()) {
      filter.fieldAnswers = [
        { fieldId: filterFieldId, value: filterFieldValue.trim() },
      ];
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  };

  const hasActiveFilter =
    !!dateFrom ||
    !!dateTo ||
    (filterFieldId !== "__all__" && !!filterFieldValue.trim());

  const query = trpc.responses.listForForm.useQuery(
    {
      formId,
      page,
      pageSize: 25,
      filter: filtersApplied ? buildFilter() : undefined,
    },
    { refetchOnWindowFocus: false },
  );

  const responses: Response[] = (query.data?.items ?? initialResponses) as Response[];
  const total = query.data?.total ?? initialTotal;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  const utils = trpc.useUtils();

  const deleteResponse = trpc.responses.delete.useMutation({
    onSuccess: () => {
      toast.success("Response deleted");
      setDeleteTarget(null);
      utils.responses.listForForm.invalidate({ formId });
      startTransition(() => router.refresh());
    },
    onError: (err) => toast.error(err.message ?? "Failed to delete response"),
  });

  function handleApplyFilters() {
    setPage(1);
    setFiltersApplied(true);
    utils.responses.listForForm.invalidate({ formId });
  }

  function handleClearFilters() {
    setDateFrom("");
    setDateTo("");
    setFilterFieldId("__all__");
    setFilterFieldValue("");
    setPage(1);
    setFiltersApplied(false);
    utils.responses.listForForm.invalidate({ formId });
  }

  return (
    <div className="space-y-4">
      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="surface-1 rounded-2xl">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilter && (
              <Badge className="border-indigo-500/30 bg-indigo-500/15 text-indigo-200">
                Active
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="text-muted-foreground"
          >
            <SlidersHorizontal className="size-3.5" />
            {showFilters ? "Hide" : "Show"}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.05] px-5 py-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarRange className="size-3" />
                      From date
                    </Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarRange className="size-3" />
                      To date
                    </Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  {fields.length > 0 && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Field
                        </Label>
                        <Select
                          value={filterFieldId}
                          onValueChange={setFilterFieldId}
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">All fields</SelectItem>
                            {fields.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Value contains
                        </Label>
                        <Input
                          type="text"
                          placeholder="Match value…"
                          value={filterFieldValue}
                          onChange={(e) =>
                            setFilterFieldValue(e.target.value)
                          }
                          disabled={filterFieldId === "__all__"}
                          className="h-9"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleApplyFilters}
                    disabled={query.isFetching}
                  >
                    Apply filters
                  </Button>
                  {(filtersApplied || hasActiveFilter) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearFilters}
                    >
                      <X className="size-3.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Summary ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          {query.isFetching ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-3 animate-spin" />
              Loading…
            </span>
          ) : (
            <>
              <span className="font-medium text-foreground tabular-nums">
                {total}
              </span>
              {" "}
              response{total === 1 ? "" : "s"}
              {filtersApplied && " (filtered)"}
            </>
          )}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || query.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      {responses.length === 0 ? (
        <div className="surface-1 rounded-2xl px-8 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {filtersApplied
              ? "No responses match the current filters."
              : `${formTitle} hasn't received any responses yet.`}
          </p>
        </div>
      ) : (
        <div className="surface-1 overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.015]">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                  Submitted
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                  Answer summary
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {responses.map((response) => (
                <tr
                  key={response.id}
                  className="group border-b border-white/[0.04] transition-colors last:border-b-0 hover:bg-white/[0.025]"
                >
                  <td className="whitespace-nowrap px-5 py-3.5 align-top text-sm tabular-nums text-muted-foreground">
                    {response.createdAt
                      ? format(new Date(response.createdAt), "MMM d, yyyy · HH:mm")
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 align-top">
                    <AnswerSummary answers={response.answers} fields={fields} />
                  </td>
                  <td className="px-5 py-3.5 text-right align-top">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete response"
                      className={cn(
                        "size-8 rounded-lg border border-transparent text-muted-foreground",
                        "opacity-0 transition-all group-hover:opacity-100",
                        "hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-300",
                      )}
                      onClick={() => setDeleteTarget(response.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete response</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this response? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteResponse.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteResponse.isPending}
              onClick={() => {
                if (deleteTarget)
                  deleteResponse.mutate({ id: deleteTarget, formId });
              }}
            >
              {deleteResponse.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Answer summary cell ──────────────────────────────────────────────────

function AnswerSummary({
  answers,
  fields,
}: {
  answers: Answer[];
  fields: FormField[];
}) {
  if (answers.length === 0) {
    return (
      <span className="italic text-muted-foreground">No answers</span>
    );
  }

  const preview = answers.slice(0, 3);
  const overflow = answers.length - preview.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {preview.map((a) => {
        const field = fields.find((f) => f.id === a.fieldId);
        const label = field?.label ?? "Field";
        return (
          <span
            key={a.id}
            className="inline-flex max-w-[260px] items-center gap-1 rounded-md border border-white/[0.05] bg-white/[0.025] px-2 py-0.5 text-[12px]"
          >
            <span className="text-muted-foreground/80">{label}:</span>
            <span className="truncate text-foreground">
              {formatAnswerValue(a.value)}
            </span>
          </span>
        );
      })}
      {overflow > 0 && (
        <Badge variant="outline" className="px-2 py-0.5">
          +{overflow} more
        </Badge>
      )}
    </div>
  );
}
