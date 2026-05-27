"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { Logo } from "./logo";

const NAV_ITEMS = [
  { href: "/explore", label: "Explore" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function MarketingNav() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => {
    setScrolled(v > 12);
  });

  // Mount-in animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(t);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: mounted ? 1 : 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-5"
    >
      <motion.nav
        initial={false}
        animate={{
          width: scrolled ? "min(100%, 720px)" : "min(100%, 920px)",
          paddingLeft: scrolled ? 12 : 16,
          paddingRight: scrolled ? 12 : 16,
        }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "pointer-events-auto relative flex items-center justify-between gap-4 rounded-full border transition-colors",
          "h-12 sm:h-13",
          scrolled
            ? "border-white/[0.08] bg-[rgba(17,18,20,0.78)] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            : "border-white/[0.05] bg-[rgba(17,18,20,0.45)] backdrop-blur-md",
        )}
      >
        <Logo />

        {/* Center pill nav */}
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              pathname?.startsWith(item.href + "/") ||
              false;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="marketing-nav-pill"
                    className="absolute inset-0 rounded-full bg-white/[0.06]"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* CTA cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/sign-in"
            className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className={cn(
              "shimmer group inline-flex items-center gap-1 overflow-hidden rounded-full px-3.5 py-1.5 text-[13px] font-medium text-black",
              "border border-amber-400/20",
              "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400",
              "shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_8px_24px_-8px_rgba(245,158,11,0.55)]",
              "transition-transform duration-200 hover:-translate-y-px active:translate-y-0",
            )}
          >
            <span>Start free</span>
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </motion.nav>
    </motion.header>
  );
}
