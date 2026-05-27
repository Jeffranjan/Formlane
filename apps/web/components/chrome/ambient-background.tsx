/**
 * AmbientBackground — slow, decorative gradient blobs + soft grid.
 * Pure CSS, GPU-friendly, respects prefers-reduced-motion.
 *
 * Drop once near the top of a page. Stays fixed and `pointer-events: none`,
 * so it never interferes with interactions.
 */
export function AmbientBackground({
  variant = "default",
}: {
  variant?: "default" | "marketing" | "subtle";
}) {
  const isMarketing = variant === "marketing";
  const isSubtle = variant === "subtle";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Soft line/dot grid — extra texture, very subtle */}
      {!isSubtle && (
        <div
          className="absolute inset-0 bg-grid-soft opacity-[0.35]"
          style={{
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, #000 30%, transparent 80%)",
          }}
        />
      )}

      {/* Indigo blob — top-left */}
      <div
        className="ambient-blob animate-ambient-1 absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(99,102,241,0) 70%)",
        }}
      />

      {/* Violet blob — center, hero only */}
      {isMarketing && (
        <div
          className="ambient-blob animate-ambient-2 absolute left-1/2 top-[10%] h-[600px] w-[600px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.40) 0%, rgba(139,92,246,0) 70%)",
            opacity: 0.5,
          }}
        />
      )}

      {/* Cyan blob — bottom-right */}
      <div
        className="ambient-blob animate-ambient-2 absolute -bottom-40 -right-32 h-[460px] w-[460px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.32) 0%, rgba(6,182,212,0) 70%)",
        }}
      />

      {/* Subtle vignette so foreground always reads */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 70% at 50% 100%, rgba(0,0,0,0.4), transparent 60%)",
        }}
      />
    </div>
  );
}
