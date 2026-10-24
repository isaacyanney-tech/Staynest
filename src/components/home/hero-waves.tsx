"use client";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { readColorMode, subscribeColorMode } from "@/lib/color-mode";

// The shader is ~20 kB and needs WebGL2, so it loads after the page is
// interactive and never during server rendering. Without WebGL2 the hero keeps
// its plain gradient.
const GradientWaves = dynamic(() => import("@/components/motion/gradient-waves").then((m) => m.GradientWaves), {
  ssr: false,
});

const noop = () => () => {};
function useSmallScreen() {
  return useSyncExternalStore(
    noop,
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

/** Animated sea of brand-coloured waves behind the homepage hero. */
export function HeroWaves() {
  const mode = useSyncExternalStore(subscribeColorMode, readColorMode, () => null);
  const small = useSmallScreen();
  if (mode === null) return null;
  const dark = mode === "dark";
  return (
    <div aria-hidden className="hero-waves absolute inset-0">
      <GradientWaves
        horizonColor={dark ? "#0A1E2E" : "#0F2C42"}
        waveColor="#1FB8A6"
        crestColor="#F2FBF9"
        speed={0.32}
        amplitude={3}
        waveScale={0.7}
        tilt={62}
        height={7}
        fogDepth={22}
        relief={1}
        lightAngle={125}
        sheen={0.5}
        brightness={dark ? 0.75 : 0.85}
        opacity={dark ? 0.7 : 0.78}
        grain={0.1}
        quality={small ? "low" : "medium"}
        dpr={small ? 1.25 : 1.75}
        parallaxStrength={0.4}
        mouseStrength={0.5}
      />
    </div>
  );
}
