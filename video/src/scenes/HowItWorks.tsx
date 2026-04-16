// Scene 4 — 450 frames (15 s)
// Three steps stagger in with a horizontal connector line between them.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { INTER, SERIF } from "../fonts";
import { t } from "../tokens";

const STEPS = [
  {
    num: "01",
    icon: "🔑",
    title: "Add your API key",
    desc: "Paste your Obol personal access token once. It's stored in the OS keychain and never leaves your machine.",
  },
  {
    num: "02",
    icon: "⬛",
    title: "It lives in the background",
    desc: "A tiny tray icon appears. No windows to manage, no tabs to juggle. It just watches.",
  },
  {
    num: "03",
    icon: "🔔",
    title: "Get alerted before it hurts",
    desc: "Native notifications fire at 80% and 100% of your budget. A daily cap keeps surprises away.",
  },
] as const;

export const HowItWorks: React.FC = () => {
  const f = useCurrentFrame();

  const hOpacity = interpolate(f, [0, 28], [0, 1], { extrapolateRight: "clamp" });
  const hY       = interpolate(f, [0, 28], [18, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Connector line fades in after first step
  const lineOpacity = interpolate(f, [60, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 180px",
        gap: 72,
        background: t.bg,
      }}
    >
      {/* Header */}
      <div style={{ opacity: hOpacity, transform: `translateY(${hY}px)`, textAlign: "center" }}>
        <p
          style={{
            fontSize: 11, fontWeight: 500, letterSpacing: "0.22em",
            textTransform: "uppercase", color: t.fgMuted, marginBottom: 12, fontFamily: INTER,
          }}
        >
          How it works
        </p>
        <h2
          style={{
            fontFamily: SERIF, fontSize: 50, fontWeight: 400,
            letterSpacing: "-0.03em", lineHeight: 1.1, color: t.fg,
          }}
        >
          Three steps.<br />Then forget about it.
        </h2>
      </div>

      {/* Steps */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, width: "100%", position: "relative" }}>
        {/* Horizontal connector */}
        <div
          style={{
            position: "absolute",
            top: 27,
            left: "calc(16.67% + 28px)",
            right: "calc(16.67% + 28px)",
            height: 1,
            background: `linear-gradient(to right, transparent, ${t.border}, ${t.border}, transparent)`,
            opacity: lineOpacity,
          }}
        />

        {STEPS.map((step, i) => {
          const delay   = 38 + i * 55;
          const opacity = interpolate(f, [delay, delay + 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y       = interpolate(f, [delay, delay + 38], [30, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          return (
            <div
              key={step.num}
              style={{ opacity, transform: `translateY(${y}px)`, padding: "0 40px", textAlign: "center" }}
            >
              {/* Circle */}
              <div
                style={{
                  width: 56, height: 56, borderRadius: "50%",
                  border: `1px solid ${t.border}`, background: t.bgCard,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 22px",
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
                  color: t.fgMuted, fontFamily: INTER,
                }}
              >
                {step.num}
              </div>

              <div style={{ fontSize: 34, marginBottom: 18, lineHeight: 1 }}>{step.icon}</div>

              <h3
                style={{
                  fontFamily: SERIF, fontSize: 26, fontWeight: 400,
                  color: t.fg, marginBottom: 12, lineHeight: 1.25,
                }}
              >
                {step.title}
              </h3>

              <p style={{ fontSize: 15, lineHeight: 1.7, color: t.fgMuted, fontFamily: INTER }}>
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
