// Scene 2 — 270 frames (9 s)
// Copy slides in on the left; widget springs in from the right with live stats.
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { INTER, SERIF } from "../fonts";
import { t } from "../tokens";
import { Widget } from "../components/Widget";

export const WidgetDemo: React.FC = () => {
  const f   = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Left copy
  const copyOpacity = interpolate(f, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const copyY       = interpolate(f, [0, 25], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Widget springs in from right
  const widgetX = spring({ frame: f, fps, config: { damping: 80, stiffness: 140, mass: 1 }, from: 140, to: 0 });
  const widgetOpacity = interpolate(f, [0, 22], [0, 1], { extrapolateRight: "clamp" });

  // Stats count up: frame 30 → 160
  const statProgress = interpolate(f, [30, 160], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Sparkline draws: frame 55 → 195
  const sparklineProgress = interpolate(f, [55, 195], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 96,
        background: t.bg,
        padding: "0 120px",
      }}
    >
      {/* Left: copy */}
      <div style={{ opacity: copyOpacity, transform: `translateY(${copyY}px)`, maxWidth: 480 }}>
        <p
          style={{
            fontSize: 11, fontWeight: 500, letterSpacing: "0.22em",
            textTransform: "uppercase", color: t.fgMuted, marginBottom: 24,
          }}
        >
          Always watching
        </p>
        <h2
          style={{
            fontFamily: SERIF,
            fontSize: 58, fontWeight: 400,
            letterSpacing: "-0.03em", lineHeight: 1.1,
            color: t.fg, marginBottom: 22,
          }}
        >
          Real-time spend<br />in your tray.
        </h2>
        <p style={{ fontSize: 19, lineHeight: 1.7, color: t.fgMuted }}>
          Every API call tracked. Every dollar visible.<br />
          Without opening a single browser tab.
        </p>
      </div>

      {/* Right: widget */}
      <div style={{ opacity: widgetOpacity, transform: `translateX(${widgetX}px)`, flexShrink: 0 }}>
        <Widget statProgress={statProgress} sparklineProgress={sparklineProgress} />
      </div>
    </AbsoluteFill>
  );
};
