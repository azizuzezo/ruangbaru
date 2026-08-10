export const tourDict = {
  id: {
    // Shared tour chrome (TourOverlay.tsx)
    tourProgressLabel: 'Langkah {current} dari {total}',
    tourSkipTour: 'Lewati tur',
    tourBackButton: 'Kembali',
    tourNextButton: 'Lanjut',
    tourFinishButton: 'Selesai',
    tourLabelWhy: 'Kenapa',
    tourLabelWhen: 'Kapan',
    tourLabelTip: 'Tips',

    // JourneyButton.tsx
    tourJourneyButtonLabel: 'Tur Panduan',

    // Step: welcome
    tourStepWelcomeTitle: 'Selamat datang di RuangBaru 👋',
    tourStepWelcomeWhat: 'Ini ruang kerja tim Anda — tempat proyek, tugas, jadwal, dan catatan berkumpul dalam satu layar.',
    tourStepWelcomeWhy: 'Supaya Anda tidak perlu berpindah-pindah aplikasi untuk tahu apa yang sedang terjadi.',
    tourStepWelcomeWhen: 'Buka setiap pagi untuk melihat gambaran hari Anda.',
    tourStepWelcomeTip: 'Tur ini bisa dilewati kapan saja, dan diputar ulang lewat tombol Tur Panduan.',

    // Step: pulse
    tourStepPulseTitle: 'Denyut Workspace',
    tourStepPulseWhat: 'Ringkasan singkat kondisi tim: proyek aktif, tugas terbuka, yang selesai minggu ini, dan jumlah anggota.',
    tourStepPulseWhy: 'Memberi Anda “rasa” keadaan tim dalam sekali pandang, tanpa membaca laporan.',
    tourStepPulseWhen: 'Lihat sekilas saat membuka dashboard untuk menangkap perubahan besar.',
    tourStepPulseTip: 'Angka yang melonjak biasanya pertanda butuh perhatian — telusuri lebih lanjut.',

    // Step: focus
    tourStepFocusTitle: 'Fokus Hari Ini',
    tourStepFocusWhat: 'Daftar tugas Anda sendiri yang paling mendesak — yang terlewat dan yang jatuh tempo hari ini.',
    tourStepFocusWhy: 'Menjawab pertanyaan terpenting setiap pagi: “Apa yang harus saya kerjakan sekarang?”',
    tourStepFocusWhen: 'Pakai sebagai to-do harian pribadi; centang saat selesai.',
    tourStepFocusTip: 'Selesaikan yang berlabel “Terlewat” lebih dulu agar tidak menumpuk.',

    // Step: timeline
    tourStepTimelineTitle: 'Linimasa Pekerjaan',
    tourStepTimelineWhat: 'Tugas tim yang akan datang, dikelompokkan per waktu: hari ini, besok, dan minggu ini.',
    tourStepTimelineWhy: 'Membantu Anda merencanakan ke depan dan menghindari tenggat yang bertabrakan.',
    tourStepTimelineWhen: 'Tinjau di awal hari atau saat merencanakan minggu.',
    tourStepTimelineTip: 'Klik tugas mana pun untuk membuka detail dan menambahkan catatan.',

    // Step: activity
    tourStepActivityTitle: 'Aktivitas Tim',
    tourStepActivityWhat: 'Aliran langsung tentang apa yang berubah: tugas dipindahkan, komentar baru, anggota bergabung.',
    tourStepActivityWhy: 'Menjawab “Apa yang berubah hari ini?” tanpa perlu rapat status.',
    tourStepActivityWhen: 'Periksa di siang hari untuk tetap selaras dengan rekan tim.',
    tourStepActivityTip: 'Aktivitas terbaru muncul di atas — gulir untuk melihat riwayat sebelumnya.',

    // Step: momentum
    tourStepMomentumTitle: 'Momentum Proyek',
    tourStepMomentumWhat: 'Proyek aktif beserta progresnya — berapa tugas yang sudah selesai dari total.',
    tourStepMomentumWhy: 'Menunjukkan proyek mana yang melaju dan mana yang butuh dorongan.',
    tourStepMomentumWhen: 'Gunakan saat sesi mingguan untuk meninjau kemajuan tim.',
    tourStepMomentumTip: 'Progres yang lama tidak bergerak biasanya tanda ada yang mengganjal.',

    // Step: nav-projects
    tourStepNavProjectsTitle: 'Proyek',
    tourStepNavProjectsWhat: 'Tempat semua proyek tim Anda. Setiap proyek menampung tugas, catatan, dan tenggatnya sendiri.',
    tourStepNavProjectsWhy: 'Memisahkan pekerjaan menjadi wadah yang jelas agar tim tahu konteksnya.',
    tourStepNavProjectsWhen: 'Buat proyek baru setiap memulai inisiatif atau klien baru.',
    tourStepNavProjectsTip: 'Beri ikon dan warna agar proyek mudah dikenali sekilas.',

    // Step: nav-tasks
    tourStepNavTasksTitle: 'Tugas & Papan Kanban',
    tourStepNavTasksWhat: 'Semua tugas dalam tampilan daftar atau papan kanban yang bisa diseret antar kolom.',
    tourStepNavTasksWhy: 'Membuat status pekerjaan terlihat — dari “Akan Dikerjakan” hingga “Selesai”.',
    tourStepNavTasksWhen: 'Geser kartu saat status berubah; tetapkan prioritas dan tenggat.',
    tourStepNavTasksTip: 'Seret kartu ke kolom “Selesai” untuk merayakan progres tim. 🎉',

    // Step: nav-calendar
    tourStepNavCalendarTitle: 'Kalender',
    tourStepNavCalendarWhat: 'Semua tenggat dan jadwal tim dalam satu tampilan kalender bersama.',
    tourStepNavCalendarWhy: 'Mencegah bentrok jadwal dan tenggat yang terlewat.',
    tourStepNavCalendarWhen: 'Tinjau di awal minggu untuk melihat beban kerja yang akan datang.',
    tourStepNavCalendarTip: 'Padukan dengan Linimasa di dashboard untuk perencanaan harian.',

    // Step: nav-notes
    tourStepNavNotesTitle: 'Catatan',
    tourStepNavNotesWhat: 'Dokumen kolaboratif untuk notulen rapat, SOP, dan brief proyek.',
    tourStepNavNotesWhy: 'Menjaga pengetahuan tim tetap di satu tempat, bukan tersebar di chat.',
    tourStepNavNotesWhen: 'Tulis keputusan penting agar tim punya satu sumber kebenaran.',
    tourStepNavNotesTip: 'Tautkan catatan ke proyek terkait agar mudah ditemukan kembali.',

    // Step: nav-team
    tourStepNavTeamTitle: 'Anggota Tim',
    tourStepNavTeamWhat: 'Kelola siapa saja yang ada di workspace dan atur peran serta aksesnya.',
    tourStepNavTeamWhy: 'Memastikan orang yang tepat punya akses yang tepat.',
    tourStepNavTeamWhen: 'Undang anggota baru atau ubah peran saat tim berkembang.',
    tourStepNavTeamTip: 'Gunakan peran “Viewer” untuk klien yang hanya perlu memantau.',

    // Step: nav-settings
    tourStepNavSettingsTitle: 'Pengaturan Workspace',
    tourStepNavSettingsWhat: 'Atur nama, logo, dan preferensi ruang kerja Anda.',
    tourStepNavSettingsWhy: 'Membuat workspace terasa milik tim Anda.',
    tourStepNavSettingsWhen: 'Sesuaikan saat pertama kali setup atau saat branding berubah.',
    tourStepNavSettingsTip: 'Logo workspace akan tampil di sidebar dan undangan.',

    // Step: search
    tourStepSearchTitle: 'Pencarian & Command Palette',
    tourStepSearchWhat: 'Cari apa pun — proyek, tugas, catatan — atau jalankan perintah cepat.',
    tourStepSearchWhy: 'Cara tercepat berpindah tanpa mengangkat tangan dari keyboard.',
    tourStepSearchWhen: 'Saat Anda tahu apa yang dicari tapi malas mengklik menu.',
    tourStepSearchTip: 'Tekan ⌘K (atau Ctrl+K) untuk membukanya dari mana saja.',

    // Step: notifications
    tourStepNotificationsTitle: 'Notifikasi',
    tourStepNotificationsWhat: 'Pemberitahuan saat Anda ditugaskan, disebut, atau ada tenggat yang dekat.',
    tourStepNotificationsWhy: 'Agar tidak ada hal penting yang lewat begitu saja.',
    tourStepNotificationsWhen: 'Periksa secara berkala; tandai sudah dibaca untuk menjaga fokus.',
    tourStepNotificationsTip: 'Titik biru menandakan notifikasi yang belum dibaca.',

    // Step: finish
    tourStepFinishTitle: 'Anda siap bekerja! 🚀',
    tourStepFinishWhat: 'Itu tur singkatnya. Anda selalu bisa memutarnya kembali lewat tombol Tur Panduan ini.',
    tourStepFinishWhy: 'RuangBaru dirancang agar mudah dipelajari sambil jalan.',
    tourStepFinishWhen: 'Putar ulang kapan pun Anda lupa, atau saat anggota baru bergabung.',
    tourStepFinishTip: 'Mulai dengan membuat proyek pertama, lalu tambahkan beberapa tugas. Selamat bekerja!',
  },
  en: {
    // Shared tour chrome (TourOverlay.tsx)
    tourProgressLabel: 'Step {current} of {total}',
    tourSkipTour: 'Skip tour',
    tourBackButton: 'Back',
    tourNextButton: 'Next',
    tourFinishButton: 'Done',
    tourLabelWhy: 'Why',
    tourLabelWhen: 'When',
    tourLabelTip: 'Tip',

    // JourneyButton.tsx
    tourJourneyButtonLabel: 'Guided Tour',

    // Step: welcome
    tourStepWelcomeTitle: 'Welcome to RuangBaru 👋',
    tourStepWelcomeWhat: 'This is your team workspace — where projects, tasks, schedules, and notes come together in one screen.',
    tourStepWelcomeWhy: "So you never have to jump between apps to know what's going on.",
    tourStepWelcomeWhen: 'Open it every morning to get a picture of your day.',
    tourStepWelcomeTip: 'You can skip this tour anytime, and replay it via the Guided Tour button.',

    // Step: pulse
    tourStepPulseTitle: 'Workspace Pulse',
    tourStepPulseWhat: "A quick snapshot of your team's state: active projects, open tasks, tasks completed this week, and member count.",
    tourStepPulseWhy: 'Gives you a feel for how the team is doing at a glance, without reading a report.',
    tourStepPulseWhen: 'Check it whenever you open the dashboard to catch big changes.',
    tourStepPulseTip: 'A number that spikes is usually a sign something needs attention — dig deeper.',

    // Step: focus
    tourStepFocusTitle: "Today's Focus",
    tourStepFocusWhat: 'A list of your own most urgent tasks — the overdue ones and the ones due today.',
    tourStepFocusWhy: 'Answers the most important question every morning: "What should I work on now?"',
    tourStepFocusWhen: "Use it as your personal daily to-do list; check items off as you finish them.",
    tourStepFocusTip: 'Clear the ones labeled "Overdue" first so they don\'t pile up.',

    // Step: timeline
    tourStepTimelineTitle: 'Work Timeline',
    tourStepTimelineWhat: "Your team's upcoming tasks, grouped by time: today, tomorrow, and this week.",
    tourStepTimelineWhy: 'Helps you plan ahead and avoid clashing deadlines.',
    tourStepTimelineWhen: 'Review it at the start of the day or when planning your week.',
    tourStepTimelineTip: 'Click any task to open its details and add notes.',

    // Step: activity
    tourStepActivityTitle: 'Team Activity',
    tourStepActivityWhat: 'A live feed of what changed: tasks moved, new comments, members joining.',
    tourStepActivityWhy: 'Answers "What changed today?" without needing a status meeting.',
    tourStepActivityWhen: 'Check it during the day to stay in sync with your teammates.',
    tourStepActivityTip: 'The latest activity appears at the top — scroll down to see earlier history.',

    // Step: momentum
    tourStepMomentumTitle: 'Project Momentum',
    tourStepMomentumWhat: 'Active projects and their progress — how many tasks are done out of the total.',
    tourStepMomentumWhy: 'Shows which projects are moving forward and which need a push.',
    tourStepMomentumWhen: 'Use it during your weekly session to review team progress.',
    tourStepMomentumTip: "Progress that hasn't moved in a while is usually a sign something's stuck.",

    // Step: nav-projects
    tourStepNavProjectsTitle: 'Projects',
    tourStepNavProjectsWhat: "Where all your team's projects live. Each project holds its own tasks, notes, and deadlines.",
    tourStepNavProjectsWhy: 'Separates work into clear containers so the team always knows the context.',
    tourStepNavProjectsWhen: 'Create a new project whenever you start a new initiative or client.',
    tourStepNavProjectsTip: 'Give it an icon and color so projects are easy to recognize at a glance.',

    // Step: nav-tasks
    tourStepNavTasksTitle: 'Tasks & Kanban Board',
    tourStepNavTasksWhat: 'All tasks in a list view or a kanban board you can drag between columns.',
    tourStepNavTasksWhy: 'Makes the status of work visible — from "To Do" all the way to "Done".',
    tourStepNavTasksWhen: "Drag a card when its status changes; set priorities and deadlines.",
    tourStepNavTasksTip: 'Drag a card to the "Done" column to celebrate the team\'s progress. 🎉',

    // Step: nav-calendar
    tourStepNavCalendarTitle: 'Calendar',
    tourStepNavCalendarWhat: "All your team's deadlines and schedules in one shared calendar view.",
    tourStepNavCalendarWhy: 'Prevents scheduling conflicts and missed deadlines.',
    tourStepNavCalendarWhen: 'Review it at the start of the week to see the upcoming workload.',
    tourStepNavCalendarTip: 'Pair it with the dashboard Timeline for daily planning.',

    // Step: nav-notes
    tourStepNavNotesTitle: 'Notes',
    tourStepNavNotesWhat: 'Collaborative documents for meeting minutes, SOPs, and project briefs.',
    tourStepNavNotesWhy: "Keeps the team's knowledge in one place instead of scattered across chats.",
    tourStepNavNotesWhen: 'Write down important decisions so the team has a single source of truth.',
    tourStepNavNotesTip: "Link a note to its related project so it's easy to find again.",

    // Step: nav-team
    tourStepNavTeamTitle: 'Team Members',
    tourStepNavTeamWhat: "Manage who's in the workspace and set their roles and access.",
    tourStepNavTeamWhy: 'Makes sure the right people have the right access.',
    tourStepNavTeamWhen: 'Invite new members or change roles as your team grows.',
    tourStepNavTeamTip: 'Use the "Viewer" role for clients who only need to keep an eye on things.',

    // Step: nav-settings
    tourStepNavSettingsTitle: 'Workspace Settings',
    tourStepNavSettingsWhat: "Set your workspace's name, logo, and preferences.",
    tourStepNavSettingsWhy: 'Makes the workspace feel like it belongs to your team.',
    tourStepNavSettingsWhen: 'Adjust it during initial setup or whenever your branding changes.',
    tourStepNavSettingsTip: 'The workspace logo appears in the sidebar and on invitations.',

    // Step: search
    tourStepSearchTitle: 'Search & Command Palette',
    tourStepSearchWhat: 'Search for anything — projects, tasks, notes — or run a quick command.',
    tourStepSearchWhy: 'The fastest way to get around without lifting your hands off the keyboard.',
    tourStepSearchWhen: "When you know what you're looking for but don't feel like clicking through menus.",
    tourStepSearchTip: 'Press ⌘K (or Ctrl+K) to open it from anywhere.',

    // Step: notifications
    tourStepNotificationsTitle: 'Notifications',
    tourStepNotificationsWhat: "Alerts when you're assigned, mentioned, or a deadline is coming up.",
    tourStepNotificationsWhy: 'So nothing important slips by unnoticed.',
    tourStepNotificationsWhen: 'Check it periodically; mark items as read to stay focused.',
    tourStepNotificationsTip: 'A blue dot means there are unread notifications.',

    // Step: finish
    tourStepFinishTitle: "You're all set! 🚀",
    tourStepFinishWhat: "That's the short tour. You can always replay it using this Guided Tour button.",
    tourStepFinishWhy: 'RuangBaru is designed to be easy to learn as you go.',
    tourStepFinishWhen: 'Replay it whenever you forget something, or when a new member joins.',
    tourStepFinishTip: 'Start by creating your first project, then add a few tasks. Happy working!',
  },
};
