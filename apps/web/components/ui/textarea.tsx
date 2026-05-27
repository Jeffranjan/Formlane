import * as React from "react"

import { cn } from "~/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-lg border bg-white/[0.03] px-3.5 py-2.5 text-sm text-foreground",
        "border-white/[0.08]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        "placeholder:text-muted-foreground/70",
        "selection:bg-violet-500/40 selection:text-white",
        "transition-[border-color,box-shadow,background-color] duration-200",
        "hover:border-white/[0.14]",
        "focus-visible:outline-none focus-visible:border-indigo-400/60 focus-visible:bg-white/[0.05]",
        "focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.18)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-red-500/60 aria-invalid:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
