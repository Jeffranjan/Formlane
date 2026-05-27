import type { Metadata } from "next";
import { AmbientBackground } from "~/components/chrome/ambient-background";
import { MarketingNav } from "~/components/chrome/marketing-nav";
import { MarketingFooter } from "~/components/chrome/marketing-footer";

export const metadata: Metadata = {
  title: "Formlane — Forms that feel premium",
  description:
    "Design beautiful forms, ship in seconds, analyze responses with calm. Built for creators who care about craft.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AmbientBackground variant="marketing" />
      <MarketingNav />
      <main className="flex-1 pt-24 sm:pt-28">{children}</main>
      <MarketingFooter />
    </div>
  );
}
