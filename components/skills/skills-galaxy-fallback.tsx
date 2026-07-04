import { skills } from "@/lib/content/profile";
import { categoryClass } from "@/components/skills/category-colors";

export function SkillsGalaxyFallback() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-6">
      {skills.map((skill, i) => (
        <span
          key={skill.name}
          style={{ animationDelay: `${(i % 6) * 0.4}s` }}
          className={`animate-float glass-panel rounded-full border px-4 py-2 text-sm ${categoryClass[skill.category]}`}
        >
          {skill.name}
        </span>
      ))}
    </div>
  );
}
