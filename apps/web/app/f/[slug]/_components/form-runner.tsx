"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Loader2, Star } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { trpc } from "~/trpc/client";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "@repo/trpc/client";

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

type PublicForm = RouterOutputs["forms"]["getPublicBySlug"];
type Field = PublicForm["fields"][number];

interface FormRunnerProps {
  form: PublicForm;
  slug: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Validation (mirrors server)
// ───────────────────────────────────────────────────────────────────────────

function validateField(field: Field, value: unknown): string | null {
  const cfg = (field as { config?: Record<string, unknown> }).config ?? {};

  if (field.required) {
    if (value === undefined || value === null || value === "")
      return "This field is required.";
    if (Array.isArray(value) && value.length === 0)
      return "Please select at least one option.";
  }

  if (value === undefined || value === null || value === "") return null;

  switch (field.type) {
    case "short_text":
    case "long_text": {
      const maxLength = cfg.maxLength as number | undefined;
      if (
        maxLength != null &&
        typeof value === "string" &&
        value.length > maxLength
      ) {
        return `Maximum ${maxLength} characters allowed.`;
      }
      break;
    }
    case "email": {
      if (
        typeof value === "string" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        return "Please enter a valid email address.";
      }
      break;
    }
    case "number": {
      const num = Number(value);
      if (isNaN(num)) return "Please enter a valid number.";
      const min = cfg.min as number | undefined;
      const max = cfg.max as number | undefined;
      if (min != null && num < min) return `Minimum value is ${min}.`;
      if (max != null && num > max) return `Maximum value is ${max}.`;
      break;
    }
  }

  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Field renderers
// ───────────────────────────────────────────────────────────────────────────

interface FieldInputProps {
  field: Field;
  value: unknown;
  onChange: (val: unknown) => void;
  error: string | null;
  disabled: boolean;
}

function FieldInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const inputId = useId();
  const cfg = (field as { config?: Record<string, unknown> }).config ?? {};
  const hasError = !!error;

  switch (field.type) {
    case "short_text":
      return (
        <Input
          id={inputId}
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={cfg.maxLength as number | undefined}
          disabled={disabled}
          aria-invalid={hasError}
          className="h-12 text-base"
          placeholder="Type your answer…"
        />
      );

    case "long_text":
      return (
        <Textarea
          id={inputId}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={cfg.maxLength as number | undefined}
          disabled={disabled}
          aria-invalid={hasError}
          rows={4}
          className="text-base"
          placeholder="Type your answer…"
        />
      );

    case "email":
      return (
        <Input
          id={inputId}
          type="email"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={hasError}
          className="h-12 text-base"
          placeholder="you@example.com"
        />
      );

    case "number":
      return (
        <Input
          id={inputId}
          type="number"
          value={(value as string) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : e.target.value)
          }
          min={cfg.min as number | undefined}
          max={cfg.max as number | undefined}
          disabled={disabled}
          aria-invalid={hasError}
          className="h-12 text-base"
          placeholder="0"
        />
      );

    case "date":
      return (
        <Input
          id={inputId}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={hasError}
          className="h-12 text-base"
        />
      );

    case "single_select": {
      const options = (cfg.options as Array<{ id: string; label: string }>) ?? [];
      const selected = (value as string) ?? "";
      return (
        <RadioGroup
          value={selected}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
          aria-invalid={hasError}
          className="grid gap-2"
        >
          {options.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <Label
                key={opt.id}
                htmlFor={`${inputId}-${opt.id}`}
                className={cn(
                  "group flex cursor-pointer items-center gap-3 rounded-xl border bg-white/[0.02] px-4 py-3 text-base transition-all",
                  isSelected
                    ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]"
                    : "border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04]",
                )}
              >
                <RadioGroupItem
                  value={opt.id}
                  id={`${inputId}-${opt.id}`}
                  className="size-5"
                />
                <span className="font-normal">{opt.label}</span>
              </Label>
            );
          })}
        </RadioGroup>
      );
    }

    case "multi_select": {
      const options = (cfg.options as Array<{ id: string; label: string }>) ?? [];
      const selected = (value as string[]) ?? [];
      return (
        <div className="grid gap-2" role="group">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <Label
                key={opt.id}
                htmlFor={`${inputId}-${opt.id}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border bg-white/[0.02] px-4 py-3 text-base transition-all",
                  isSelected
                    ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]"
                    : "border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04]",
                )}
              >
                <Checkbox
                  id={`${inputId}-${opt.id}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    onChange(
                      checked
                        ? [...selected, opt.id]
                        : selected.filter((s) => s !== opt.id),
                    );
                  }}
                  disabled={disabled}
                  className="size-5"
                />
                <span className="font-normal">{opt.label}</span>
              </Label>
            );
          })}
        </div>
      );
    }

    case "checkbox": {
      return (
        <Label
          htmlFor={inputId}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border bg-white/[0.02] px-4 py-3 text-base transition-all",
            value
              ? "border-amber-400/50 bg-amber-500/10"
              : "border-white/[0.06] hover:border-white/[0.14]",
          )}
        >
          <Checkbox
            id={inputId}
            checked={(value as boolean) ?? false}
            onCheckedChange={(checked) => onChange(!!checked)}
            disabled={disabled}
            aria-invalid={hasError}
            className="size-5"
          />
          <span className="font-normal">{field.label}</span>
        </Label>
      );
    }

    case "dropdown": {
      const options = (cfg.options as Array<{ id: string; label: string }>) ?? [];
      return (
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger className="h-12 w-full text-base" aria-invalid={hasError}>
            <SelectValue placeholder="Select an option…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case "rating": {
      const scaleMax = (cfg.scaleMax as number) ?? 5;
      const current = (value as number) ?? 0;
      return (
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label={`Rating out of ${scaleMax}`}
        >
          {Array.from({ length: scaleMax }, (_, i) => i + 1).map((star) => {
            const isPressed = current >= star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                disabled={disabled}
                aria-label={`${star} star${star !== 1 ? "s" : ""}${isPressed ? " (selected)" : ""}`}
                className={cn(
                  "group inline-flex size-11 items-center justify-center rounded-xl border transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
                  isPressed
                    ? "border-amber-400/40 bg-amber-400/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]",
                  "active:scale-95",
                )}
              >
                <Star
                  className={cn(
                    "size-5 transition-all",
                    isPressed
                      ? "fill-amber-300 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]"
                      : "fill-none text-muted-foreground/50 group-hover:text-foreground/70",
                  )}
                />
              </button>
            );
          })}
        </div>
      );
    }

    default:
      return null;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// FormRunner
// ───────────────────────────────────────────────────────────────────────────

const SESSION_KEY_PREFIX = "chai_submitted_";

export function FormRunner({ form, slug }: FormRunnerProps) {
  const router = useRouter();
  const sessionKey = `${SESSION_KEY_PREFIX}${slug}`;

  const alreadySubmitted =
    typeof window !== "undefined" && !!sessionStorage.getItem(sessionKey);

  const sortedFields = useMemo(
    () =>
      [...form.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [form.fields],
  );

  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of form.fields) {
      if (!field.id) continue;
      if (field.type === "multi_select") initial[field.id] = [];
      else if (field.type === "checkbox") initial[field.id] = false;
      else initial[field.id] = "";
    }
    return initial;
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(alreadySubmitted);

  const submitMutation = trpc.submissions.submit.useMutation({
    onSuccess: (data) => {
      sessionStorage.setItem(sessionKey, data.submissionId);
      router.push(`/f/${slug}/thanks`);
    },
    onError: (err) => {
      const cause = (err as { data?: { cause?: unknown } }).data?.cause;
      if (cause && typeof cause === "object") {
        setFieldErrors(cause as Record<string, string>);
      } else {
        setFormError(err.message ?? "Something went wrong. Please try again.");
      }
    },
  });

  const handleChange = useCallback((fieldId: string, val: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: val }));
    setFieldErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  // Progress calculation — counts non-empty answers for required + answered fields
  const progress = useMemo(() => {
    const total = sortedFields.length;
    if (total === 0) return 0;
    let filled = 0;
    for (const field of sortedFields) {
      if (!field.id) continue;
      const v = answers[field.id];
      if (Array.isArray(v) ? v.length > 0 : v === true || (v != null && v !== "")) {
        filled += 1;
      }
    }
    return Math.round((filled / total) * 100);
  }, [answers, sortedFields]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (blocked) return;

    const errors: Record<string, string> = {};
    for (const field of form.fields) {
      if (!field.id) continue;
      const err = validateField(field, answers[field.id]);
      if (err) errors[field.id] = err;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    submitMutation.mutate({
      slug,
      answers,
      __hp: "",
    });
  }

  if (blocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="surface-1 rounded-3xl px-8 py-12 text-center"
      >
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="size-5 text-emerald-300" />
        </div>
        <p className="text-base text-foreground">
          You've already submitted this form.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Thanks for your response.
        </p>
      </motion.div>
    );
  }

  const isSubmitting = submitMutation.isPending;

  return (
    <div className="relative">
      {/* Progress bar (top-fixed feel) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-x-0 top-0 z-30 h-1 bg-white/[0.04]"
      >
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 shadow-[0_0_12px_rgba(217,119,6,0.5)]"
        />
      </motion.div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="border-gradient relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[rgba(17,18,20,0.78)] p-8 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] sm:p-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245,158,11,0.15), transparent 70%)",
          }}
        />

        {/* Header */}
        <header className="mb-8 space-y-2">
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-base leading-relaxed text-muted-foreground">
              {form.description}
            </p>
          )}
        </header>

        {/* Top-level error */}
        {formError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-7">
          {/* Honeypot */}
          <input
            type="text"
            name="__hp"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden opacity-0"
            defaultValue=""
          />

          {sortedFields.map((field, idx) => {
            if (!field.id) return null;
            const fieldId = field.id;
            const error = fieldErrors[fieldId] ?? null;
            const isCheckbox = field.type === "checkbox";

            return (
              <motion.div
                key={fieldId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.06 * idx,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="space-y-2"
              >
                {!isCheckbox && (
                  <Label
                    htmlFor={`field-${fieldId}`}
                    className="flex items-baseline gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-foreground/90">{field.label}</span>
                    {field.required && (
                      <span className="text-red-400" aria-hidden>
                        *
                      </span>
                    )}
                  </Label>
                )}
                {field.description && !isCheckbox && (
                  <p className="text-sm text-muted-foreground">
                    {field.description}
                  </p>
                )}
                <FieldInput
                  field={field}
                  value={answers[fieldId]}
                  onChange={(val) => handleChange(fieldId, val)}
                  error={error}
                  disabled={isSubmitting}
                />
                {error && (
                  <p
                    role="alert"
                    className="text-xs text-red-300"
                    id={`field-${fieldId}-error`}
                  >
                    {error}
                  </p>
                )}
              </motion.div>
            );
          })}

          {/* Submit */}
          <div className="flex items-center justify-between border-t border-white/[0.05] pt-6">
            <p className="text-xs text-muted-foreground tabular-nums">
              {progress}% complete
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {isSubmitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Footer credit */}
      <p className="mt-6 text-center text-xs text-muted-foreground/60">
        Powered by <span className="text-foreground/80">Formlane</span>
      </p>
    </div>
  );
}
