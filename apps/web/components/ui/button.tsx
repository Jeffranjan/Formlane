import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "shrink-0 outline-none select-none",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
    "active:translate-y-[0.5px]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "text-black border border-amber-400/20 overflow-hidden",
          "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400",
          "shadow-[0_0_0_1px_rgba(245,158,11,0.18),0_8px_24px_-10px_rgba(245,158,11,0.55)]",
          "hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(251,183,36,0.30),0_14px_34px_-12px_rgba(245,158,11,0.7)]",
          "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.30),transparent_50%)] before:pointer-events-none",
          "after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:pointer-events-none after:transition-transform after:duration-700 after:ease-out hover:after:translate-x-full",
        ].join(" "),
        destructive:
          "bg-destructive/90 text-white border border-destructive/40 hover:bg-destructive shadow-[0_6px_20px_-8px_rgba(220,38,38,0.5)] hover:-translate-y-px focus-visible:ring-destructive/40",
        outline:
          "border border-white/[0.08] bg-white/[0.03] text-foreground hover:bg-white/[0.06] hover:border-white/[0.15] hover:-translate-y-px backdrop-blur-sm",
        secondary:
          "border border-white/[0.06] bg-white/[0.04] text-foreground hover:bg-white/[0.08] hover:border-white/[0.12]",
        ghost:
          "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
        link:
          "text-foreground underline-offset-4 hover:underline px-0 h-auto",
        soft:
          "border border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15 hover:border-amber-500/40",
      },
      size: {
        default: "h-9 px-4 has-[>svg]:px-3.5",
        sm: "h-8 rounded-md gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-11 px-6 rounded-xl text-[15px] has-[>svg]:px-5",
        xl: "h-12 px-7 rounded-xl text-[15px] has-[>svg]:px-6",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
