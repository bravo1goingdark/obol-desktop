// CSS-only widget mockup ported from docs/index.html, with animatable props.
import React from "react";
import { useCurrentFrame } from "remotion";
import { INTER, MONO, SERIF } from "../fonts";
import { t } from "../tokens";

interface Props {
  statProgress: number;      // 0 → 1: stats count up
  sparklineProgress: number; // 0 → 1: sparkline draws left-to-right
}

function lerp(a: number, b: number, p: number) { return a + (b - a) * p; }
function usd(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

const SPARK_LINE =
  "M3,32 L18,28 L33,30 L48,20 L63,24 L78,10 L93,18 L108,22 L123,8 L138,14 L153,16 L168,6 L183,20 L207,28";
const SPARK_FILL =
  "M3,32 L18,28 L33,30 L48,20 L63,24 L78,10 L93,18 L108,22 L123,8 L138,14 L153,16 L168,6 L183,20 L207,28 L207,37 L3,37 Z";

export const Widget: React.FC<Props> = ({ statProgress, sparklineProgress }) => {
  const f = useCurrentFrame();

  // Face glitch: every 13 frames, twitch for 3 frames
  const g = f % 13;
  const gx = g === 1 ? -2 : g === 2 ? 2 : 0;
  const gy = g === 1 ?  1 : g === 2 ? -1 : 0;

  const monthCents    = Math.round(lerp(0, 4840, statProgress));
  const forecastCents = Math.round(lerp(0, 9576, statProgress));
  const barWidth      = Math.min(100, lerp(0, 161, statProgress));

  const card: React.CSSProperties = {
    border: `1px solid ${t.border}`,
    borderRadius: 6,
    background: t.bg,
    padding: 12,
  };

  const label: React.CSSProperties = {
    fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase",
    color: t.fgMuted, marginBottom: 4, fontFamily: INTER,
  };

  const valStyle: React.CSSProperties = {
    fontFamily: SERIF, fontSize: 20, lineHeight: "1", color: t.fg,
  };

  const sub: React.CSSProperties = {
    fontSize: 8, color: t.fgMuted, marginTop: 3, fontFamily: INTER,
  };

  function accentBar(color: string) {
    return (
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(to right, ${color} 0%, transparent 100%)`,
      }} />
    );
  }

  return (
    <div
      style={{
        width: 300,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        background: t.bgCard,
        fontSize: 12,
        overflow: "hidden",
        boxShadow: "0 20px 64px -16px rgba(0,0,0,.55), 0 4px 16px -4px rgba(0,0,0,.22)",
        userSelect: "none",
        fontFamily: INTER,
      }}
    >
      {/* Titlebar */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 10px", height: 32,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <span style={{ fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: t.fgMuted, fontFamily: MONO }}>
          Obol
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          {["↺", "⎋", "⚙", "☾"].map((ic) => (
            <span
              key={ic}
              style={{
                width: 20, height: 20, borderRadius: 3,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: t.fgMuted, fontSize: 10,
              }}
            >
              {ic}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Mood card */}
        <div style={card}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span
              style={{
                fontFamily: MONO, fontSize: 22, lineHeight: "1",
                color: t.destructive, flexShrink: 0,
                transform: `translate(${gx}px, ${gy}px)`,
                display: "inline-block",
              }}
            >
              (T_T)
            </span>
            <div>
              <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: "1.2", marginBottom: 3, color: t.fg }}>
                faaaahh.
              </p>
              <p style={{ fontSize: 10, color: t.fgMuted, lineHeight: "1.45", fontFamily: INTER }}>
                At this rate you could<br />hire a junior dev.
              </p>
            </div>
          </div>
          <div
            style={{
              marginTop: 10, height: 3, borderRadius: 99,
              background: "hsl(40 10% 94% / .1)", overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%", width: `${barWidth}%`, borderRadius: 99,
                background: t.destructive,
              }}
            />
          </div>
          <p style={{ marginTop: 4, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: t.fgMuted, fontFamily: INTER }}>
            161% of $30 budget
          </p>
        </div>

        {/* KPI row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ ...card, position: "relative", overflow: "hidden" }}>
            {accentBar(t.primary)}
            <p style={label}>This month</p>
            <p style={valStyle}>{usd(monthCents)}</p>
            <p style={sub}>↓ 10% vs $53.70</p>
          </div>
          <div style={{ ...card, position: "relative", overflow: "hidden" }}>
            {accentBar(t.fgMuted)}
            <p style={label}>Today</p>
            <p style={valStyle}>$0.00</p>
          </div>
        </div>

        {/* KPI row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ ...card, position: "relative", overflow: "hidden" }}>
            {accentBar(t.emerald)}
            <p style={label}>Top model</p>
            <p style={{ ...valStyle, fontSize: 13, paddingTop: 3 }}>Claude Opus 4</p>
            <p style={sub}>$29.84</p>
          </div>
          <div style={{ ...card, position: "relative", overflow: "hidden" }}>
            {accentBar(t.amber)}
            <p style={label}>Forecast</p>
            <p style={valStyle}>{usd(forecastCents)}</p>
            <p style={sub}>month end</p>
          </div>
        </div>

        {/* Sparkline */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: t.fgMuted, fontFamily: INTER }}>
              Last 14 days
            </span>
            <span style={{ fontSize: 8, color: t.fgMuted, fontFamily: MONO }}>CSV ↓</span>
          </div>
          <svg viewBox="0 0 210 40" width="100%" height={44} preserveAspectRatio="none" style={{ display: "block" }}>
            <defs>
              <clipPath id="spark-clip">
                <rect x="0" y="0" width={sparklineProgress * 210} height="40" />
              </clipPath>
            </defs>
            <path d={SPARK_FILL} fill={t.primary} fillOpacity={0.07} clipPath="url(#spark-clip)" />
            <path
              d={SPARK_LINE}
              fill="none"
              stroke={t.primary}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
              clipPath="url(#spark-clip)"
            />
          </svg>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: `1px solid ${t.border}`,
          padding: "6px 12px",
          fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase",
          color: t.fgMuted, fontFamily: MONO,
        }}
      >
        <span>updated just now</span>
        <span>4 connections</span>
      </div>
    </div>
  );
};
