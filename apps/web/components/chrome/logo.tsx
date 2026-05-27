import Link from "next/link";
import { cn } from "~/lib/utils";

export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  href?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="Formlane — home"
      className={cn(
        "group inline-flex items-center gap-2.5 select-none focus-visible:outline-none",
        className,
      )}
    >
      <span
        aria-hidden
        className="relative inline-flex size-7 items-center justify-center overflow-hidden rounded-[8px] border border-amber-400/20 bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 shadow-[0_0_24px_-6px_rgba(245,158,11,0.6)] transition-shadow duration-300 group-hover:shadow-[0_0_32px_-4px_rgba(251,183,36,0.7)]"
      >
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_55%)]"
        />
        <span className="relative font-display text-[13px] font-bold leading-none text-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
          F
        </span>
      </span>
      {showWordmark && (
        <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
          Formlane
        </span>
      )}
    </Link>
  );
}
