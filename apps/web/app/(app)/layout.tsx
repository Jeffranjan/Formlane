import { redirect } from "next/navigation";
import { api } from "~/trpc/server";
import { AmbientBackground } from "~/components/chrome/ambient-background";
import { AppNav } from "~/components/chrome/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await api.auth.me.query();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="relative min-h-screen">
      <AmbientBackground variant="subtle" />
      <AppNav user={{ email: user.email, fullName: user.fullName }} />
      <main className="relative pt-24 sm:pt-28">{children}</main>
    </div>
  );
}
