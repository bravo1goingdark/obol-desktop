// Side-effect import: registers delayRender for font loading before any
// composition mounts, so the first frame never flashes the fallback font.
import "./fonts";

import React from "react";
import { Composition } from "remotion";
import { LaunchVideo, VIDEO_FPS, VIDEO_FRAMES, VIDEO_HEIGHT, VIDEO_WIDTH } from "./LaunchVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LaunchVideo"
      component={LaunchVideo}
      durationInFrames={VIDEO_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  );
};
