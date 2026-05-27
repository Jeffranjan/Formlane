"use client";

import { motion } from "motion/react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

interface OptionsDistribution {
  type: "options";
  counts: Record<string, number>;
}
interface RatingDistribution {
  type: "rating";
  counts: Record<number, number>;
}
interface NumberDistribution {
  type: "number";
  min: number;
  max: number;
  mean: number;
  median: number;
}
interface TextDistribution {
  type: "text";
  count: number;
}
type FieldDistribution =
  | OptionsDistribution
  | RatingDistribution
  | NumberDistribution
  | TextDistribution;

export interface FieldInfo {
  id: string;
  label: string;
  type: string;
}

interface AnalyticsChartsProps {
  fields: FieldInfo[];
  perFieldDistribution: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────────────────────
// Theme
// ───────────────────────────────────────────────────────────────────────────

const CHART_GRADIENT_ID = "chai-bar-gradient";

const CHART_PALETTE = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#a78bfa", // light violet
  "#22d3ee", // bright cyan
  "#818cf8", // light indigo
];

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2);
}

// ───────────────────────────────────────────────────────────────────────────
// Container card
// ───────────────────────────────────────────────────────────────────────────

function ChartShell({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="surface-1 rounded-2xl p-6"
    >
      <h3 className="text-sm font-medium tracking-tight">{title}</h3>
      <div className="mt-4">{children}</div>
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Bar chart card
// ───────────────────────────────────────────────────────────────────────────

function BarChartCard({
  title,
  data,
  delay,
}: {
  title: string;
  data: { name: string; count: number }[];
  delay?: number;
}) {
  if (data.length === 0) {
    return (
      <ChartShell title={title} delay={delay}>
        <p className="text-sm text-muted-foreground">No responses yet.</p>
      </ChartShell>
    );
  }

  return (
    <ChartShell title={title} delay={delay}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
          <defs>
            <linearGradient id={CHART_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.65} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "rgba(184,192,204,0.7)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "rgba(184,192,204,0.7)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(23,24,28,0.92)",
              backdropFilter: "blur(12px)",
              fontSize: "12px",
              color: "#F5F7FA",
              padding: "8px 10px",
            }}
            labelStyle={{ color: "rgba(184,192,204,0.85)" }}
            itemStyle={{ color: "#F5F7FA" }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={
                  data.length === 1
                    ? `url(#${CHART_GRADIENT_ID})`
                    : CHART_PALETTE[i % CHART_PALETTE.length]
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Number stats card
// ───────────────────────────────────────────────────────────────────────────

function NumberStatsCard({
  title,
  dist,
  delay,
}: {
  title: string;
  dist: NumberDistribution;
  delay?: number;
}) {
  const stats = [
    { label: "Min", value: formatNumber(dist.min) },
    { label: "Max", value: formatNumber(dist.max) },
    { label: "Mean", value: formatNumber(dist.mean) },
    { label: "Median", value: formatNumber(dist.median) },
  ];

  return (
    <ChartShell title={title} delay={delay}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
              {label}
            </p>
            <p className="mt-1.5 font-display text-xl font-semibold tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </div>
    </ChartShell>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Text card
// ───────────────────────────────────────────────────────────────────────────

function TextFieldCard({
  title,
  count,
  delay,
}: {
  title: string;
  count: number;
  delay?: number;
}) {
  return (
    <ChartShell title={title} delay={delay}>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">{count}</span>
        {" "}
        response{count !== 1 ? "s" : ""} collected. Free-text fields are not
        aggregated — view them in{" "}
        <span className="text-foreground/80">Responses</span>.
      </p>
    </ChartShell>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Main component
// ───────────────────────────────────────────────────────────────────────────

export function AnalyticsCharts({
  fields,
  perFieldDistribution,
}: AnalyticsChartsProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This form has no fields yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field, idx) => {
        const dist = perFieldDistribution[field.id] as
          | FieldDistribution
          | undefined;

        const delay = idx * 0.05;

        if (!dist) {
          return (
            <ChartShell key={field.id} title={field.label} delay={delay}>
              <p className="text-sm text-muted-foreground">No responses yet.</p>
            </ChartShell>
          );
        }

        if (dist.type === "options") {
          const data = Object.entries(dist.counts).map(([name, count]) => ({
            name,
            count,
          }));
          return (
            <BarChartCard
              key={field.id}
              title={field.label}
              data={data}
              delay={delay}
            />
          );
        }

        if (dist.type === "rating") {
          const data = Object.entries(dist.counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => Number(a.name) - Number(b.name));
          return (
            <BarChartCard
              key={field.id}
              title={field.label}
              data={data}
              delay={delay}
            />
          );
        }

        if (dist.type === "number") {
          return (
            <NumberStatsCard
              key={field.id}
              title={field.label}
              dist={dist}
              delay={delay}
            />
          );
        }

        return (
          <TextFieldCard
            key={field.id}
            title={field.label}
            count={dist.count}
            delay={delay}
          />
        );
      })}
    </div>
  );
}
