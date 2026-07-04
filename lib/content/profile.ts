// Single source of truth for all real profile content.
// Sourced from the user's LinkedIn "Save to PDF" export (public/Profile.pdf).

export const person = {
  name: "Abdul Aziz Setiawan",
  initials: "AA",
  headline:
    "Customer Service Agent as Supported Team | Good in Communication, Administration and Time Management",
  location: "Jakarta Raya, Indonesia",
  email: "work.aziz@outlook.com",
  linkedin: "https://www.linkedin.com/in/abdazizs",
  cvUrl: "/Profile.pdf",
  hasPhoto: true,
  photoUrl: "/images/profile/aziz.png",
} as const;

export const roleRotator = [
  "Customer Experience Specialist",
  "Customer Service Professional",
  "Guest Service Expert",
  "Fintech Support Specialist",
  "Problem Solver",
] as const;

export const about = {
  paragraphs: [
    "I am a graduate of SMK Negeri 23 Jakarta and currently serve as a Customer Service Agent at Skor Technologies. Previously, I worked as a Guest Service Officer at PT Angkasa Pura Supports and as a Customer Service on Train at PT Kereta Api Pariwisata (KAWISATA).",
    "One of the highlights of my career was in 2022, when I was honored as the Best Service Officer and entrusted with serving the 7th President of the Republic of Indonesia, Mr. Ir. Joko Widodo, and the Minister of Transportation, Mr. Budi Karya Sumadi, during a special train service.",
    "Throughout my education and career journey, I have always been eager to learn new things. I have gained experience in various roles, including Sales Promotion, Sales Assistant, Helpdesk, Customer Service, Social Media Administrator, and Announcer. These experiences have shaped my ability to adapt quickly, communicate effectively, and develop excellent time management skills.",
  ],
  arc: [
    {
      industry: "Transportation",
      years: "2019 – 2024",
      description:
        "5+ years keeping Jakarta's Commuter Line moving — announcements, onboard safety, and a presidential service assignment.",
    },
    {
      industry: "Hospitality",
      years: "2025",
      description:
        "Guest Service Officer role translating railway-grade service discipline into warm, resident-first hospitality.",
    },
    {
      industry: "Fintech",
      years: "2026 – Present",
      description:
        "Customer Service Agent at Skor Technologies, resolving card issues and building internal tools that cut resolution time in half.",
    },
  ],
} as const;

export type Industry =
  | "retail"
  | "administration"
  | "transportation"
  | "hospitality"
  | "fintech"
  | "venture";

export type ExperienceEntry = {
  id: string;
  company: string;
  role: string;
  period: string;
  duration: string;
  location: string;
  industry: Industry;
  bullets: string[];
  milestone?: string;
  /** Optional photo gallery, e.g. ["/images/experience/skor/team-1.jpg"] */
  images?: string[];
};

// Chronological (oldest -> newest) to read as a growth story.
export const experience: ExperienceEntry[] = [
  {
    id: "ramayana",
    company: "PT Ramayana Lestari Sentosa, Tbk",
    role: "Sales Promotion Boy",
    period: "Januari 2017 – April 2017",
    duration: "4 bulan",
    location: "North Jakarta, Indonesia",
    industry: "retail",
    bullets: [
      "Directly offered products to customers and explained product details and payment methods",
      "Conducted live promotions during special events",
      "Prepared monthly sales reports",
      "Ensured product availability and maintained store cleanliness",
      "Maintained good communication and collaborated with colleagues",
    ],
  },
  {
    id: "map-aktif",
    company: "PT MAP Aktif Adiperkasa, Indonesia",
    role: "Sales Assistant",
    period: "Mei 2018 – Agustus 2018",
    duration: "4 bulan",
    location: "Area DKI Jakarta",
    industry: "retail",
    bullets: [
      "Provided excellent service to every customer visiting the store",
      "Achieved and exceeded the monthly sales target by more than 100%",
      "Conducted daily stock opname to ensure product availability",
      "Successfully increased customer satisfaction by 15% during tenure",
    ],
  },
  {
    id: "orgaren",
    company: "PT Orgaren Indonesia Jaya",
    role: "Marketing Staff",
    period: "September 2018 – Desember 2018",
    duration: "4 bulan",
    location: "Jakarta, Indonesia",
    industry: "administration",
    bullets: [
      "Promoted and offered palm sugar products to coffee shops, retail stores, and individual customers",
      "Developed and planned sales strategies",
      "Distributed products to clients",
      "Assisted with sales bookkeeping and administrative tasks in the office",
    ],
  },
  {
    id: "diva-karaoke",
    company: "Diva Karaoke",
    role: "Administration",
    period: "September 2018 – Desember 2018",
    duration: "4 bulan",
    location: "Jakarta, Indonesia",
    industry: "administration",
    bullets: [
      "Handled office bookkeeping and financial record-keeping",
      "Recorded daily income recapitulation",
      "Processed employee salary payments weekly",
      "Monitored cash flow across incoming and outgoing transactions",
    ],
  },
  {
    id: "kci-helpdesk",
    company: "PT Kereta Commuter Indonesia",
    role: "Helpdesk Command Control Room",
    period: "Januari 2019 – Mei 2019",
    duration: "5 bulan",
    location: "Area DKI Jakarta",
    industry: "transportation",
    bullets: [
      "Acted as a bridge between customer reports and relevant teams",
      "Facilitated and forwarded customer reports to the appropriate teams or units",
      "Monitored passenger flow across all Commuter Line stations",
      "Handled customer complaints and inquiries on social media (Twitter)",
    ],
  },
  {
    id: "kci-announcer",
    company: "PT Kereta Commuter Indonesia",
    role: "Announcer",
    period: "Juni 2019 – Juli 2022",
    duration: "3 tahun 2 bulan",
    location: "Area DKI Jakarta",
    industry: "transportation",
    bullets: [
      "Announced arrival, departure, and schedule updates for Commuter Line services",
      "Ensured all passengers received accurate and timely information",
      "Operated the Application Tracking Announcer (ATA) as a reference for train movements",
      "Ensured the ATA system functioned properly as the primary reference for passenger information displays and the C-Access app",
    ],
    images: ["/images/experience/kci-announcer/studio-booth.jpg"],
  },
  {
    id: "kawisata",
    company: "PT Kereta Api Pariwisata (KAWISATA)",
    role: "Customer Service On Train",
    period: "Agustus 2022 – Desember 2024",
    duration: "2 tahun 5 bulan",
    location: "Area DKI Jakarta",
    industry: "transportation",
    bullets: [
      "Delivered high-quality passenger service and supported railway safety on the Commuter Line (KRL)",
      "Conducted routine checks on stop blocks, air conditioning, lights, and extra microphones",
      "Made onboard announcements covering station names, greetings, service policy, and safety reminders",
      "Operated commuter line doors, ensuring safe boarding and alighting at every station",
      "Coordinated actively with the train driver (masinis) to maintain smooth operations",
      "Read and interpreted train schedules and understood railway signals and regulations",
    ],
    milestone:
      "December 2022 — Entrusted as the Onboard Service Officer for President Joko Widodo (7th President of Indonesia) and Minister of Transportation Budi Karya Sumadi during the Manggarai Station inauguration.",
    images: [
      "/images/experience/kawisata/presidential-service.jpg",
      "/images/experience/kawisata/platform-group.jpg",
    ],
  },
  {
    id: "angkasa-pura",
    company: "Angkasa Pura Supports",
    role: "Guest Service Officer",
    period: "Januari 2025 – November 2025",
    duration: "11 bulan",
    location: "Jakarta Raya, Indonesia",
    industry: "hospitality",
    bullets: [
      "Provided warm greetings to residents and guests, offering assistance and sharing information about amenities and policies",
      "Delivered announcements and safety reminders",
      "Assisted residents and guests with inquiries and access",
      "Coordinated with units lacking direct contact",
      "Handled complaints and provided solutions",
      "Played a key role in implementing changes to the property's operating system, improving efficiency",
    ],
    images: [
      "/images/experience/angkasa-pura/reception.jpg",
      "/images/experience/angkasa-pura/lobby-guest.jpg",
    ],
  },
  {
    id: "skor",
    company: "Skor Technologies",
    role: "Customer Service Agent and Support",
    period: "Januari 2026 – Present",
    duration: "7 bulan",
    location: "Jakarta Raya, Indonesia",
    industry: "fintech",
    bullets: [
      "Handle customer complaints related to card issues in a professional and timely manner",
      "Provide accurate, clear, and comprehensive information regarding products and services",
      "Act as an effective liaison between the bank and Skorcard to ensure smooth issue resolution",
      "Maintain a high level of customer satisfaction through excellent service and support",
      "Document and track customer interactions, issues, and resolutions in internal systems",
      "Escalate complex cases to the appropriate teams while ensuring proper follow-up",
      "Comply with company policies, procedures, and service level agreements (SLAs)",
      "Collaborate with internal teams to improve service quality and customer experience",
    ],
    milestone:
      "Within 6 months of joining, built internal tooling for the CS team that eliminated 50% of the manual work needed to handle each customer case.",
    images: [
      "/images/experience/skor/team-lunch.jpg",
      "/images/experience/skor/birthday-celebration.jpg",
      "/images/experience/skor/team-selfie.jpg",
    ],
  },
  {
    id: "duacincin",
    company: "Duacincin.id",
    role: "Founder",
    period: "Juni 2026 – Present",
    duration: "2 bulan",
    location: "Indonesia",
    industry: "venture",
    bullets: [
      "Founded and manage Duacincin.id, a digital wedding invitation service",
      "Assist couples with wedding planning and event preparation",
      "Offer digital photobooth solutions for weddings and special events",
      "Handle customer consultations and support",
      "Manage business operations, project coordination, and client communications",
      "Promote services through social media and digital marketing",
      "Develop new features and services to improve customer experience",
    ],
  },
];

export const education = {
  school: "SMK Negeri 23 Jakarta",
  degree: "Vocational High School, Manajemen Pemasaran",
  period: "2015 – 2017",
};

export const certifications: string[] = [
  "Certificate of Competency in Marketing Skills",
  "Work Motivation Program: Building a Successful Service Team",
  "Basic Service Excellence & Basic Voice Treatment",
  "Team Building: Developing AKHLAK for Frontline Service Excellence",
  "Fundamentals of Service: Using Persuasive Communication in Handling Complaints",
];

export const languages = [
  { name: "Bahasa Indonesia", level: "Professional Working" },
  { name: "English", level: "Limited Working" },
];

export type SkillCategory =
  | "Customer Experience"
  | "Communication"
  | "Fintech Support"
  | "Hospitality"
  | "Digital & AI";

export const skills: { name: string; category: SkillCategory }[] = [
  { name: "Customer Service", category: "Customer Experience" },
  { name: "Complaint Handling", category: "Customer Experience" },
  { name: "CRM", category: "Customer Experience" },
  { name: "Time Management", category: "Customer Experience" },
  { name: "Multitasking", category: "Customer Experience" },
  { name: "Public Communication", category: "Communication" },
  { name: "Persuasive Communication", category: "Communication" },
  { name: "Public Relations", category: "Communication" },
  { name: "Announcing", category: "Communication" },
  { name: "Fintech Customer Support", category: "Fintech Support" },
  { name: "Ticketing Systems", category: "Fintech Support" },
  { name: "Process Improvement", category: "Fintech Support" },
  { name: "SLA Compliance", category: "Fintech Support" },
  { name: "Hospitality Excellence", category: "Hospitality" },
  { name: "Guest Relations", category: "Hospitality" },
  { name: "Public Service", category: "Hospitality" },
  { name: "AI Prompting", category: "Digital & AI" },
  { name: "Start-up Ventures", category: "Digital & AI" },
  { name: "Digital Operations", category: "Digital & AI" },
  { name: "Social Media Administration", category: "Digital & AI" },
  { name: "Microsoft Office", category: "Digital & AI" },
  { name: "Google Workspace", category: "Digital & AI" },
];

export const achievements = [
  {
    title: "Presidential Service Honor",
    description:
      "Entrusted as Onboard Service Officer for the 7th President of Indonesia, Joko Widodo, and Minister of Transportation Budi Karya Sumadi at the Manggarai Station inauguration — December 2022.",
    stat: "1 of 1",
  },
  {
    title: "Cross-Industry Experience",
    description:
      "Built a career spanning retail, transportation, hospitality, and fintech — adapting fast in every environment.",
    stat: "4",
    statLabel: "industries",
  },
  {
    title: "Public Transportation Service",
    description:
      "Nearly 6 years across roles on Jakarta's Commuter Line — helpdesk, announcer, and onboard customer service.",
    stat: "5.7",
    statLabel: "years",
  },
  {
    title: "Sales Performance",
    description:
      "Exceeded monthly sales targets by over 100% and lifted customer satisfaction by 15% at PT MAP Aktif Adiperkasa.",
    stat: "+15%",
    statLabel: "CSAT",
  },
  {
    title: "Process Improvement",
    description:
      "Developed internal CS tooling at Skor Technologies that cut manual case-handling work in half within 6 months.",
    stat: "50%",
    statLabel: "faster",
  },
  {
    title: "Founder Mindset",
    description:
      "Launched and operates Duacincin.id, a digital wedding invitation and photobooth service, alongside a full-time role.",
    stat: "2026",
    statLabel: "founded",
  },
];

export const stats = [
  { value: 9, suffix: "+", label: "Years of Experience" },
  { value: 4, suffix: "", label: "Industries" },
  { value: 10, suffix: "", label: "Roles Held" },
  { value: 1, suffix: "", label: "Presidential Assignment" },
] as const;
