"use client";

import { useEffect, useState } from "react";

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

/** Heuristic: true when the device likely can't comfortably run a WebGL scene. */
export function useLowPower() {
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const nav = navigator as NavigatorWithMemory;
    const smallViewport = window.innerWidth < 768;
    const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
    const lowMemory = (nav.deviceMemory ?? 8) <= 4;
    const noWebGL = (() => {
      try {
        const canvas = document.createElement("canvas");
        return !(
          canvas.getContext("webgl2") || canvas.getContext("webgl")
        );
      } catch {
        return true;
      }
    })();

    setLowPower(noWebGL || (smallViewport && (fewCores || lowMemory)));
  }, []);

  return lowPower;
}
