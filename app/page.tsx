import { AboutJourney } from "@/components/about/about-journey";
import { AchievementGrid } from "@/components/achievements/achievement-grid";
import { CertificationsSection } from "@/components/certifications/certifications-section";
import { SectionNav } from "@/components/chrome/section-nav";
import { ContactSection } from "@/components/contact/contact-section";
import { ExperienceTimeline } from "@/components/experience/experience-timeline";
import { Hero } from "@/components/hero/hero";
import { SkillsSection } from "@/components/skills/skills-section";

export default function Home() {
  return (
    <main className="relative">
      <SectionNav />
      <Hero />
      <AboutJourney />
      <ExperienceTimeline />
      <SkillsSection />
      <AchievementGrid />
      <CertificationsSection />
      <ContactSection />
    </main>
  );
}
