import { SectionHeading } from "@/components/ui/section-heading";
import { SkillsGalaxy } from "@/components/skills/skills-galaxy";

export function SkillsSection() {
  return (
    <section id="skills" className="section-shell">
      <SectionHeading
        eyebrow="Skills"
        title="A floating universe of capabilities"
        description="Drag to orbit. Every node is a skill sharpened across transportation, hospitality, and fintech."
        align="center"
      />
      <div className="glass-panel rounded-3xl">
        <SkillsGalaxy />
      </div>
    </section>
  );
}
