// Scene 3 — 450 frames (15 s)
// Header fades in, then 6 feature tiles stagger up into view.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { INTER, MONO, SERIF } from "../fonts";
import { t } from "../tokens";

const FEATURES = [
  { face: "(T_T)", faceColor: t.destructive, name: "Mood meter",    desc: "Your spend expressed as a face. From (^_^) to (T_T) — you'll know before you even look." },
  { face: "⬛",    faceColor: t.fgMuted,     name: "System tray",   desc: "Lives in your tray, always visible. No browser tab, no floating window, no friction." },
  { face: "🔔",   faceColor: t.amber,       name: "Budget alerts",  desc: "Native OS notifications at 80% and 100% of monthly budget. Set a daily cap too." },
  { face: "📈",   faceColor: t.emerald,     name: "14-day trend",   desc: "Inline sparkline with hover tooltips so you can tell if today is an outlier." },
  { face: "🔒",   faceColor: t.fgMuted,     name: "Privacy first",  desc: "API token stays in the OS keychain. No cloud sync, no telemetry." },
  { face: "⚡",   faceColor: t.amber,       name: "Lightweight",    desc: "Built with Tauri and Rust. Tiny binary, near-zero idle CPU." },
] as const;

interface TileProps {
  feature: typeof FEATURES[number];
  delay: number;
  frame: number;
}

const Tile: React.FC<TileProps> = ({ feature, delay, frame }) => {
  const opacity = interpolate(frame, [delay, delay + 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y       = interpolate(frame, [delay, delay + 28], [22, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        background: t.bgCard,
        padding: "26px 28px",
      }}
    >
      <div
        style={{
          fontSize: 26,
          color: feature.faceColor,
          fontFamily: MONO,
          lineHeight: 1,
          marginBottom: 14,
          display: "inline-block",
        }}
      >
        {feature.face}
      </div>
      <p
        style={{
          fontSize: 10, fontWeight: 600, letterSpacing: "0.16em",
          textTransform: "uppercase", color: t.fgMuted, marginBottom: 8,
          fontFamily: INTER,
        }}
      >
        {feature.name}
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.62, color: t.fg, fontFamily: INTER }}>
        {feature.desc}
      </p>
    </div>
  );
};

export const Features: React.FC = () => {
  const f = useCurrentFrame();

  const hOpacity = interpolate(f, [0, 28], [0, 1], { extrapolateRight: "clamp" });
  const hY       = interpolate(f, [0, 28], [18, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 120px",
        gap: 44,
        background: t.bg,
      }}
    >
      {/* Section header */}
      <div style={{ opacity: hOpacity, transform: `translateY(${hY}px)`, textAlign: "center" }}>
        <p
          style={{
            fontSize: 11, fontWeight: 500, letterSpacing: "0.22em",
            textTransform: "uppercase", color: t.fgMuted, marginBottom: 12, fontFamily: INTER,
          }}
        >
          Features
        </p>
        <h2
          style={{
            fontFamily: SERIF, fontSize: 50, fontWeight: 400,
            letterSpacing: "-0.03em", lineHeight: 1.1, color: t.fg,
          }}
        >
          Everything you need,<br />nothing you don't.
        </h2>
      </div>

      {/* Feature grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          width: "100%",
        }}
      >
        {FEATURES.map((feat, i) => (
          <Tile key={feat.name} feature={feat} delay={38 + i * 22} frame={f} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
