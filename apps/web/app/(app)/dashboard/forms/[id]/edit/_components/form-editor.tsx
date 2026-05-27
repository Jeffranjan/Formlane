"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Globe,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { trpc } from "~/trpc/client";
import { cn } from "~/lib/utils";

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "number"
  | "single_select"
  | "multi_select"
  | "checkbox"
  | "dropdown"
  | "rating"
  | "date";

interface SelectOption {
  id: string;
  label: string;
}

interface FieldConfig {
  maxLength?: number;
  min?: number;
  max?: number;
  options?: SelectOption[];
  scaleMax?: number;
}

interface FormField {
  id?: string;
  type: FieldType;
  label: string;
  description?: string | null;
  required: boolean;
  order: number;
  page: number;
  config: FieldConfig;
}

interface FormValues {
  title: string;
  description: string;
  slug: string;
  fields: FormField[];
}

interface InitialForm {
  id: string;
  title: string;
  description?: string | null;
  status: "draft" | "published" | "unpublished";
  visibility: "public" | "unlisted";
  fields?: FormField[];
  slug?: string;
}

interface FormEditorProps {
  initialForm: InitialForm;
}

// ───────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ───────────────────────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  email: "Email",
  number: "Number",
  single_select: "Single select",
  multi_select: "Multi select",
  checkbox: "Checkbox",
  dropdown: "Dropdown",
  rating: "Rating",
  date: "Date",
};

const ALL_FIELD_TYPES: FieldType[] = [
  "short_text",
  "long_text",
  "email",
  "number",
  "single_select",
  "multi_select",
  "checkbox",
  "dropdown",
  "rating",
  "date",
];

function defaultConfigForType(type: FieldType): FieldConfig {
  switch (type) {
    case "single_select":
    case "multi_select":
    case "dropdown":
      return { options: [{ id: crypto.randomUUID(), label: "Option 1" }] };
    case "rating":
      return { scaleMax: 5 };
    default:
      return {};
  }
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

// ───────────────────────────────────────────────────────────────────────────
// Per-type config editor
// ───────────────────────────────────────────────────────────────────────────

interface FieldConfigEditorProps {
  field: FormField;
  index: number;
  onChange: (index: number, config: FieldConfig) => void;
}

function FieldConfigEditor({ field, index, onChange }: FieldConfigEditorProps) {
  const { type, config } = field;

  if (type === "short_text" || type === "long_text") {
    return (
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground">Max length</Label>
        <Input
          type="number"
          min={1}
          max={10000}
          placeholder="No limit"
          className="h-8 w-32 text-xs"
          value={config.maxLength ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange(index, {
              ...config,
              maxLength: val === "" ? undefined : parseInt(val, 10),
            });
          }}
        />
      </div>
    );
  }

  if (type === "number") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Min</Label>
          <Input
            type="number"
            placeholder="—"
            className="h-8 w-24 text-xs"
            value={config.min ?? ""}
            onChange={(e) =>
              onChange(index, {
                ...config,
                min: e.target.value === "" ? undefined : parseFloat(e.target.value),
              })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Max</Label>
          <Input
            type="number"
            placeholder="—"
            className="h-8 w-24 text-xs"
            value={config.max ?? ""}
            onChange={(e) =>
              onChange(index, {
                ...config,
                max: e.target.value === "" ? undefined : parseFloat(e.target.value),
              })
            }
          />
        </div>
      </div>
    );
  }

  if (
    type === "single_select" ||
    type === "multi_select" ||
    type === "dropdown"
  ) {
    const options: SelectOption[] = config.options ?? [];
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Options</Label>
        <AnimatePresence initial={false}>
          {options.map((opt, optIdx) => (
            <motion.div
              key={opt.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <Input
                className="h-8 text-sm"
                value={opt.label}
                placeholder={`Option ${optIdx + 1}`}
                onChange={(e) => {
                  const updated = options.map((o, i) =>
                    i === optIdx ? { ...o, label: e.target.value } : o,
                  );
                  onChange(index, { ...config, options: updated });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-red-300"
                disabled={options.length <= 1}
                onClick={() => {
                  const updated = options.filter((_, i) => i !== optIdx);
                  onChange(index, { ...config, options: updated });
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            const updated = [
              ...options,
              { id: crypto.randomUUID(), label: `Option ${options.length + 1}` },
            ];
            onChange(index, { ...config, options: updated });
          }}
        >
          <Plus className="size-3" />
          Add option
        </Button>
      </div>
    );
  }

  if (type === "rating") {
    return (
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground">Scale max</Label>
        <Input
          type="number"
          min={2}
          max={10}
          className="h-8 w-20 text-xs"
          value={config.scaleMax ?? 5}
          onChange={(e) =>
            onChange(index, {
              ...config,
              scaleMax: parseInt(e.target.value, 10),
            })
          }
        />
        <span className="text-xs text-muted-foreground/70">2–10 stars</span>
      </div>
    );
  }

  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Main editor component
// ───────────────────────────────────────────────────────────────────────────

export function FormEditor({ initialForm }: FormEditorProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formStatus, setFormStatus] = useState(initialForm.status);
  const [formVisibility, setFormVisibility] = useState(initialForm.visibility);

  const utils = trpc.useUtils();

  const { control, register, handleSubmit, setValue, watch } =
    useForm<FormValues>({
      defaultValues: {
        title: initialForm.title,
        description: initialForm.description ?? "",
        slug: initialForm.slug ?? "",
        fields: (initialForm.fields ?? []).map((f) => ({
          id: f.id,
          type: f.type,
          label: f.label,
          description: f.description ?? "",
          required: f.required,
          order: f.order,
          page: f.page ?? 0,
          config: f.config ?? {},
        })),
      },
    });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "fields",
  });

  // ── mutations ────────────────────────────────────────────────────────
  const updateForm = trpc.forms.update.useMutation({
    onSuccess: () => {
      toast.success("Form saved");
      utils.forms.listMine.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to save form"),
  });

  const publishForm = trpc.forms.publish.useMutation({
    onSuccess: () => {
      setFormStatus("published");
      toast.success("Form published");
      utils.forms.listMine.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to publish form"),
  });

  const unpublishForm = trpc.forms.unpublish.useMutation({
    onSuccess: () => {
      setFormStatus("unpublished");
      toast.success("Form unpublished");
      utils.forms.listMine.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to unpublish form"),
  });

  const deleteForm = trpc.forms.delete.useMutation({
    onSuccess: () => {
      toast.success("Form deleted");
      router.push("/dashboard");
    },
    onError: (err) => toast.error(err.message ?? "Failed to delete form"),
  });

  const updateVisibility = trpc.forms.updateVisibility.useMutation({
    onSuccess: () => {
      toast.success("Visibility updated");
      utils.forms.listMine.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to update visibility"),
  });

  // ── handlers ─────────────────────────────────────────────────────────
  const onSave = handleSubmit((values) => {
    const fieldsPayload = values.fields.map((f, idx) => ({
      ...(f.id ? { id: f.id } : {}),
      type: f.type,
      label: f.label,
      description: f.description || null,
      required: f.required,
      order: idx,
      page: f.page ?? 0,
      config: f.config,
    }));

    updateForm.mutate({
      id: initialForm.id,
      title: values.title,
      description: values.description || null,
      slug: values.slug.trim() || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fields: fieldsPayload as any,
    });
  });

  const handleAddField = useCallback(
    (type: FieldType) => {
      append({
        type,
        label: FIELD_TYPE_LABELS[type],
        description: "",
        required: false,
        order: fields.length,
        page: 0,
        config: defaultConfigForType(type),
      });
    },
    [append, fields.length],
  );

  const handleConfigChange = useCallback(
    (index: number, config: FieldConfig) => {
      setValue(`fields.${index}.config`, config);
    },
    [setValue],
  );

  const handleVisibilityToggle = (checked: boolean) => {
    const newVisibility = checked ? "public" : "unlisted";
    setFormVisibility(newVisibility);
    updateVisibility.mutate({
      id: initialForm.id,
      visibility: newVisibility,
    });
  };

  const watchedFields = watch("fields");

  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-6 pb-32 pt-2">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Dashboard
          </Button>
          <Badge className={cn("px-2 py-0.5", statusStyle(formStatus))}>
            {formStatus}
          </Badge>
          {initialForm.slug && (
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70 sm:inline">
              /f/{initialForm.slug}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Visibility toggle */}
          <label className="surface-1 flex h-9 items-center gap-2.5 rounded-lg px-3">
            {formVisibility === "public" ? (
              <Globe className="size-3.5 text-emerald-300" />
            ) : (
              <EyeOff className="size-3.5 text-muted-foreground" />
            )}
            <span className="text-[13px] font-medium">
              {formVisibility === "public" ? "Public" : "Unlisted"}
            </span>
            <Switch
              checked={formVisibility === "public"}
              onCheckedChange={handleVisibilityToggle}
              disabled={updateVisibility.isPending}
            />
          </label>

          {/* Publish / Unpublish */}
          {formStatus !== "published" ? (
            <Button
              size="sm"
              onClick={() => publishForm.mutate({ id: initialForm.id })}
              disabled={publishForm.isPending}
            >
              {publishForm.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {publishForm.isPending ? "Publishing…" : "Publish"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => unpublishForm.mutate({ id: initialForm.id })}
              disabled={unpublishForm.isPending}
            >
              <EyeOff className="size-3.5" />
              {unpublishForm.isPending ? "Unpublishing…" : "Unpublish"}
            </Button>
          )}

          {/* Save */}
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            disabled={updateForm.isPending}
          >
            {updateForm.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {updateForm.isPending ? "Saving…" : "Save"}
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-red-300"
            aria-label="Delete form"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Form details ────────────────────────────────────── */}
      <section className="surface-1 mb-6 space-y-4 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-amber-300" />
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
            Form details
          </h2>
        </div>

        <div className="space-y-3">
          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Untitled form"
                className="h-12 border-transparent bg-transparent px-0 text-2xl font-display font-semibold tracking-tight shadow-none hover:border-transparent focus-visible:border-amber-400/40 focus-visible:bg-white/[0.02] focus-visible:px-3"
              />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Add a short description to set the tone…"
                rows={2}
                className="border-transparent bg-transparent px-0 text-base shadow-none focus-visible:border-amber-400/40 focus-visible:bg-white/[0.02] focus-visible:px-3"
              />
            )}
          />
        </div>

        <div className="space-y-1.5 border-t border-white/[0.05] pt-4">
          <Label htmlFor="form-slug" className="text-xs text-muted-foreground">
            Custom URL slug
            <span className="ml-1 text-muted-foreground/60 font-normal">
              · letters, numbers, hyphens
            </span>
          </Label>
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-muted-foreground">/f/</span>
            <Input
              id="form-slug"
              placeholder="my-custom-slug"
              className="font-mono"
              {...register("slug")}
            />
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Leave blank to keep the current slug. Must be unique.
          </p>
        </div>
      </section>

      {/* ── Fields ────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold tracking-tight">
          Fields{" "}
          <span className="text-muted-foreground/70 font-normal">
            ({fields.length})
          </span>
        </h2>
      </div>

      <LayoutGroup>
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {fields.map((field, index) => (
              <motion.li
                key={field.id}
                layout
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -16, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="surface-1 group relative rounded-2xl p-5 transition-colors hover:bg-white/[0.04]"
              >
                {/* Field header row */}
                <div className="flex items-start gap-2.5">
                  {/* Drag handle (visual) + reorder */}
                  <div className="flex flex-col items-center gap-0.5 pt-1.5">
                    <span
                      className="text-muted-foreground/50"
                      aria-hidden
                    >
                      <GripVertical className="size-3.5" />
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-6 text-muted-foreground"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      aria-label="Move field up"
                    >
                      <ChevronUp className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-6 text-muted-foreground"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                      aria-label="Move field down"
                    >
                      <ChevronDown className="size-3" />
                    </Button>
                  </div>

                  {/* Label + description */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <Controller
                      control={control}
                      name={`fields.${index}.label`}
                      render={({ field: f }) => (
                        <Input
                          {...f}
                          placeholder="Field label"
                          className="h-9 border-transparent bg-transparent px-0 text-base font-medium shadow-none focus-visible:border-amber-400/40 focus-visible:bg-white/[0.02] focus-visible:px-3"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name={`fields.${index}.description`}
                      render={({ field: f }) => (
                        <Input
                          {...f}
                          value={f.value ?? ""}
                          placeholder="Helper text (optional)"
                          className="h-8 border-transparent bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:border-amber-400/40 focus-visible:bg-white/[0.02] focus-visible:px-3"
                        />
                      )}
                    />
                  </div>

                  {/* Type selector */}
                  <Controller
                    control={control}
                    name={`fields.${index}.type`}
                    render={({ field: f }) => (
                      <Select
                        value={f.value}
                        onValueChange={(val) => {
                          f.onChange(val);
                          setValue(
                            `fields.${index}.config`,
                            defaultConfigForType(val as FieldType),
                          );
                        }}
                      >
                        <SelectTrigger className="h-9 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_FIELD_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {FIELD_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-red-300"
                    onClick={() => remove(index)}
                    aria-label="Remove field"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Per-type config */}
                <div className="mt-4 ml-7 border-t border-white/[0.05] pt-4">
                  <FieldConfigEditor
                    field={watchedFields[index] ?? field}
                    index={index}
                    onChange={handleConfigChange}
                  />
                </div>

                {/* Required toggle */}
                <div className="ml-7 mt-3 flex items-center gap-2">
                  <Controller
                    control={control}
                    name={`fields.${index}.required`}
                    render={({ field: f }) => (
                      <Switch
                        id={`required-${field.id}`}
                        checked={f.value}
                        onCheckedChange={f.onChange}
                      />
                    )}
                  />
                  <Label
                    htmlFor={`required-${field.id}`}
                    className="cursor-pointer text-xs text-muted-foreground"
                  >
                    Required
                  </Label>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </LayoutGroup>

      {/* ── Add field ─────────────────────────────────────── */}
      <div className="surface-1 mt-5 rounded-2xl p-5">
        <p className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
          <Plus className="size-3" />
          Add field
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_FIELD_TYPES.map((type) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleAddField(type)}
            >
              <Plus className="size-3" />
              {FIELD_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Floating sticky save bar ─────────────────────── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4 sm:bottom-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/[0.08] bg-[rgba(17,18,20,0.85)] px-2 py-2 shadow-[0_18px_44px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="rounded-full text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={updateForm.isPending}
            className="rounded-full"
          >
            {updateForm.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {updateForm.isPending ? "Saving…" : "Save changes"}
          </Button>
        </motion.div>
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete form</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;
              {watch("title") || "this form"}&rdquo;? This will permanently
              remove the form and all its responses. This action cannot be
              undone.
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
              onClick={() => deleteForm.mutate({ id: initialForm.id })}
              disabled={deleteForm.isPending}
            >
              {deleteForm.isPending ? "Deleting…" : "Delete form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
