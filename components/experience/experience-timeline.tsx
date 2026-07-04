import { experience } from "@/lib/content/profile";
import { SectionHeading } from "@/components/ui/section-heading";
import { ExperienceCard } from "@/components/experience/experience-card";

export function ExperienceTimeline() {
  return (
    <section id="experience" className="section-shell">
      <SectionHeading
        eyebrow="Experience"
        title="Nine years, four industries, one throughline"
        description="Scroll through the roles that shaped the way I work — from a Ramayana sales floor to a fintech help desk."
      />

      <div className="space-y-6">
        {experience.map((entry, index) => (
          <ExperienceCard key={entry.id} entry={entry} index={index} />
        ))}
      </div>
    </section>
  );
}
