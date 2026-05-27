import Link from "next/link";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";
import { AmbientBackground } from "~/components/chrome/ambient-background";
import { Logo } from "~/components/chrome/logo";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await api.auth.me.query();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col px-4">
      <AmbientBackground variant="marketing" />

      <header className="flex items-center justify-between py-5">
        <Logo />
        <Link
          href="/"
          className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to home
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground/60">
        © {new Date().getFullYear()} Formlane. Crafted with care.
      </footer>
    </div>
  );
}
