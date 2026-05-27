import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide w-fit shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-amber-500/30 bg-amber-500/15 text-amber-200 [a&]:hover:bg-amber-500/25",
        secondary:
          "border-white/[0.08] bg-white/[0.05] text-foreground/90 [a&]:hover:bg-white/[0.08]",
        destructive:
          "border-red-500/30 bg-red-500/15 text-red-200 [a&]:hover:bg-red-500/25",
        outline:
          "border-white/[0.10] bg-transparent text-foreground/80 [a&]:hover:bg-white/[0.04]",
        success:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 [a&]:hover:bg-emerald-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
