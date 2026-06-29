// =============================================================================
// Guided "Journey" tour — step definitions.
// Each step targets an element via a [data-tour="..."] attribute and teaches:
// what it is, why it exists, when to use it, and a best-practice tip.
// =============================================================================

export type TourStep = {
  id: string;
  /** CSS selector of the element to highlight. Omit for a centered step. */
  target?: string;
  title: string;
  what: string;
  why?: string;
  when?: string;
  tip?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="journey"]',
    title: 'Selamat datang di RuangBaru 👋',
    what: 'Ini ruang kerja tim Anda — tempat proyek, tugas, jadwal, dan catatan berkumpul dalam satu layar.',
    why: 'Supaya Anda tidak perlu berpindah-pindah aplikasi untuk tahu apa yang sedang terjadi.',
    when: 'Buka setiap pagi untuk melihat gambaran hari Anda.',
    tip: 'Tur ini bisa dilewati kapan saja, dan diputar ulang lewat tombol Tur Panduan.',
  },
  {
    id: 'pulse',
    target: '[data-tour="pulse"]',
    title: 'Denyut Workspace',
    what: 'Ringkasan singkat kondisi tim: proyek aktif, tugas terbuka, yang selesai minggu ini, dan jumlah anggota.',
    why: 'Memberi Anda “rasa” keadaan tim dalam sekali pandang, tanpa membaca laporan.',
    when: 'Lihat sekilas saat membuka dashboard untuk menangkap perubahan besar.',
    tip: 'Angka yang melonjak biasanya pertanda butuh perhatian — telusuri lebih lanjut.',
  },
  {
    id: 'focus',
    target: '[data-tour="focus"]',
    title: 'Fokus Hari Ini',
    what: 'Daftar tugas Anda sendiri yang paling mendesak — yang terlewat dan yang jatuh tempo hari ini.',
    why: 'Menjawab pertanyaan terpenting setiap pagi: “Apa yang harus saya kerjakan sekarang?”',
    when: 'Pakai sebagai to-do harian pribadi; centang saat selesai.',
    tip: 'Selesaikan yang berlabel “Terlewat” lebih dulu agar tidak menumpuk.',
  },
  {
    id: 'timeline',
    target: '[data-tour="timeline"]',
    title: 'Linimasa Pekerjaan',
    what: 'Tugas tim yang akan datang, dikelompokkan per waktu: hari ini, besok, dan minggu ini.',
    why: 'Membantu Anda merencanakan ke depan dan menghindari tenggat yang bertabrakan.',
    when: 'Tinjau di awal hari atau saat merencanakan minggu.',
    tip: 'Klik tugas mana pun untuk membuka detail dan menambahkan catatan.',
  },
  {
    id: 'activity',
    target: '[data-tour="activity"]',
    title: 'Aktivitas Tim',
    what: 'Aliran langsung tentang apa yang berubah: tugas dipindahkan, komentar baru, anggota bergabung.',
    why: 'Menjawab “Apa yang berubah hari ini?” tanpa perlu rapat status.',
    when: 'Periksa di siang hari untuk tetap selaras dengan rekan tim.',
    tip: 'Aktivitas terbaru muncul di atas — gulir untuk melihat riwayat sebelumnya.',
  },
  {
    id: 'momentum',
    target: '[data-tour="momentum"]',
    title: 'Momentum Proyek',
    what: 'Proyek aktif beserta progresnya — berapa tugas yang sudah selesai dari total.',
    why: 'Menunjukkan proyek mana yang melaju dan mana yang butuh dorongan.',
    when: 'Gunakan saat sesi mingguan untuk meninjau kemajuan tim.',
    tip: 'Progres yang lama tidak bergerak biasanya tanda ada yang mengganjal.',
  },
  {
    id: 'nav-projects',
    target: '[data-tour="nav-projects"]',
    title: 'Proyek',
    what: 'Tempat semua proyek tim Anda. Setiap proyek menampung tugas, catatan, dan tenggatnya sendiri.',
    why: 'Memisahkan pekerjaan menjadi wadah yang jelas agar tim tahu konteksnya.',
    when: 'Buat proyek baru setiap memulai inisiatif atau klien baru.',
    tip: 'Beri ikon dan warna agar proyek mudah dikenali sekilas.',
  },
  {
    id: 'nav-tasks',
    target: '[data-tour="nav-tasks"]',
    title: 'Tugas & Papan Kanban',
    what: 'Semua tugas dalam tampilan daftar atau papan kanban yang bisa diseret antar kolom.',
    why: 'Membuat status pekerjaan terlihat — dari “Akan Dikerjakan” hingga “Selesai”.',
    when: 'Geser kartu saat status berubah; tetapkan prioritas dan tenggat.',
    tip: 'Seret kartu ke kolom “Selesai” untuk merayakan progres tim. 🎉',
  },
  {
    id: 'nav-calendar',
    target: '[data-tour="nav-calendar"]',
    title: 'Kalender',
    what: 'Semua tenggat dan jadwal tim dalam satu tampilan kalender bersama.',
    why: 'Mencegah bentrok jadwal dan tenggat yang terlewat.',
    when: 'Tinjau di awal minggu untuk melihat beban kerja yang akan datang.',
    tip: 'Padukan dengan Linimasa di dashboard untuk perencanaan harian.',
  },
  {
    id: 'nav-notes',
    target: '[data-tour="nav-notes"]',
    title: 'Catatan',
    what: 'Dokumen kolaboratif untuk notulen rapat, SOP, dan brief proyek.',
    why: 'Menjaga pengetahuan tim tetap di satu tempat, bukan tersebar di chat.',
    when: 'Tulis keputusan penting agar tim punya satu sumber kebenaran.',
    tip: 'Tautkan catatan ke proyek terkait agar mudah ditemukan kembali.',
  },
  {
    id: 'nav-team',
    target: '[data-tour="nav-team"]',
    title: 'Anggota Tim',
    what: 'Kelola siapa saja yang ada di workspace dan atur peran serta aksesnya.',
    why: 'Memastikan orang yang tepat punya akses yang tepat.',
    when: 'Undang anggota baru atau ubah peran saat tim berkembang.',
    tip: 'Gunakan peran “Viewer” untuk klien yang hanya perlu memantau.',
  },
  {
    id: 'nav-settings',
    target: '[data-tour="nav-settings"]',
    title: 'Pengaturan Workspace',
    what: 'Atur nama, logo, dan preferensi ruang kerja Anda.',
    why: 'Membuat workspace terasa milik tim Anda.',
    when: 'Sesuaikan saat pertama kali setup atau saat branding berubah.',
    tip: 'Logo workspace akan tampil di sidebar dan undangan.',
  },
  {
    id: 'search',
    target: '[data-tour="global-search"]',
    title: 'Pencarian & Command Palette',
    what: 'Cari apa pun — proyek, tugas, catatan — atau jalankan perintah cepat.',
    why: 'Cara tercepat berpindah tanpa mengangkat tangan dari keyboard.',
    when: 'Saat Anda tahu apa yang dicari tapi malas mengklik menu.',
    tip: 'Tekan ⌘K (atau Ctrl+K) untuk membukanya dari mana saja.',
  },
  {
    id: 'notifications',
    target: '[data-tour="notifications"]',
    title: 'Notifikasi',
    what: 'Pemberitahuan saat Anda ditugaskan, disebut, atau ada tenggat yang dekat.',
    why: 'Agar tidak ada hal penting yang lewat begitu saja.',
    when: 'Periksa secara berkala; tandai sudah dibaca untuk menjaga fokus.',
    tip: 'Titik biru menandakan notifikasi yang belum dibaca.',
  },
  {
    id: 'finish',
    target: '[data-tour="journey"]',
    title: 'Anda siap bekerja! 🚀',
    what: 'Itu tur singkatnya. Anda selalu bisa memutarnya kembali lewat tombol Tur Panduan ini.',
    why: 'RuangBaru dirancang agar mudah dipelajari sambil jalan.',
    when: 'Putar ulang kapan pun Anda lupa, atau saat anggota baru bergabung.',
    tip: 'Mulai dengan membuat proyek pertama, lalu tambahkan beberapa tugas. Selamat bekerja!',
  },
];
