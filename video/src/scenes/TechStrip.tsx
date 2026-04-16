// Scene 5 — 390 frames (13 s)
// "Built with" headline, then tech badges pop in, then platform + license strip.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { INTER, MONO, SERIF } from "../fonts";
import { t } from "../tokens";

const TECH = [
  { name: "Tauri 2",     desc: "Native shell",     accent: "#FFC131" },
  { name: "Rust",        desc: "Zero-cost core",   accent: "#CE422B" },
  { name: "Svelte 4",    desc: "Reactive UI",      accent: "#FF3E00" },
  { name: "Tailwind 3",  desc: "Utility CSS",      accent: "#38BDF8" },
] as const;

const PLATFORMS = ["Linux", "macOS", "Windows"];

export const TechStrip: React.FC = () => {
  const f = useCurrentFrame();

  const hOpacity = interpolate(f, [0, 28], [0, 1], { extrapolateRight: "clamp" });
  const hY       = interpolate(f, [0, 28], [18, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const platformOpacity = interpolate(f, [160, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const platformY       = interpolate(f, [160, 200], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 160px",
        gap: 56,
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
          Built with
        </p>
        <h2
          style={{
            fontFamily: SERIF, fontSize: 50, fontWeight: 400,
            letterSpacing: "-0.03em", color: t.fg,
          }}
        >
          The right tools for the job.
        </h2>
      </div>

      {/* Tech badges */}
      <div style={{ display: "flex", gap: 18, justifyContent: "center" }}>
        {TECH.map((tech, i) => {
          const delay   = 38 + i * 28;
          const opacity = interpolate(f, [delay, delay + 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const scale   = interpolate(f, [delay, delay + 28], [0.88, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.back(1.3)),
          });

          return (
            <div
              key={tech.name}
              style={{
                opacity,
                transform: `scale(${scale})`,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                background: t.bgCard,
                padding: "26px 36px",
                minWidth: 168,
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Colour accent top bar */}
              <div
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: tech.accent, opacity: 0.75,
                }}
              />
              <p
                style={{
                  fontSize: 20, fontWeight: 600, color: t.fg, marginBottom: 8,
                  letterSpacing: "-0.01em", fontFamily: INTER,
                }}
              >
                {tech.name}
              </p>
              <p
                style={{
                  fontSize: 11, color: t.fgMuted, letterSpacing: "0.08em",
                  textTransform: "uppercase", fontWeight: 500, fontFamily: INTER,
                }}
              >
                {tech.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Platforms + license */}
      <div
        style={{
          opacity: platformOpacity,
          transform: `translateY(${platformY}px)`,
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        {PLATFORMS.map((p, i) => (
          <React.Fragment key={p}>
            <span style={{ fontSize: 17, color: t.fgMuted, fontFamily: INTER }}>{p}</span>
            {i < PLATFORMS.length - 1 && (
              <span style={{ color: t.border, fontSize: 20 }}>·</span>
            )}
          </React.Fragment>
        ))}
        <span style={{ color: t.border, fontSize: 20, marginLeft: 8 }}>·</span>
        <code
          style={{
            fontFamily: MONO, fontSize: 13, color: t.fgMuted,
            background: "hsl(0 0% 50% / .07)",
            padding: "3px 10px", borderRadius: 6,
          }}
        >
          MIT
        </code>
      </div>
    </AbsoluteFill>
  );
};
