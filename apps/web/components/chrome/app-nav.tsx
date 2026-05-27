"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { LayoutDashboard, Compass, CreditCard, LogOut, User } from "lucide-react";
import { cn } from "~/lib/utils";
import { Logo } from "./logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { trpc } from "~/trpc/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
] as const;

interface AppNavProps {
  user: {
    email?: string | null;
    fullName?: string | null;
  };
}

export function AppNav({ user }: AppNavProps) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => {
    setScrolled(v > 12);
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const r = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(r);
  }, []);

  const signOut = trpc.auth.signOut.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const initials = (user.fullName || user.email || "U")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: mounted ? 1 : 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-5"
    >
      <motion.nav
        initial={false}
        animate={{
          width: scrolled ? "min(100%, 760px)" : "min(100%, 960px)",
        }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "pointer-events-auto relative flex h-12 items-center justify-between gap-3 rounded-full border px-2 sm:h-13 sm:px-3 transition-colors",
          scrolled
            ? "border-white/[0.08] bg-[rgba(17,18,20,0.78)] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            : "border-white/[0.05] bg-[rgba(17,18,20,0.45)] backdrop-blur-md",
        )}
      >
        <div className="flex items-center gap-2 pl-1">
          <Logo />
        </div>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              pathname?.startsWith(item.href + "/") ||
              false;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:px-3",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="app-nav-pill"
                    className="absolute inset-0 rounded-full bg-white/[0.07]"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                  />
                )}
                <Icon className="relative size-3.5" />
                <span className="relative hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Account menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className={cn(
                "group relative inline-flex size-8 items-center justify-center overflow-hidden rounded-full border border-white/10 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                "bg-gradient-to-br from-indigo-500/80 via-violet-500/80 to-cyan-500/80",
                "shadow-[0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_24px_-6px_rgba(139,92,246,0.55)]",
              )}
            >
              <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                {initials || "U"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {user.fullName ?? "Signed in"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/explore">
                <Compass className="size-4" />
                Explore
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut.mutate()}
              disabled={signOut.isPending}
              variant="destructive"
            >
              <LogOut className="size-4" />
              {signOut.isPending ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.nav>
    </motion.header>
  );
}

// Re-export icon for external use
export { User };
