/**
 * AmbientBackground — slow, decorative gradient blobs + soft grid.
 * Pure CSS, GPU-friendly, respects prefers-reduced-motion.
 * Amber/gold palette.
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
      {/* Soft dot grid — extra texture, very subtle */}
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

      {/* Amber blob — top-left */}
      <div
        className="ambient-blob animate-ambient-1 absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(245,158,11,0) 70%)",
        }}
      />

      {/* Gold blob — center, hero only */}
      {isMarketing && (
        <div
          className="ambient-blob animate-ambient-2 absolute left-1/2 top-[10%] h-[600px] w-[600px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(251,183,36,0.25) 0%, rgba(251,183,36,0) 70%)",
            opacity: 0.5,
          }}
        />
      )}

      {/* Deep amber blob — bottom-right */}
      <div
        className="ambient-blob animate-ambient-2 absolute -bottom-40 -right-32 h-[460px] w-[460px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(217,119,6,0.22) 0%, rgba(217,119,6,0) 70%)",
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
