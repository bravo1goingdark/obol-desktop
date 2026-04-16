import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { t } from "./tokens";
import { INTER } from "./fonts";
import { Intro } from "./scenes/Intro";
import { WidgetDemo } from "./scenes/WidgetDemo";
import { Features } from "./scenes/Features";
import { HowItWorks } from "./scenes/HowItWorks";
import { TechStrip } from "./scenes/TechStrip";
import { CTA } from "./scenes/CTA";

export const VIDEO_FPS    = 30;
export const VIDEO_WIDTH  = 1920;
export const VIDEO_HEIGHT = 1080;

// Scene durations (frames @ 30 fps)
// Intro:       3 s  =  90
// WidgetDemo:  9 s  = 270
// Features:   15 s  = 450
// HowItWorks: 15 s  = 450
// TechStrip:  13 s  = 390
// CTA:         5 s  = 150
// Total:      60 s  = 1800
export const VIDEO_FRAMES = 90 + 270 + 450 + 450 + 390 + 150; // 1800

export const LaunchVideo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: t.bg,
        fontFamily: INTER,
        overflow: "hidden",
        color: t.fg,
      }}
    >
      <Series>
        <Series.Sequence durationInFrames={90}>
          <Intro />
        </Series.Sequence>

        <Series.Sequence durationInFrames={270}>
          <WidgetDemo />
        </Series.Sequence>

        <Series.Sequence durationInFrames={450}>
          <Features />
        </Series.Sequence>

        <Series.Sequence durationInFrames={450}>
          <HowItWorks />
        </Series.Sequence>

        <Series.Sequence durationInFrames={390}>
          <TechStrip />
        </Series.Sequence>

        <Series.Sequence durationInFrames={150}>
          <CTA />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
