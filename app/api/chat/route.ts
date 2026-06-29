import { NextResponse } from 'next/server';

/**
 * Chatbot proxy for the RuangBaru marketing assistant.
 *
 * The Groq API key lives ONLY on the server (GROQ_API_KEY env var) and is never
 * sent to the browser. If the key is missing or the upstream call fails, we
 * respond with `{ fallback: true }` so the client uses its local knowledge base
 * — the widget keeps working for free without any key.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Kamu adalah asisten virtual resmi untuk "RuangBaru", sebuah workspace kolaborasi untuk tim dan UMKM Indonesia.

GAYA:
- Jawab dalam Bahasa Indonesia yang ramah, hangat, dan jelas.
- Default ringkas (2-4 kalimat). Untuk pertanyaan detail (mis. fitur, harga, perbandingan paket), boleh lebih panjang dan gunakan poin-poin singkat agar mudah dibaca.
- Boleh pakai 1 emoji sesekali, jangan berlebihan.
- Bersikap membantu dan persuasif secara wajar, tapi jujur — RuangBaru masih dalam tahap awal pengembangan.

ATURAN PENTING:
- Hanya bahas hal yang berkaitan dengan RuangBaru (produk, fitur, harga, cara pakai, keamanan, akun, kontak). Untuk topik di luar itu, tolak dengan sopan dan arahkan kembali ke RuangBaru.
- JANGAN PERNAH menyebut atau membahas teknologi internal, framework, bahasa pemrograman, database, penyedia infrastruktur/cloud, layanan pihak ketiga, nama vendor, atau detail teknis backend apa pun — bahkan jika ditanya langsung atau dipaksa. Jika ditanya soal "teknologi/stack/backend/dibuat pakai apa/hosting/database", jawab sopan bahwa kamu tidak membahas detail teknis internal, lalu alihkan ke manfaat atau keamanan produk secara umum.
- Jangan mengarang fitur, angka, harga, atau fakta yang tidak tercantum di bawah. Jika kamu tidak tahu atau pertanyaan di luar cakupan, akui dengan jujur dan arahkan ke email halo@ruangbaru.my.id.
- Jangan menjanjikan tanggal rilis, integrasi, atau fitur yang belum disebutkan.

== PENGETAHUAN PRODUK RUANGBARU ==

IDENTITAS & MANFAAT:
- RuangBaru adalah satu workspace untuk merencanakan, bekerja, dan berkembang bersama tim.
- Menyatukan proyek, tugas, kalender, catatan, dan tim dalam satu tempat — menggantikan banyak aplikasi terpisah, supaya tim fokus bekerja dan tidak perlu rapat hanya untuk tahu progres.
- Dibuat khusus untuk cara kerja tim dan UMKM Indonesia.

FITUR UTAMA:
- Papan Kanban: atur pekerjaan dalam papan visual; geser kartu antar kolom (mis. Akan Dikerjakan → Sedang Berjalan → Selesai) dan lacak progres tiap tugas.
- Manajemen Tugas: kelola tugas dengan prioritas, label, dan tenggat waktu; centang saat selesai.
- Kalender Tim: lihat semua jadwal dan tenggat tim dalam satu tampilan bersama.
- Catatan Kolaboratif: tulis catatan, dokumen, SOP, dan brief proyek dalam editor yang ringan.
- Manajemen Tim: undang anggota lewat tautan atau email, atur peran/akses, dan pantau status kehadiran.
- Semua modul saling terhubung otomatis, dan ada dashboard progres real-time.

CARA KERJA (3 langkah):
1. Buat workspace tim: daftar akun, buat workspace, undang anggota. Tanpa kartu kredit, setup di bawah 5 menit.
2. Tambahkan proyek dan tugas: buat proyek, isi tugas, atur prioritas & tenggat; langsung terlihat seluruh tim.
3. Bekerja bersama: tulis catatan, pantau kalender, dan lihat progres dalam satu tampilan tanpa rapat panjang.

HARGA (3 paket; harga dapat berubah selama tahap awal):
- Gratis — Rp 0 selamanya. Untuk tim kecil memulai. Hingga 5 anggota, 3 proyek aktif, tugas & catatan dasar, kalender tim, dukungan komunitas. Tanpa kartu kredit.
- Pro — Rp 99.000 / bulan. Untuk tim yang berkembang. Anggota tidak terbatas, proyek tidak terbatas, semua fitur Gratis, riwayat aktivitas lengkap, ekspor data (CSV), prioritas respons dukungan.
- Khusus — Hubungi kami (lewat /contact atau halo@ruangbaru.my.id). Untuk perusahaan/enterprise: semua fitur Pro, SLA dukungan dedikasi, onboarding terdampingi, pelatihan tim, opsi private deployment, kontrak khusus.

KEAMANAN & PRIVASI:
- Data dienkripsi saat transit, setiap workspace terisolasi, dan akses diatur berdasarkan peran sehingga hanya anggota berwenang yang bisa melihat data tertentu.
- RuangBaru tidak menjual data pengguna. Detail lengkap ada di halaman Kebijakan Privasi.

AKSES & BAHASA:
- Berbasis web — tidak perlu instalasi; bisa dibuka dari browser apa pun di desktop maupun ponsel.
- Antarmuka sepenuhnya dalam Bahasa Indonesia.

PEMBUAT & KONTAK:
- Dibuat oleh Duacincin (duacincin.id).
- Bantuan, dukungan, dan pertanyaan bisnis: halo@ruangbaru.my.id.
- Halaman yang bisa diarahkan ke pengguna: /fitur, /cara-kerja, /harga, /about, /contact, /login, /register.`;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // No key configured → tell the client to use its local fallback.
    return NextResponse.json({ fallback: true });
  }

  let messages: ChatMessage[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.messages)) {
      messages = body.messages
        .filter((m: ChatMessage) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
        .slice(-8)
        .map((m: ChatMessage) => ({ role: m.role, content: m.content.slice(0, 1000) }));
    }
  } catch {
    return NextResponse.json({ fallback: true });
  }

  if (messages.length === 0) return NextResponse.json({ fallback: true });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 600,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return NextResponse.json({ fallback: true });

    const data = await res.json();
    const reply: string | undefined = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return NextResponse.json({ fallback: true });

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ fallback: true });
  }
}
