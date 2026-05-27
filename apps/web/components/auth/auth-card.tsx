"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="border-gradient relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[rgba(17,18,20,0.72)] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(99,102,241,0.18), transparent 70%)",
        }}
      />
      <div className="space-y-1.5">
        <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-6 space-y-4">{children}</div>
      {footer && (
        <div className="mt-6 border-t border-white/[0.06] pt-5 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </motion.div>
  );
}

export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="relative my-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-white/[0.06]" />
      </div>
      <div className="relative flex justify-center text-[11px] uppercase tracking-[0.18em]">
        <span className="bg-[rgba(17,18,20,0.85)] px-3 text-muted-foreground/70">
          {children}
        </span>
      </div>
    </div>
  );
}
