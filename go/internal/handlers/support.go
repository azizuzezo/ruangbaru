package handlers

import "net/http"

// Port of app/api/support/ticket/route.ts.
func (a *App) SupportTicket(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Company  string `json:"company"`
		Question string `json:"question"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid body")
		return
	}
	if body.Name == "" || body.Email == "" || body.Question == "" {
		writeError(w, http.StatusBadRequest, "Nama, email, dan pertanyaan wajib diisi.")
		return
	}

	if !a.Mail.Configured() {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"message": "Tiket berhasil disimpan (Resend belum dikonfigurasi).",
			"mocked":  true,
		})
		return
	}

	if err := a.Mail.SendTicketEmail(r.Context(), body.Name, body.Email, body.Company, body.Question); err != nil {
		writeError(w, http.StatusInternalServerError, "Gagal mengirim tiket.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Tiket berhasil dikirim ke halo@ruangbaru.my.id.",
	})
}
