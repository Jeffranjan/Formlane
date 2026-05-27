"use client";

import { motion } from "motion/react";
import { CheckCircle2, Sparkles } from "lucide-react";

/**
 * HeroPreview — a fake-window product preview shown beneath the hero.
 * Pure layout. Subtle hover lift. No live data.
 */
export function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-16 w-full max-w-5xl"
    >
      {/* Glow halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-12 -top-8 bottom-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.30), transparent 70%)",
        }}
      />

      <div className="border-gradient relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[rgba(17,18,20,0.7)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-yellow-400/70" />
          <span className="size-2.5 rounded-full bg-green-400/70" />
          <div className="ml-3 flex h-5 flex-1 items-center justify-center rounded-md bg-white/[0.04] px-3 text-[11px] font-mono text-muted-foreground">
            formlane.dev/dashboard
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3">
          {/* Stats column */}
          <div className="space-y-4 sm:col-span-1">
            <PreviewStat label="Total responses" value="2,481" delta="+12.4%" />
            <PreviewStat label="This week" value="318" delta="+8.1%" />
            <PreviewStat label="Conversion" value="62%" delta="+2.3%" />
          </div>

          {/* Chart column */}
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5 sm:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Response trend</p>
                <p className="text-xs text-muted-foreground">Last 14 days</p>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                <Sparkles className="size-3" />
                Live
              </div>
            </div>
            <FakeChart />
          </div>

          {/* Recent responses */}
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5 sm:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Recent submissions</p>
              <span className="text-xs text-muted-foreground">3 of 2,481</span>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {SAMPLE_ROWS.map((row) => (
                <li
                  key={row.email}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/70 to-violet-500/70 text-[11px] font-semibold text-white">
                      {row.email[0]?.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm">{row.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.snippet}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="hidden sm:inline">{row.time}</span>
                    <CheckCircle2 className="size-4 text-emerald-400/80" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PreviewStat({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-emerald-400">{delta}</p>
    </div>
  );
}

const SAMPLE_ROWS = [
  { email: "amelia@studio.io", snippet: "Loved the onboarding…", time: "2m ago" },
  { email: "rohan@craft.co", snippet: "Rated 5 / 5 — sleek!", time: "8m ago" },
  { email: "june@labs.app", snippet: "Submitted feedback form", time: "21m ago" },
];

function FakeChart() {
  // Smoothed bars — purely decorative
  const data = [12, 18, 14, 22, 19, 28, 24, 35, 30, 41, 36, 48, 44, 52];
  const max = Math.max(...data);

  return (
    <div className="flex h-32 items-end gap-1.5">
      {data.map((v, i) => {
        const height = (v / max) * 100;
        return (
          <motion.div
            key={i}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: `${height}%`, opacity: 1 }}
            transition={{
              delay: 0.5 + i * 0.04,
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500/60 to-violet-400/90"
            style={{
              boxShadow: "0 0 12px -2px rgba(139,92,246,0.45)",
            }}
          />
        );
      })}
    </div>
  );
}
