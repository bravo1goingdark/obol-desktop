// Scene 6 — 150 frames (5 s)
// Mood face shifts to (^_^), headline + buttons + URL fade up.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { INTER, MONO, SERIF } from "../fonts";
import { t } from "../tokens";

export const CTA: React.FC = () => {
  const f = useCurrentFrame();

  // Happy-face light glitch
  const g  = f % 18;
  const gx = g === 1 ? -2 : g === 2 ? 2 : 0;

  const heroOpacity = interpolate(f, [0, 28], [0, 1], { extrapolateRight: "clamp" });
  const heroScale   = interpolate(f, [0, 28], [0.95, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const btnOpacity = interpolate(f, [28, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnY       = interpolate(f, [28, 58], [16, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const urlOpacity = interpolate(f, [55, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        background: `radial-gradient(1000px 700px at 50% 45%, hsl(20 40% 60% / .11), transparent 60%), ${t.bg}`,
      }}
    >
      {/* Hero block */}
      <div
        style={{
          opacity: heroOpacity,
          transform: `scale(${heroScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          textAlign: "center",
        }}
      >
        {/* Happy face */}
        <span
          style={{
            fontSize: 60, lineHeight: 1,
            fontFamily: MONO, color: t.fg,
            transform: `translateX(${gx}px)`,
            display: "block",
          }}
        >
          (^_^)
        </span>

        <h2
          style={{
            fontFamily: SERIF, fontSize: 68, fontWeight: 400,
            letterSpacing: "-0.03em", lineHeight: 1.05, color: t.fg,
          }}
        >
          Know your bill.<br />Own your tools.
        </h2>

        <p style={{ fontSize: 20, lineHeight: 1.65, color: t.fgMuted, maxWidth: 500, fontFamily: INTER }}>
          Free, open source, MIT licensed.<br />
          Built for developers who care about cost.
        </p>
      </div>

      {/* CTA buttons */}
      <div
        style={{
          opacity: btnOpacity,
          transform: `translateY(${btnY}px)`,
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div
          style={{
            background: t.fg, color: t.bg,
            padding: "15px 30px", borderRadius: 9,
            fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em",
            fontFamily: INTER,
            boxShadow: "0 8px 28px -10px hsl(0 0% 0% / .55)",
          }}
        >
          Download free ↓
        </div>
        <div
          style={{
            background: "transparent", color: t.fgMuted,
            border: `1px solid ${t.border}`,
            padding: "15px 30px", borderRadius: 9,
            fontSize: 16, fontWeight: 500, fontFamily: INTER,
          }}
        >
          View source ↗
        </div>
      </div>

      {/* URL */}
      <span
        style={{
          opacity: urlOpacity,
          fontSize: 14, color: t.fgMuted,
          fontFamily: MONO, letterSpacing: "0.02em",
        }}
      >
        github.com/bravo1goingdark/obol-desktop
      </span>
    </AbsoluteFill>
  );
};
