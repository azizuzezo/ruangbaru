package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// Port of app/api/chat/route.ts — same system prompt, same 15s timeout,
// same graceful {"fallback": true} degrade path when GROQ_API_KEY is
// missing or the upstream call fails, so the widget's local knowledge base
// takes over exactly like it does today.
const groqURL = "https://api.groq.com/openai/v1/chat/completions"

const chatSystemPrompt = `Kamu adalah asisten virtual resmi untuk "RuangBaru", sebuah workspace kolaborasi untuk tim dan UMKM Indonesia.

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
- Halaman yang bisa diarahkan ke pengguna: /fitur, /cara-kerja, /harga, /about, /contact, /login, /register.`

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func (a *App) Chat(w http.ResponseWriter, r *http.Request) {
	if a.Cfg.GroqAPIKey == "" {
		writeJSON(w, http.StatusOK, map[string]bool{"fallback": true})
		return
	}

	var body struct {
		Messages []chatMessage `json:"messages"`
	}
	if err := readJSON(r, &body); err != nil {
		writeJSON(w, http.StatusOK, map[string]bool{"fallback": true})
		return
	}

	messages := make([]chatMessage, 0, len(body.Messages))
	for _, m := range body.Messages {
		if m.Role != "user" && m.Role != "assistant" {
			continue
		}
		content := m.Content
		if len(content) > 1000 {
			content = content[:1000]
		}
		messages = append(messages, chatMessage{Role: m.Role, Content: content})
	}
	if len(messages) > 8 {
		messages = messages[len(messages)-8:]
	}
	if len(messages) == 0 {
		writeJSON(w, http.StatusOK, map[string]bool{"fallback": true})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	payload := map[string]any{
		"model":       "llama-3.3-70b-versatile",
		"temperature": 0.4,
		"max_tokens":  600,
		"messages":    append([]chatMessage{{Role: "system", Content: chatSystemPrompt}}, messages...),
	}
	if a.Cfg.GroqModel != "" {
		payload["model"] = a.Cfg.GroqModel
	}
	reqBody, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", groqURL, bytes.NewReader(reqBody))
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]bool{"fallback": true})
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.Cfg.GroqAPIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]bool{"fallback": true})
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		writeJSON(w, http.StatusOK, map[string]bool{"fallback": true})
		return
	}

	var data struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil || len(data.Choices) == 0 {
		writeJSON(w, http.StatusOK, map[string]bool{"fallback": true})
		return
	}
	reply := strings.TrimSpace(data.Choices[0].Message.Content)
	if reply == "" {
		writeJSON(w, http.StatusOK, map[string]bool{"fallback": true})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"reply": reply})
}
