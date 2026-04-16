// Scene 1 — 90 frames (3 s)
// Logo fades + scales up → tagline slides up → eyebrow text appears.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { INTER, SERIF } from "../fonts";
import { t } from "../tokens";

export const Intro: React.FC = () => {
  const f = useCurrentFrame();

  const logoOpacity = interpolate(f, [0, 28], [0, 1], { extrapolateRight: "clamp" });
  const logoScale   = interpolate(f, [0, 28], [0.9, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const taglineOpacity = interpolate(f, [18, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const taglineY       = interpolate(f, [18, 50], [18, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const eyebrowOpacity = interpolate(f, [42, 72], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        background: `radial-gradient(1400px 700px at 75% -10%, hsl(20 40% 60% / .14), transparent 50%), ${t.bg}`,
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          fontFamily: SERIF,
          fontSize: 108,
          fontWeight: 400,
          letterSpacing: "-0.03em",
          color: t.fg,
          lineHeight: 1,
        }}
      >
        Obol
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          fontSize: 30,
          fontFamily: INTER,
          fontWeight: 400,
          color: t.fgMuted,
          letterSpacing: "-0.01em",
        }}
      >
        Your AI spend, always in sight.
      </div>

      {/* Eyebrow */}
      <div
        style={{
          opacity: eyebrowOpacity,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: t.fgMuted,
          marginTop: 6,
        }}
      >
        Open source · Tauri · Rust · Svelte
      </div>
    </AbsoluteFill>
  );
};
