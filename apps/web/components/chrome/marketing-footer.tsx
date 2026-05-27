import Link from "next/link";
import { Logo } from "./logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-background/40 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Forms that feel premium. Built for creators who care about craft,
            data, and clarity.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm sm:grid-cols-3">
          <FooterCol
            title="Product"
            links={[
              { href: "/explore", label: "Explore" },
              { href: "/pricing", label: "Pricing" },
              { href: "/sign-up", label: "Sign up" },
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              { href: "/sign-in", label: "Sign in" },
              { href: "/sign-up", label: "Create account" },
              { href: "/dashboard", label: "Dashboard" },
            ]}
          />
          <FooterCol
            title="Resources"
            links={[
              { href: "/", label: "Home" },
              { href: "/explore", label: "Templates" },
              { href: "/pricing", label: "Pricing" },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl items-center justify-between border-t border-white/[0.05] pt-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Formlane. Crafted with care.</span>
        <span className="font-mono opacity-60">v0.1.0</span>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {title}
      </p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-foreground/80 transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
