"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useLowPower } from "@/lib/hooks/use-low-power";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { SkillsGalaxyFallback } from "@/components/skills/skills-galaxy-fallback";

const SkillsGalaxyScene = dynamic(() => import("@/components/skills/skills-galaxy-scene"), {
  ssr: false,
  loading: () => <SkillsGalaxyFallback />,
});

export function SkillsGalaxy() {
  const reducedMotion = useReducedMotion();
  const lowPower = useLowPower();

  if (reducedMotion || lowPower) {
    return <SkillsGalaxyFallback />;
  }

  return (
    <div className="h-[420px] w-full sm:h-[520px]">
      <Suspense fallback={<SkillsGalaxyFallback />}>
        <SkillsGalaxyScene />
      </Suspense>
    </div>
  );
}
